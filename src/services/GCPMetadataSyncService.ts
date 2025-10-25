import { supabase } from '@/integrations/supabase/client';
import { shouldBypassAuth, getCurrentUserId, isGuestUser } from '@/lib/devMode';

export interface GCPFile {
  name: string;
  size: number;
  updated: string;
  contentType?: string;
}

export interface SyncResult {
  success: number;
  failed: number;
  errors: string[];
}

export class GCPMetadataSyncService {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY || '';
  }

  /**
   * Get all PDF files from GCS bucket
   */
  async getGCPFiles(): Promise<GCPFile[]> {
    if (!this.apiKey) {
      throw new Error('Google Cloud API key not configured');
    }

    const bucketName = import.meta.env.VITE_GCS_BUCKET_NAME || 'lex-legal-documents-bucket';
    const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o?prefix=documents/&key=${this.apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`GCS API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return (data.items || [])
        .filter((item: any) => {
          // Only sync PDF files, ignore placeholder TXT files
          const fileName = item.name.toLowerCase();
          return fileName.endsWith('.pdf');
        })
        .map((item: any) => ({
          name: item.name,
          size: parseInt(item.size) || 0,
          updated: item.updated || item.timeCreated,
          contentType: item.contentType || 'application/pdf'
        }));
    } catch (error) {
      console.error('Error fetching GCP files:', error);
      throw error;
    }
  }

  /**
   * Check if a document already exists in Supabase
   */
  async documentExists(fileName: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('id')
      .eq('file_name', fileName)
      .maybeSingle();

    if (error) {
      console.warn(`Error checking document existence for ${fileName}:`, error);
      return false;
    }

    return !!data;
  }

  /**
   * Download file content from GCS for text extraction
   */
  async downloadFileContent(fileName: string): Promise<ArrayBuffer> {
    const bucketName = import.meta.env.VITE_GCS_BUCKET_NAME || 'lex-legal-documents-bucket';
    const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media&key=${this.apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error(`Error downloading file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Extract text from PDF using PDFTextExtractor
   */
  async extractTextFromPDF(fileContent: ArrayBuffer): Promise<string> {
    try {
      const PDFTextExtractor = (await import('./PDFTextExtractor')).default;
      const extractor = new PDFTextExtractor();
      
      // Convert ArrayBuffer to File-like object
      const blob = new Blob([fileContent], { type: 'application/pdf' });
      const file = new File([blob], 'temp.pdf', { type: 'application/pdf' });
      
      const result = await extractor.extractTextFromPDF(file);
      return result.text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw error;
    }
  }

  /**
   * Generate AI summary using Gemini
   */
  async generateSummary(text: string): Promise<string> {
    try {
      const { GeminiService } = await import('./GeminiService');
      const geminiService = new GeminiService();
      return await geminiService.generateSummary(text);
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Summary generation failed';
    }
  }

  /**
   * Create Supabase record for a GCP file
   */
  async createSupabaseRecord(gcpFile: GCPFile, extractedText: string, summary: string): Promise<void> {
    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    let userId = user?.id;
    if (authError || !user) {
      // Check if we're in guest mode or development mode
      if (shouldBypassAuth()) {
        userId = getCurrentUserId();
        console.log(`Using ${isGuestUser() ? 'guest' : 'development'} user ID for sync:`, userId);
      } else {
        console.warn('User not authenticated during sync, using system user:', authError?.message);
        // Use a system user ID for unauthenticated sync
        userId = '00000000-0000-0000-0000-000000000000';
      }
    }

    // Extract title from filename (remove .pdf extension and clean up)
    const title = gcpFile.name
      .replace(/\.pdf$/i, '')
      .replace(/^documents\//, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    const { error } = await supabase
      .from('legal_documents')
      .insert({
        user_id: userId,
        title: title,
        file_name: gcpFile.name.split('/').pop() || gcpFile.name, // Just the filename, not the full path
        file_path: gcpFile.name, // Full path including documents/ prefix
        file_type: 'application/pdf',
        status: 'indexed',
        extracted_text: extractedText,
        summary: summary,
        metadata: {
          gcp_synced: true,
          gcp_size: gcpFile.size,
          gcp_updated: gcpFile.updated,
          sync_date: new Date().toISOString()
        }
      });

    if (error) {
      console.error(`Error creating Supabase record for ${gcpFile.name}:`, error);
      throw error;
    }
  }

  /**
   * Sync all GCP files to Supabase metadata
   */
  async syncGCPToSupabase(): Promise<SyncResult> {
    console.log('Starting GCP to Supabase metadata sync...');
    
    const result: SyncResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    try {
      // Get all PDF files from GCP
      const gcpFiles = await this.getGCPFiles();
      console.log(`Found ${gcpFiles.length} PDF files in GCP`);

      if (gcpFiles.length === 0) {
        console.log('No PDF files found in GCP');
        return result;
      }

      // Process each file
      for (const gcpFile of gcpFiles) {
        try {
          console.log(`Processing ${gcpFile.name}...`);

          // Check if document already exists
          const exists = await this.documentExists(gcpFile.name.split('/').pop() || gcpFile.name);
          if (exists) {
            console.log(`Document ${gcpFile.name} already exists, skipping`);
            continue;
          }

          // Download file content
          const fileContent = await this.downloadFileContent(gcpFile.name);
          
          // Extract text
          const extractedText = await this.extractTextFromPDF(fileContent);
          
          // Generate AI summary
          const summary = await this.generateSummary(extractedText);
          
          // Create Supabase record
          await this.createSupabaseRecord(gcpFile, extractedText, summary);
          
          result.success++;
          console.log(`Successfully synced ${gcpFile.name}`);

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Failed to sync ${gcpFile.name}:`, error);
          result.failed++;
          result.errors.push(`${gcpFile.name}: ${error.message}`);
        }
      }

      console.log(`Sync complete: ${result.success} successful, ${result.failed} failed`);
      return result;

    } catch (error) {
      console.error('Sync failed:', error);
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    gcpFiles: number;
    supabaseRecords: number;
    syncIssues: number;
  }> {
    try {
      const gcpFiles = await this.getGCPFiles();
      
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const { data: supabaseDocs, error } = await supabase
        .from('legal_documents')
        .select('id')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching Supabase records:', error);
        return {
          gcpFiles: gcpFiles.length,
          supabaseRecords: 0,
          syncIssues: gcpFiles.length
        };
      }

      const syncIssues = Math.max(0, gcpFiles.length - (supabaseDocs?.length || 0));

      return {
        gcpFiles: gcpFiles.length,
        supabaseRecords: supabaseDocs?.length || 0,
        syncIssues
      };

    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        gcpFiles: 0,
        supabaseRecords: 0,
        syncIssues: 0
      };
    }
  }
}

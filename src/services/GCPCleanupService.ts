import { supabase } from '@/integrations/supabase/client';

export interface GCPFile {
  name: string;
  size: number;
  updated: string;
  contentType?: string;
}

export class GCPCleanupService {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY || '';
  }

  /**
   * Get all files from GCS bucket (both PDF and TXT)
   */
  async getAllGCPFiles(): Promise<GCPFile[]> {
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
      
      return (data.items || []).map((item: any) => ({
        name: item.name,
        size: parseInt(item.size) || 0,
        updated: item.updated || item.timeCreated,
        contentType: item.contentType || 'application/octet-stream'
      }));
    } catch (error) {
      console.error('Error fetching GCP files:', error);
      throw error;
    }
  }

  /**
   * Get file analysis
   */
  async analyzeFiles(): Promise<{
    totalFiles: number;
    pdfFiles: number;
    txtFiles: number;
    placeholderFiles: number;
    realFiles: number;
  }> {
    const allFiles = await this.getAllGCPFiles();
    
    const pdfFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    const txtFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.txt'));
    
    // Check if TXT files are placeholders by downloading a sample
    let placeholderFiles = 0;
    let realFiles = 0;
    
    for (const txtFile of txtFiles.slice(0, 3)) { // Check first 3 TXT files
      try {
        const content = await this.downloadFileContent(txtFile.name);
        const text = new TextDecoder().decode(content);
        
        if (text.includes('COURT DOCUMENT PLACEHOLDER')) {
          placeholderFiles++;
        } else {
          realFiles++;
        }
      } catch (error) {
        console.warn(`Could not analyze ${txtFile.name}:`, error);
      }
    }
    
    // Estimate based on sample
    const estimatedPlaceholders = txtFiles.length * (placeholderFiles / Math.min(txtFiles.length, 3));
    const estimatedReal = txtFiles.length - estimatedPlaceholders;
    
    return {
      totalFiles: allFiles.length,
      pdfFiles: pdfFiles.length,
      txtFiles: txtFiles.length,
      placeholderFiles: Math.round(estimatedPlaceholders),
      realFiles: Math.round(estimatedReal)
    };
  }

  /**
   * Download file content from GCS
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
   * Delete placeholder TXT files from GCS
   */
  async deletePlaceholderFiles(): Promise<{
    deleted: number;
    errors: string[];
  }> {
    const result = { deleted: 0, errors: [] as string[] };
    
    try {
      const allFiles = await this.getAllGCPFiles();
      const txtFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.txt'));
      
      console.log(`Found ${txtFiles.length} TXT files to check`);
      
      for (const txtFile of txtFiles) {
        try {
          const content = await this.downloadFileContent(txtFile.name);
          const text = new TextDecoder().decode(content);
          
          if (text.includes('COURT DOCUMENT PLACEHOLDER')) {
            // Delete the placeholder file
            await this.deleteGCSFile(txtFile.name);
            result.deleted++;
            console.log(`Deleted placeholder: ${txtFile.name}`);
          }
        } catch (error) {
          console.warn(`Could not process ${txtFile.name}:`, error);
          result.errors.push(`${txtFile.name}: ${error.message}`);
        }
      }
      
      console.log(`Deleted ${result.deleted} placeholder files`);
      return result;
      
    } catch (error) {
      console.error('Error deleting placeholder files:', error);
      result.errors.push(`General error: ${error.message}`);
      return result;
    }
  }

  /**
   * Delete a file from GCS
   */
  async deleteGCSFile(fileName: string): Promise<void> {
    const bucketName = import.meta.env.VITE_GCS_BUCKET_NAME || 'lex-legal-documents-bucket';
    const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}?key=${this.apiKey}`;

    try {
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error deleting file ${fileName}:`, error);
      throw error;
    }
  }
}

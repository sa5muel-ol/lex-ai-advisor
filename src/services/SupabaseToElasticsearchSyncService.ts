import { supabase } from '../integrations/supabase/client';
import { BrowserElasticsearchService } from './BrowserElasticsearchService';
import { GeminiService } from './GeminiService';

export interface SyncResult {
  success: number;
  failed: number;
  errors: string[];
}

export class SupabaseToElasticsearchSyncService {
  private elasticsearchService: BrowserElasticsearchService;
  private geminiService: GeminiService;

  constructor() {
    this.elasticsearchService = new BrowserElasticsearchService();
    this.geminiService = new GeminiService();
  }

  /**
   * Sync all Supabase documents to Elasticsearch
   */
  async syncSupabaseToElasticsearch(): Promise<SyncResult> {
    console.log('Starting Supabase to Elasticsearch sync...');
    
    const result: SyncResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    try {
      // Initialize Elasticsearch
      await this.elasticsearchService.initializeIndex();

      // Get all documents from Supabase
      const { data: documents, error } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('status', 'indexed'); // Only sync indexed documents

      if (error) {
        throw new Error(`Failed to fetch documents from Supabase: ${error.message}`);
      }

      if (!documents || documents.length === 0) {
        console.log('No documents found in Supabase to sync');
        return result;
      }

      console.log(`Found ${documents.length} documents to sync to Elasticsearch`);

      // Process each document
      for (const doc of documents) {
        try {
          console.log(`Syncing document: ${doc.title} (${doc.file_name})`);

          // Check if document already exists in Elasticsearch
          const exists = await this.documentExistsInElasticsearch(doc.id);
          if (exists) {
            console.log(`Document ${doc.title} already exists in Elasticsearch, skipping`);
            continue;
          }

          // Create Elasticsearch document
          const elasticsearchDoc = {
            id: doc.id,
            user_id: doc.user_id,
            title: doc.title,
            content: doc.extracted_text || '',
            summary: doc.summary || '',
            file_type: doc.file_type,
            file_name: doc.file_name,
            status: doc.status,
            created_at: doc.created_at || new Date().toISOString(),
            updated_at: doc.updated_at || new Date().toISOString(),
            metadata: doc.metadata || {},
            chunks: [], // We'll generate these if needed
            legal_entities: [],
            case_citations: [],
            legal_concepts: []
          };

          // Index in Elasticsearch
          await this.elasticsearchService.indexDocument(elasticsearchDoc);
          
          result.success++;
          console.log(`Successfully synced ${doc.title} to Elasticsearch`);

          // Add a small delay to avoid overwhelming Elasticsearch
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Failed to sync document ${doc.title}:`, error);
          result.failed++;
          result.errors.push(`${doc.title}: ${error.message}`);
        }
      }

      console.log(`Sync complete: ${result.success} successful, ${result.failed} failed`);
      return result;

    } catch (error) {
      console.error('Sync failed:', error);
      result.failed++;
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Check if a document exists in Elasticsearch
   */
  private async documentExistsInElasticsearch(documentId: string): Promise<boolean> {
    try {
      const response = await this.elasticsearchService.makeRequest(`/legal_documents/_doc/${documentId}`, 'HEAD');
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{ totalSupabase: number; totalElasticsearch: number; syncIssues: number }> {
    try {
      // Get count from Supabase
      const { count: supabaseCount, error: supabaseError } = await supabase
        .from('legal_documents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'indexed');

      if (supabaseError) {
        console.error('Error getting Supabase count:', supabaseError);
      }

      // Get count from Elasticsearch
      let elasticsearchCount = 0;
      try {
        const response = await this.elasticsearchService.makeRequest('/legal_documents/_count', 'GET');
        elasticsearchCount = response.count || 0;
      } catch (error) {
        console.error('Error getting Elasticsearch count:', error);
      }

      const totalSupabase = supabaseCount || 0;
      const syncIssues = Math.max(0, totalSupabase - elasticsearchCount);

      return {
        totalSupabase,
        totalElasticsearch: elasticsearchCount,
        syncIssues
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        totalSupabase: 0,
        totalElasticsearch: 0,
        syncIssues: 0
      };
    }
  }
}

import { supabase } from '@/integrations/supabase/client';
import { BrowserElasticsearchService } from './BrowserElasticsearchService';

export interface SupabaseDocument {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  extracted_text: string | null;
  summary: string | null;
  status: string;
  created_at: string;
  user_id: string;
}

export interface SupabaseChunk {
  id: string;
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  embedding: number[];
  metadata: any;
}

export class DocumentSyncService {
  private elasticsearchService: BrowserElasticsearchService;

  constructor() {
    this.elasticsearchService = new BrowserElasticsearchService();
  }

  /**
   * Sync all documents from Supabase to Elasticsearch
   */
  async syncAllDocuments(): Promise<{ success: number; failed: number }> {
    try {
      console.log('Starting document sync from Supabase to Elasticsearch...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch all documents for the current user
      const { data: documents, error: docsError } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'indexed'); // Only sync indexed documents

      if (docsError) throw docsError;

      console.log(`Found ${documents?.length || 0} documents to sync`);

      let successCount = 0;
      let failedCount = 0;

      // Sync each document
      for (const doc of documents || []) {
        try {
          await this.syncDocumentToElasticsearch(doc);
          successCount++;
        } catch (error) {
          console.error(`Failed to sync document ${doc.id}:`, error);
          failedCount++;
        }
      }

      console.log(`Sync complete: ${successCount} successful, ${failedCount} failed`);
      return { success: successCount, failed: failedCount };

    } catch (error) {
      console.error('Document sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync a single document from Supabase to Elasticsearch
   */
  async syncDocumentToElasticsearch(document: SupabaseDocument): Promise<void> {
    try {
      // Prepare document data for Elasticsearch
      const elasticsearchDoc = {
        id: document.id,
        title: document.title,
        filename: document.file_name,
        content: document.extracted_text || '',
        summary: document.summary || '',
        file_type: document.file_type,
        status: document.status,
        created_at: document.created_at,
        user_id: document.user_id,
        source: 'supabase'
      };

      // Index the document in Elasticsearch
      await this.elasticsearchService.indexDocument(elasticsearchDoc);

      // Also sync document chunks if they exist
      await this.syncDocumentChunks(document.id);

      console.log(`Synced document: ${document.title}`);

    } catch (error) {
      console.error(`Failed to sync document ${document.id}:`, error);
      throw error;
    }
  }

  /**
   * Sync document chunks from Supabase to Elasticsearch
   */
  async syncDocumentChunks(documentId: string): Promise<void> {
    try {
      const { data: chunks, error } = await supabase
        .from('document_chunks')
        .select('*')
        .eq('document_id', documentId);

      if (error) throw error;

      // Index each chunk as a separate document for better search granularity
      for (const chunk of chunks || []) {
        const chunkDoc = {
          id: `chunk_${chunk.id}`,
          document_id: documentId,
          title: `Chunk ${chunk.chunk_index + 1}`,
          content: chunk.chunk_text,
          chunk_index: chunk.chunk_index,
          metadata: chunk.metadata,
          source: 'supabase_chunk'
        };

        await this.elasticsearchService.indexDocument(chunkDoc);
      }

    } catch (error) {
      console.error(`Failed to sync chunks for document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Get document count from Supabase
   */
  async getSupabaseDocumentCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('legal_documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'indexed');

      if (error) throw error;
      return count || 0;

    } catch (error) {
      console.error('Failed to get document count:', error);
      return 0;
    }
  }

  /**
   * Get Elasticsearch document count
   */
  async getElasticsearchDocumentCount(): Promise<number> {
    try {
      const response = await fetch('http://localhost:9200/legal_documents/_count');
      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error('Failed to get Elasticsearch document count:', error);
      return 0;
    }
  }

  /**
   * Check if sync is needed
   */
  async isSyncNeeded(): Promise<boolean> {
    try {
      const supabaseCount = await this.getSupabaseDocumentCount();
      const elasticsearchCount = await this.getElasticsearchDocumentCount();
      
      console.log(`Supabase documents: ${supabaseCount}, Elasticsearch documents: ${elasticsearchCount}`);
      return supabaseCount > elasticsearchCount;
    } catch (error) {
      console.error('Failed to check sync status:', error);
      return false;
    }
  }
}

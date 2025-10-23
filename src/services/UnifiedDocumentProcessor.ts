/**
 * Unified Document Processing Service
 * Ensures all documents (manual uploads and ingested) go through identical processing
 */

import { supabase } from "@/integrations/supabase/client";
import { GoogleCloudStorageService } from "./GoogleCloudStorageService";
import { GeminiService } from "./GeminiService";
import { PDFTextExtractor } from "./PDFTextExtractor";
import { BrowserElasticsearchService } from "./BrowserElasticsearchService";

export interface DocumentProcessingResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

export interface DocumentMetadata {
  title: string;
  file_name: string;
  file_path: string;
  file_type: string;
  extracted_text: string;
  summary?: string;
  legal_entities?: any[];
  case_citations?: any[];
  legal_concepts?: string[];
  metadata?: any;
}

export class UnifiedDocumentProcessor {
  private gcsService: GoogleCloudStorageService;
  private geminiService: GeminiService;
  private pdfExtractor: PDFTextExtractor;
  private elasticsearchService: BrowserElasticsearchService;

  constructor() {
    this.gcsService = new GoogleCloudStorageService();
    this.geminiService = new GeminiService();
    this.pdfExtractor = new PDFTextExtractor();
    this.elasticsearchService = new BrowserElasticsearchService();
  }

  /**
   * Process any document through the complete pipeline
   * This ensures consistency between manual uploads and ingested documents
   */
  async processDocument(
    file: File, 
    userId: string, 
    metadata: Partial<DocumentMetadata> = {}
  ): Promise<DocumentProcessingResult> {
    try {
      console.log(`Processing document: ${file.name}`);

      // Step 1: Extract text from PDF
      const extractedText = await this.extractText(file);
      console.log(`Extracted ${extractedText.length} characters`);

      // Step 2: Generate AI summary and analysis
      const aiAnalysis = await this.generateAIAnalysis(extractedText);
      console.log(`Generated AI analysis`);

      // Step 3: Upload physical file to GCS (single source of truth)
      const fileName = `${Date.now()}-${file.name}`;
      const uploadResult = await this.gcsService.uploadFile(file, fileName);
      
      if (!uploadResult.success) {
        throw new Error(`GCS upload failed: ${uploadResult.error}`);
      }
      console.log(`Uploaded to GCS: ${uploadResult.filename}`);

      // Step 4: Store metadata in Supabase (no physical file duplication)
      const documentMetadata: DocumentMetadata = {
        title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
        file_name: file.name,
        file_path: uploadResult.filename!, // GCS path
        file_type: file.type,
        extracted_text: extractedText,
        summary: aiAnalysis.summary,
        legal_entities: aiAnalysis.legal_entities,
        case_citations: aiAnalysis.case_citations,
        legal_concepts: aiAnalysis.legal_concepts,
        metadata: {
          ...metadata.metadata,
          processed_at: new Date().toISOString(),
          ai_confidence: aiAnalysis.confidence,
          source: metadata.metadata?.source || 'manual_upload'
        }
      };

      const { data: document, error: dbError } = await supabase
        .from('legal_documents')
        .insert({
          user_id: userId,
          ...documentMetadata,
          status: 'processing'
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }
      console.log(`Stored metadata in Supabase: ${document.id}`);

      // Step 5: Index in Elasticsearch for search
      await this.indexInElasticsearch(document);
      console.log(`Indexed in Elasticsearch`);

      // Step 6: Update status to indexed
      await supabase
        .from('legal_documents')
        .update({ status: 'indexed' })
        .eq('id', document.id);

      console.log(`Document processing complete: ${document.id}`);
      
      return {
        success: true,
        documentId: document.id
      };

    } catch (error: any) {
      console.error('Document processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract text from various file types
   */
  private async extractText(file: File): Promise<string> {
    if (file.type === 'application/pdf') {
      return await this.pdfExtractor.extractText(file);
    } else if (file.type === 'text/plain') {
      return await file.text();
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }
  }

  /**
   * Generate AI analysis using Gemini
   */
  private async generateAIAnalysis(text: string): Promise<{
    summary: string;
    legal_entities: any[];
    case_citations: any[];
    legal_concepts: string[];
    confidence: number;
  }> {
    try {
      const analysis = await this.geminiService.analyzeDocument(text);
      return {
        summary: analysis.summary,
        legal_entities: analysis.legal_entities || [],
        case_citations: analysis.case_citations || [],
        legal_concepts: analysis.legal_concepts || [],
        confidence: analysis.confidence || 0.8
      };
    } catch (error) {
      console.warn('AI analysis failed, using fallback:', error);
      return {
        summary: text.slice(0, 200) + '...',
        legal_entities: [],
        case_citations: [],
        legal_concepts: [],
        confidence: 0.5
      };
    }
  }

  /**
   * Index document in Elasticsearch
   */
  private async indexInElasticsearch(document: any): Promise<void> {
    try {
      await this.elasticsearchService.initializeIndex();
      
      const esDocument = {
        id: document.id,
        user_id: document.user_id,
        title: document.title,
        content: document.extracted_text,
        summary: document.summary,
        file_type: document.file_type,
        file_name: document.file_name,
        status: 'indexed',
        created_at: document.created_at,
        updated_at: document.updated_at,
        metadata: document.metadata,
        chunks: [], // Could be generated here if needed
        legal_entities: document.legal_entities || [],
        case_citations: document.case_citations || [],
        legal_concepts: document.legal_concepts || []
      };

      await this.elasticsearchService.indexDocument(esDocument);
    } catch (error) {
      console.error('Elasticsearch indexing failed:', error);
      // Don't throw - this shouldn't fail the entire process
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.pdfExtractor.terminateOCR();
  }
}

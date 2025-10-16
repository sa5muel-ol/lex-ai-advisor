import { BrowserElasticsearchService, SearchFilters, SearchResult } from './BrowserElasticsearchService';
import { GeminiService, AIInsights, SearchStrategy } from './GeminiService';

export interface AIEnhancedSearchResult {
  results: SearchResult[];
  aiInsights: AIInsights;
  strategy: SearchStrategy;
  enhancedQuery: string;
  facets: any;
  total: number;
}

export interface DocumentProcessingResult {
  id: string;
  title: string;
  summary: string;
  legal_entities: any[];
  case_citations: any[];
  legal_concepts: string[];
  chunks: {
    text: string;
    chunk_index: number;
    embedding: number[];
  }[];
  metadata: any;
}

export class AIEnhancedSearchService {
  private elasticsearchService: BrowserElasticsearchService;
  private geminiService: GeminiService;

  constructor() {
    this.elasticsearchService = new BrowserElasticsearchService();
    this.geminiService = new GeminiService();
  }

  // Method to reinitialize services when settings change
  reinitialize() {
    this.elasticsearchService = new BrowserElasticsearchService();
    this.geminiService.reinitialize();
  }

  // Check if services are properly initialized
  isInitialized(): { elasticsearch: boolean; gemini: boolean } {
    return {
      elasticsearch: true, // BrowserElasticsearchService doesn't need API key validation
      gemini: this.geminiService.isInitialized()
    };
  }

  async initialize(): Promise<void> {
    try {
      await this.elasticsearchService.initializeIndex();
      console.log('AI-Enhanced Search Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI-Enhanced Search Service:', error);
      throw error;
    }
  }

  async intelligentSearch(query: string, context?: string, filters: SearchFilters = {}): Promise<AIEnhancedSearchResult> {
    try {
      // Step 1: AI Query Enhancement
      const enhancedQuery = await this.geminiService.enhanceQuery(query, context);
      
      // Step 2: Elasticsearch Search
      const searchResponse = await this.elasticsearchService.searchDocuments(enhancedQuery, filters);
      
      // Step 3: AI Result Analysis
      const aiInsights = await this.geminiService.analyzeSearchResults(searchResponse.results, query);
      
      // Step 4: AI-Generated Strategy
      const strategy = await this.geminiService.generateStrategy(searchResponse.results, query);
      
      return {
        results: searchResponse.results,
        aiInsights,
        strategy,
        enhancedQuery,
        facets: searchResponse.facets,
        total: searchResponse.total
      };
    } catch (error) {
      console.error('Error in intelligent search:', error);
      throw error;
    }
  }

  async semanticSearch(query: string, filters: SearchFilters = {}): Promise<SearchResult[]> {
    try {
      // Generate embedding using Gemini
      const embedding = await this.geminiService.generateEmbedding(query);
      
      // Search Elasticsearch with AI-generated embedding
      const results = await this.elasticsearchService.vectorSearch(embedding, filters);
      
      return results;
    } catch (error) {
      console.error('Error in semantic search:', error);
      throw error;
    }
  }

  async hybridSearch(query: string, filters: SearchFilters = {}): Promise<SearchResult[]> {
    try {
      // Perform both text and vector search
      const [textResults, vectorResults] = await Promise.all([
        this.elasticsearchService.searchDocuments(query, filters),
        this.semanticSearch(query, filters)
      ]);

      // Combine and deduplicate results
      const combinedResults = this.combineSearchResults(textResults.results, vectorResults);
      
      return combinedResults;
    } catch (error) {
      console.error('Error in hybrid search:', error);
      throw error;
    }
  }

  async processDocument(file: File, userId: string): Promise<DocumentProcessingResult> {
    try {
      // Step 1: Extract text from PDF (using existing service)
      const extractedText = await this.extractTextFromPDF(file);
      
      // Step 2: AI-powered analysis
      const analysis = await this.geminiService.analyzeDocument(extractedText);
      
      // Step 3: Generate embeddings for chunks
      const chunks = await this.generateChunkEmbeddings(extractedText);
      
      // Step 4: Create document object
      const document: DocumentProcessingResult = {
        id: this.generateId(),
        title: analysis.title,
        summary: analysis.summary,
        legal_entities: analysis.legal_entities,
        case_citations: analysis.case_citations,
        legal_concepts: analysis.legal_concepts,
        chunks: chunks,
        metadata: {
          file_name: file.name,
          file_type: file.type,
          processed_at: new Date().toISOString(),
          ai_confidence: analysis.confidence,
          user_id: userId
        }
      };

      // Step 5: Index in Elasticsearch
      await this.elasticsearchService.indexDocument({
        ...document,
        user_id: userId,
        content: extractedText,
        file_name: file.name,
        file_type: file.type,
        status: 'indexed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      return document;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  async getSuggestions(query: string): Promise<string[]> {
    try {
      return await this.elasticsearchService.getSuggestions(query);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await this.elasticsearchService.deleteDocument(id);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  async getDocument(id: string): Promise<any> {
    try {
      return await this.elasticsearchService.getDocument(id);
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<{ elasticsearch: boolean; gemini: boolean }> {
    try {
      const elasticsearchHealth = await this.elasticsearchService.healthCheck();
      
      // Simple Gemini health check
      let geminiHealth = false;
      try {
        await this.geminiService.generateEmbedding('test');
        geminiHealth = true;
      } catch (error) {
        console.error('Gemini health check failed:', error);
      }

      return {
        elasticsearch: elasticsearchHealth,
        gemini: geminiHealth
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return { elasticsearch: false, gemini: false };
    }
  }

  private async extractTextFromPDF(file: File): Promise<string> {
    // This would integrate with your existing PDF extraction service
    // For now, return a placeholder
    return `Extracted text from ${file.name}`;
  }

  private async generateChunkEmbeddings(text: string): Promise<{
    text: string;
    chunk_index: number;
    embedding: number[];
  }[]> {
    const chunkSize = 1000;
    const chunks: string[] = [];
    
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    
    const embeddings = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.geminiService.generateEmbedding(chunk);
      
      embeddings.push({
        text: chunk,
        chunk_index: i,
        embedding: embedding
      });
    }
    
    return embeddings;
  }

  private combineSearchResults(textResults: SearchResult[], vectorResults: SearchResult[]): SearchResult[] {
    const resultMap = new Map<string, SearchResult>();
    
    // Add text search results
    textResults.forEach(result => {
      resultMap.set(result.id, { ...result, score: result.score * 0.7 }); // Weight text search
    });
    
    // Add vector search results, combining scores
    vectorResults.forEach(result => {
      const existing = resultMap.get(result.id);
      if (existing) {
        existing.score = existing.score + (result.score * 0.3); // Weight vector search
      } else {
        resultMap.set(result.id, { ...result, score: result.score * 0.3 });
      }
    });
    
    // Sort by combined score
    return Array.from(resultMap.values()).sort((a, b) => b.score - a.score);
  }

  private generateId(): string {
    return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}


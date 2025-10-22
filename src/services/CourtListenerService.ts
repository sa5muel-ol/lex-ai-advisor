/**
 * Court Listener PACER API Integration Service
 * Handles mass ingestion of legal documents from federal courts
 */

interface CourtListenerDocument {
  cluster_id: number;
  absolute_url: string;
  caseName: string;
  caseNameFull: string;
  court: string;
  court_id: string;
  dateFiled: string;
  docketNumber: string;
  docket_id: number;
  opinions: Array<{
    id: number;
    download_url: string;
    local_path: string;
    sha1: string;
    snippet: string;
    type: string;
  }>;
  citation: string[];
  citeCount: number;
  status: string;
  source: string;
}

interface CourtListenerResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CourtListenerDocument[];
}

interface SearchFilters {
  query?: string;
  court?: string;
  date_filed_after?: string;
  date_filed_before?: string;
  document_type?: string;
  tags?: string[];
  page_size?: number;
}

export class CourtListenerService {
  private baseUrl = 'https://www.courtlistener.com/api/rest/v4';
  private apiKey: string;
  private rateLimitDelay = 1000; // 1 second between requests
  private maxRetries = 3;
  private supabaseClient?: any; // Optional authenticated Supabase client

  constructor(apiKey: string, supabaseClient?: any) {
    this.apiKey = apiKey;
    this.supabaseClient = supabaseClient;
  }

  /**
   * Search for court documents with filters using the v4 search API
   */
  async searchDocuments(filters: SearchFilters = {}): Promise<CourtListenerDocument[]> {
    const params = new URLSearchParams();
    
    // Add query parameter if provided
    if (filters.query) params.append('q', filters.query);
    if (filters.court) params.append('court', filters.court);
    if (filters.date_filed_after) params.append('date_filed__gte', filters.date_filed_after);
    if (filters.date_filed_before) params.append('date_filed__lte', filters.date_filed_before);
    if (filters.document_type) params.append('document_type', filters.document_type);
    if (filters.tags) params.append('tags', filters.tags.join(','));
    if (filters.page_size) params.append('page_size', filters.page_size.toString());

    const url = `${this.baseUrl}/search/?${params.toString()}`;
    const response = await this.makeRequest(url);
    return response.results || [];
  }

  /**
   * Get documents from specific courts using search API
   */
  async getDocumentsByCourt(courtId: string, limit: number = 100): Promise<CourtListenerDocument[]> {
    const filters: SearchFilters = {
      court: courtId,
      page_size: limit
    };
    return this.searchDocuments(filters);
  }

  /**
   * Get recent documents (last 30 days) using search API
   */
  async getRecentDocuments(limit: number = 100): Promise<CourtListenerDocument[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filters: SearchFilters = {
      date_filed_after: thirtyDaysAgo.toISOString().split('T')[0],
      page_size: limit
    };
    return this.searchDocuments(filters);
  }

  /**
   * Download document content using opinion download URL
   * Returns null if document cannot be downloaded (no placeholder creation)
   */
  async downloadDocument(document: CourtListenerDocument): Promise<ArrayBuffer | null> {
    // Check if document has opinions with download URLs
    if (!document.opinions || document.opinions.length === 0) {
      console.warn(`Document ${document.cluster_id} has no opinions, skipping`);
      return null;
    }

    const opinion = document.opinions[0];
    console.log(`Document ${document.cluster_id} opinion structure:`, {
      hasOpinion: !!opinion,
      hasDownloadUrl: !!opinion?.download_url,
      downloadUrl: opinion?.download_url,
      opinionType: opinion?.type
    });

    if (!opinion || !opinion.download_url || opinion.download_url.trim() === '') {
      console.warn(`Document ${document.cluster_id} has no valid download URL, skipping`);
      return null;
    }

    // Try backend proxy first
    try {
      return await this.downloadViaBackendProxy(opinion.download_url);
    } catch (error) {
      console.warn(`Backend download failed for ${document.cluster_id}, skipping:`, error);
      return null;
    }
  }

  private async downloadViaBackendProxy(url: string): Promise<ArrayBuffer> {
    const proxyUrl = import.meta.env.VITE_PROXY_SERVER_URL || 'http://localhost:3001';
    const response = await fetch(`${proxyUrl}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        apiKey: this.apiKey
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Backend download failed: ${errorData.error || response.statusText}`);
    }

    return response.arrayBuffer();
  }

  private async createPlaceholderDocument(document: CourtListenerDocument): Promise<ArrayBuffer> {
    // Create a text document with case metadata
    const caseInfo = {
      title: document.caseName,
      court: document.court,
      dateFiled: document.dateFiled,
      docketNumber: document.docketNumber,
      clusterId: document.cluster_id,
      downloadUrl: document.opinions[0]?.download_url,
      citation: document.citation
    };

    // Create a text representation of the case info (single line format to avoid GCS issues)
    const textContent = `COURT DOCUMENT PLACEHOLDER - Case: ${caseInfo.title} - Court: ${caseInfo.court} - Date Filed: ${caseInfo.dateFiled} - Docket Number: ${caseInfo.docketNumber} - Cluster ID: ${caseInfo.clusterId} - Citation: ${caseInfo.citation?.join(', ') || 'N/A'} - Download URL: ${caseInfo.downloadUrl} - Note: This is a placeholder document. The actual PDF could not be downloaded due to CORS restrictions. To access the full document, please visit the download URL directly. Generated by Lex AI Advisor ${new Date().toISOString()}`;

    // Convert text to ArrayBuffer
    const encoder = new TextEncoder();
    return encoder.encode(textContent).buffer;
  }

  /**
   * Batch download multiple documents
   * Only returns successfully downloaded documents (no placeholders)
   */
  async batchDownloadDocuments(documents: CourtListenerDocument[]): Promise<Map<number, ArrayBuffer>> {
    const results = new Map<number, ArrayBuffer>();
    
    for (const doc of documents) {
      try {
        console.log(`Downloading document ${doc.cluster_id}: ${doc.caseName}`);
        const content = await this.downloadDocument(doc);
        
        // Only add to results if content was successfully downloaded (not null)
        if (content !== null) {
          results.set(doc.cluster_id, content);
          console.log(`Successfully downloaded document ${doc.cluster_id}`);
        } else {
          console.log(`Skipped document ${doc.cluster_id} - could not be downloaded`);
        }
        
        // Rate limiting
        await this.delay(this.rateLimitDelay);
      } catch (error) {
        console.error(`Failed to download document ${doc.cluster_id}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Process and ingest documents into our system
   */
  async ingestDocuments(documents: CourtListenerDocument[]): Promise<void> {
    console.log(`Starting ingestion of ${documents.length} documents (PDFs only - no placeholders)`);
    
    const downloadedDocs = await this.batchDownloadDocuments(documents);
    console.log(`Successfully downloaded ${downloadedDocs.size} PDF documents out of ${documents.length} requested`);
    
    if (downloadedDocs.size === 0) {
      console.warn('No documents were successfully downloaded. Check proxy server and document availability.');
      return;
    }
    
    for (const [docId, content] of downloadedDocs) {
      try {
        const doc = documents.find(d => d.cluster_id === docId);
        if (!doc) continue;

        // All downloaded content is now real PDF files (no placeholders)
        const fileType = 'application/pdf';
        const fileExtension = 'pdf';
        
        console.log(`Processing document ${docId}: ${doc.caseName} (PDF)`);
        
        // Create a safe filename
        const safeFileName = doc.caseName
          .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special characters except spaces, hyphens, underscores
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .replace(/_+/g, '_') // Replace multiple underscores with single underscore
          .replace(/^_|_$/g, '') // Remove leading/trailing underscores
          .substring(0, 50); // Limit length to avoid GCS issues
        
        const blob = new Blob([content], { type: fileType });
        const file = new File([blob], `${safeFileName}.${fileExtension}`, { type: fileType });

        // Extract text using our existing service
        const extractedText = await this.extractTextFromFile(file);
        
        // Create document metadata
        const documentMetadata = {
          title: doc.caseName,
          file_name: `${safeFileName}.${fileExtension}`,
          file_path: `court-listener/${doc.court_id}/${doc.dateFiled}/${doc.cluster_id}.${fileExtension}`,
          file_type: fileType,
          extracted_text: extractedText,
          metadata: {
            court_listener_cluster_id: doc.cluster_id,
            court: doc.court,
            court_id: doc.court_id,
            docket_number: doc.docketNumber,
            docket_id: doc.docket_id,
            date_filed: doc.dateFiled,
            citation: doc.citation,
            cite_count: doc.citeCount,
            status: doc.status,
            source: doc.source,
            opinions: doc.opinions?.map(op => ({
              id: op.id,
              type: op.type,
              sha1: op.sha1,
              download_url: op.download_url
            })) || []
          }
        };

        // Store in our system (GCS for files, Supabase for metadata)
        await this.storeDocument(file, documentMetadata);
        
        console.log(`Successfully ingested document ${docId}`);
        
      } catch (error) {
        console.error(`Failed to ingest document ${docId}:`, error);
      }
    }
  }

  /**
   * Extract text from PDF file
   */
  private async extractTextFromFile(file: File): Promise<string> {
    // For placeholder documents (text files), just return the content directly
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      return file.text();
    }

    // For actual PDFs, use PDF text extraction
    try {
      const PDFTextExtractor = (await import('./PDFTextExtractor')).default;
      const extractor = new PDFTextExtractor();
      const result = await extractor.extractTextFromPDF(file);
      return result.text;
    } catch (error) {
      console.warn('PDF text extraction failed, using file name as content:', error);
      return `Document: ${file.name}`;
    }
  }

  /**
   * Store document in our system
   */
  private async storeDocument(file: File, metadata: any): Promise<void> {
    // Use our existing Google Cloud Storage service
    const { GoogleCloudStorageService } = await import('./GoogleCloudStorageService');
    const gcsService = new GoogleCloudStorageService();
    
    // Upload to GCS - this is our single source of truth
    const uploadResult = await gcsService.uploadFile(file);
    
    if (!uploadResult.success) {
      console.error('GCS upload failed:', uploadResult.error);
      throw new Error(`Failed to upload to GCS: ${uploadResult.error}`);
    }
    
    const fileName = uploadResult.filename || file.name;
    
    // Store metadata in Supabase (no file storage, just metadata)
    const supabase = this.supabaseClient || (await import('../integrations/supabase/client')).supabase;
    
    // Get the current user - this is required for RLS
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    let userId = user?.id;
    if (authError || !user) {
      console.warn('User not authenticated, using system user for storage:', authError?.message);
      // Use a system user ID for unauthenticated ingestion
      userId = '00000000-0000-0000-0000-000000000000';
    }
    
    console.log(`Storing document metadata: file_name=${metadata.file_name}, file_path=${fileName}, file_type=${metadata.file_type}`);
    
    // Generate AI summary using Gemini service
    let summary = '';
    try {
      const { GeminiService } = await import('./GeminiService');
      const geminiService = new GeminiService();
      summary = await geminiService.generateSummary(metadata.extracted_text);
      console.log(`Generated summary for ${metadata.file_name}: ${summary.substring(0, 100)}...`);
    } catch (error) {
      console.warn(`Failed to generate summary for ${metadata.file_name}:`, error);
      summary = 'Summary generation failed';
    }
    
    const { error } = await supabase.from('legal_documents').insert({
      user_id: userId,
      title: metadata.title,
      file_name: metadata.file_name,
      file_path: fileName, // Use just the filename, not the full upload result
      file_type: metadata.file_type,
      status: 'indexed', // Mark as indexed since we've processed it
      extracted_text: metadata.extracted_text,
      summary: summary, // Add the AI-generated summary
      metadata: metadata.metadata
    });
    
    if (error) {
      console.error('Supabase insertion error:', error);
      throw new Error(`Failed to store document metadata: ${error.message}`);
    }

    console.log(`Successfully stored document: ${metadata.file_name}`);
  }

  /**
   * Make authenticated request to Court Listener API
   */
  private async makeRequest(url: string): Promise<any> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited, wait longer
            await this.delay(this.rateLimitDelay * 2);
            continue;
          }
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return response.json();
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw error;
        }
        await this.delay(this.rateLimitDelay);
      }
    }
  }

  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get available courts using the v4 courts API
   */
  async getCourts(): Promise<any[]> {
    const url = `${this.baseUrl}/courts/`;
    const response = await this.makeRequest(url);
    return response.results || [];
  }


  /**
   * Search for dockets using the v4 dockets API
   */
  async searchDockets(filters: SearchFilters = {}): Promise<any[]> {
    const params = new URLSearchParams();
    
    if (filters.court) params.append('court', filters.court);
    if (filters.date_filed_after) params.append('date_filed__gte', filters.date_filed_after);
    if (filters.date_filed_before) params.append('date_filed__lte', filters.date_filed_before);
    if (filters.page_size) params.append('page_size', filters.page_size.toString());

    const url = `${this.baseUrl}/dockets/?${params.toString()}`;
    const response = await this.makeRequest(url);
    return response.results || [];
  }

  /**
   * Get document types - Court Listener doesn't have a dedicated endpoint
   * We'll return common document types based on PACER standards
   */
  async getDocumentTypes(): Promise<any[]> {
    // Court Listener API doesn't have a document-types endpoint
    // Return common PACER document types
    return [
      { id: '1', name: 'Complaint' },
      { id: '2', name: 'Answer' },
      { id: '3', name: 'Motion' },
      { id: '4', name: 'Order' },
      { id: '5', name: 'Judgment' },
      { id: '6', name: 'Brief' },
      { id: '7', name: 'Memorandum' },
      { id: '8', name: 'Notice' },
      { id: '9', name: 'Petition' },
      { id: '10', name: 'Response' }
    ];
  }
}


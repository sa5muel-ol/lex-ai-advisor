import { Client } from '@elastic/elasticsearch';

export interface SearchFilters {
  file_type?: string[];
  date_range?: {
    from: string;
    to: string;
  };
  courts?: string[];
  legal_concepts?: string[];
}

export interface SearchResult {
  id: string;
  title: string;
  summary: string;
  content: string;
  file_type: string;
  created_at: string;
  legal_entities: any[];
  case_citations: any[];
  legal_concepts: string[];
  ai_confidence: number;
  highlighted_text: string;
  score: number;
}

export interface SearchFacets {
  file_types: { key: string; doc_count: number }[];
  courts: { key: string; doc_count: number }[];
  date_ranges: { key_as_string: string; doc_count: number }[];
}

export interface ElasticsearchDocument {
  id: string;
  user_id: string;
  title: string;
  content: string;
  summary: string;
  file_type: string;
  file_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata: any;
  chunks: {
    text: string;
    page_number?: number;
    chunk_index: number;
    embedding: number[];
  }[];
  legal_entities: any[];
  case_citations: any[];
  legal_concepts: string[];
}

export class ElasticsearchService {
  private client: Client;
  private indexName = 'legal_documents';

  constructor() {
    const url = import.meta.env.VITE_ELASTICSEARCH_URL || 'http://localhost:9200';
    const username = import.meta.env.VITE_ELASTICSEARCH_USERNAME;
    const password = import.meta.env.VITE_ELASTICSEARCH_PASSWORD;

    this.client = new Client({
      node: url,
      auth: username && password ? {
        username,
        password
      } : undefined,
      requestTimeout: 30000,
      maxRetries: 3,
      resurrectStrategy: 'ping'
    });
  }

  async initializeIndex(): Promise<void> {
    try {
      // Check if index exists
      const exists = await this.client.indices.exists({
        index: this.indexName
      });

      if (!exists) {
        await this.createIndex();
      }
    } catch (error) {
      console.error('Error initializing Elasticsearch index:', error);
      throw error;
    }
  }

  private async createIndex(): Promise<void> {
    const mapping = {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          user_id: { type: 'keyword' },
          title: { 
            type: 'text', 
            analyzer: 'legal_analyzer',
            fields: {
              keyword: { type: 'keyword' },
              suggest: { type: 'completion' }
            }
          },
          content: { 
            type: 'text', 
            analyzer: 'legal_analyzer' 
          },
          summary: { 
            type: 'text', 
            analyzer: 'legal_analyzer' 
          },
          file_type: { type: 'keyword' },
          file_name: { type: 'keyword' },
          status: { type: 'keyword' },
          created_at: { type: 'date' },
          updated_at: { type: 'date' },
          metadata: { type: 'object' },
          chunks: {
            type: 'nested',
            properties: {
              text: { type: 'text', analyzer: 'legal_analyzer' },
              page_number: { type: 'integer' },
              chunk_index: { type: 'integer' },
              embedding: { type: 'dense_vector', dims: 768 }
            }
          },
          legal_entities: {
            type: 'nested',
            properties: {
              type: { type: 'keyword' },
              value: { type: 'text' },
              confidence: { type: 'float' }
            }
          },
          case_citations: {
            type: 'nested',
            properties: {
              citation: { type: 'text' },
              court: { type: 'keyword' },
              date: { type: 'date' }
            }
          },
          legal_concepts: { type: 'keyword' }
        }
      },
      settings: {
        analysis: {
          analyzer: {
            legal_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'legal_stop', 'legal_synonyms']
            }
          },
          filter: {
            legal_stop: {
              type: 'stop',
              stopwords: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
            },
            legal_synonyms: {
              type: 'synonym',
              synonyms: [
                'plaintiff,petitioner,claimant',
                'defendant,respondent,accused',
                'court,tribunal,bench',
                'judgment,ruling,decision',
                'statute,law,regulation',
                'contract,agreement,pact'
              ]
            }
          }
        }
      }
    };

    await this.client.indices.create({
      index: this.indexName,
      body: mapping
    });

    console.log(`Created Elasticsearch index: ${this.indexName}`);
  }

  async indexDocument(document: ElasticsearchDocument): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        id: document.id,
        body: document
      });
    } catch (error) {
      console.error('Error indexing document:', error);
      throw error;
    }
  }

  async searchDocuments(query: string, filters: SearchFilters = {}, size: number = 10): Promise<{
    results: SearchResult[];
    facets: SearchFacets;
    total: number;
  }> {
    try {
      const searchBody = {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: query,
                  fields: ['title^3', 'summary^2', 'content', 'chunks.text'],
                  type: 'best_fields',
                  fuzziness: 'AUTO'
                }
              }
            ],
            filter: this.buildFilters(filters)
          }
        },
        highlight: {
          fields: {
            'chunks.text': { fragment_size: 150 },
            'content': { fragment_size: 150 }
          }
        },
        aggs: {
          file_types: { terms: { field: 'file_type' } },
          courts: { terms: { field: 'case_citations.court' } },
          date_ranges: {
            date_histogram: {
              field: 'created_at',
              calendar_interval: 'year'
            }
          }
        },
        size: size
      };

      const response = await this.client.search({
        index: this.indexName,
        body: searchBody
      });

      const results: SearchResult[] = response.body.hits.hits.map((hit: any) => ({
        id: hit._id,
        title: hit._source.title,
        summary: hit._source.summary,
        content: hit._source.content,
        file_type: hit._source.file_type,
        created_at: hit._source.created_at,
        legal_entities: hit._source.legal_entities || [],
        case_citations: hit._source.case_citations || [],
        legal_concepts: hit._source.legal_concepts || [],
        ai_confidence: hit._source.metadata?.ai_confidence || 0.5,
        highlighted_text: this.extractHighlight(hit.highlight),
        score: hit._score
      }));

      const facets: SearchFacets = {
        file_types: response.body.aggregations?.file_types?.buckets || [],
        courts: response.body.aggregations?.courts?.buckets || [],
        date_ranges: response.body.aggregations?.date_ranges?.buckets || []
      };

      return {
        results,
        facets,
        total: response.body.hits.total.value
      };
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  async vectorSearch(embedding: number[], filters: SearchFilters = {}, size: number = 10): Promise<SearchResult[]> {
    try {
      const searchBody = {
        query: {
          bool: {
            must: [
              {
                nested: {
                  path: 'chunks',
                  query: {
                    script_score: {
                      query: { match_all: {} },
                      script: {
                        source: 'cosineSimilarity(params.query_vector, "chunks.embedding") + 1.0',
                        params: { query_vector: embedding }
                      }
                    }
                  }
                }
              }
            ],
            filter: this.buildFilters(filters)
          }
        },
        size: size
      };

      const response = await this.client.search({
        index: this.indexName,
        body: searchBody
      });

      return response.body.hits.hits.map((hit: any) => ({
        id: hit._id,
        title: hit._source.title,
        summary: hit._source.summary,
        content: hit._source.content,
        file_type: hit._source.file_type,
        created_at: hit._source.created_at,
        legal_entities: hit._source.legal_entities || [],
        case_citations: hit._source.case_citations || [],
        legal_concepts: hit._source.legal_concepts || [],
        ai_confidence: hit._source.metadata?.ai_confidence || 0.5,
        highlighted_text: '',
        score: hit._score
      }));
    } catch (error) {
      console.error('Error in vector search:', error);
      throw error;
    }
  }

  async getSuggestions(query: string): Promise<string[]> {
    try {
      const response = await this.client.search({
        index: this.indexName,
        body: {
          suggest: {
            title_suggest: {
              prefix: query,
              completion: {
                field: 'title.suggest',
                size: 5
              }
            }
          }
        }
      });

      return response.body.suggest?.title_suggest?.[0]?.options?.map((option: any) => option.text) || [];
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.indexName,
        id: id
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  async getDocument(id: string): Promise<ElasticsearchDocument | null> {
    try {
      const response = await this.client.get({
        index: this.indexName,
        id: id
      });

      return response.body._source;
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      console.error('Error getting document:', error);
      throw error;
    }
  }

  private buildFilters(filters: SearchFilters): any[] {
    const filterArray: any[] = [];

    if (filters.file_type && filters.file_type.length > 0) {
      filterArray.push({
        terms: { file_type: filters.file_type }
      });
    }

    if (filters.courts && filters.courts.length > 0) {
      filterArray.push({
        nested: {
          path: 'case_citations',
          query: {
            terms: { 'case_citations.court': filters.courts }
          }
        }
      });
    }

    if (filters.date_range) {
      filterArray.push({
        range: {
          created_at: {
            gte: filters.date_range.from,
            lte: filters.date_range.to
          }
        }
      });
    }

    if (filters.legal_concepts && filters.legal_concepts.length > 0) {
      filterArray.push({
        terms: { legal_concepts: filters.legal_concepts }
      });
    }

    return filterArray;
  }

  private extractHighlight(highlight: any): string {
    if (!highlight) return '';
    
    const highlights = [];
    
    if (highlight['chunks.text']) {
      highlights.push(...highlight['chunks.text']);
    }
    
    if (highlight.content) {
      highlights.push(...highlight.content);
    }
    
    return highlights.join(' ... ') || '';
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response.body;
    } catch (error) {
      console.error('Elasticsearch health check failed:', error);
      return false;
    }
  }
}


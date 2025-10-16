import { GoogleGenerativeAI } from '@google/generative-ai';
import { SettingsService } from './SettingsService';

export interface LegalEntity {
  type: string;
  value: string;
  confidence: number;
}

export interface CaseCitation {
  citation: string;
  court: string;
  date?: string;
}

export interface LegalAnalysis {
  title: string;
  summary: string;
  legal_entities: LegalEntity[];
  case_citations: CaseCitation[];
  legal_concepts: string[];
  confidence: number;
}

export interface AIInsights {
  themes: string[];
  precedents: string[];
  arguments: string[];
  risks: string[];
  recommendations: string[];
}

export interface SearchStrategy {
  primary_arguments: string[];
  supporting_precedents: string[];
  counterarguments: string[];
  next_steps: string[];
  risk_assessment: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private apiKey: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const apiKey = SettingsService.getApiKey('gemini') || import.meta.env.VITE_GEMINI_API_KEY;
    this.apiKey = apiKey;
    
    if (!apiKey) {
      console.warn('Gemini API key not found. AI features will be limited. Please set VITE_GEMINI_API_KEY in your environment variables or configure it in settings.');
      this.genAI = null;
      this.model = null;
      return;
    }
    
           try {
             this.genAI = new GoogleGenerativeAI(apiKey);
             
             // Try different model names in order of preference
             const modelNames = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
             let modelInitialized = false;
             
             for (const modelName of modelNames) {
               try {
                 this.model = this.genAI.getGenerativeModel({ model: modelName });
                 console.log(`Gemini service initialized successfully with model: ${modelName}`);
                 modelInitialized = true;
                 break;
               } catch (modelError) {
                 console.warn(`Failed to initialize with model ${modelName}:`, modelError);
                 continue;
               }
             }
             
             if (!modelInitialized) {
               throw new Error('No compatible Gemini model found');
             }
           } catch (error) {
             console.error('Failed to initialize Gemini service:', error);
             this.genAI = null;
             this.model = null;
           }
  }

  // Method to reinitialize with new API key
  reinitialize() {
    this.initialize();
  }

  // Check if service is properly initialized
  isInitialized(): boolean {
    return this.model !== null;
  }

  async enhanceQuery(query: string, context?: string): Promise<string> {
    if (!this.model) {
      console.warn('Gemini API not available. Returning original query.');
      return query;
    }

    const prompt = `
You are a legal research assistant. Enhance this search query for better legal document retrieval:

Original Query: "${query}"
Context: "${context || 'General legal research'}"

Provide an enhanced query that:
1. Uses proper legal terminology
2. Includes relevant synonyms
3. Specifies legal concepts clearly
4. Maintains the original intent

Enhanced Query:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error enhancing query:', error);
      return query; // Return original query if enhancement fails
    }
  }

  async analyzeDocument(text: string): Promise<LegalAnalysis> {
    if (!this.model) {
      console.warn('Gemini API not available. Returning basic analysis.');
      return {
        title: 'Document Analysis Unavailable',
        summary: 'AI analysis requires Gemini API key',
        legal_entities: [],
        case_citations: [],
        legal_concepts: [],
        confidence: 0
      };
    }

    const prompt = `
Analyze this legal document and extract key information:

Text: "${text.slice(0, 4000)}"

Provide a JSON response with:
{
  "title": "Document title",
  "summary": "Brief summary of the document",
  "legal_entities": [
    {"type": "case_name", "value": "Case Name", "confidence": 0.9},
    {"type": "statute", "value": "Statute Name", "confidence": 0.8}
  ],
  "case_citations": [
    {"citation": "Citation", "court": "Court Name", "date": "Date"}
  ],
  "legal_concepts": ["concept1", "concept2"],
  "confidence": 0.85
}

Only return the JSON, no additional text:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text().trim();
      
      // Clean up the response to extract JSON
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Could not parse JSON response');
    } catch (error) {
      console.error('Error analyzing document:', error);
      return {
        title: 'Untitled Document',
        summary: 'Unable to analyze document',
        legal_entities: [],
        case_citations: [],
        legal_concepts: [],
        confidence: 0
      };
    }
  }

  async analyzeSearchResults(results: any[], originalQuery: string): Promise<AIInsights> {
    if (!this.model) {
      console.warn('Gemini API not available. Returning basic insights.');
      return {
        themes: ['Legal Analysis Unavailable'],
        precedents: ['AI analysis requires Gemini API key'],
        arguments: [],
        risks: [],
        recommendations: ['Please configure Gemini API key for full AI features']
      };
    }

    const resultsText = results.slice(0, 3).map(r => 
      `Title: ${r.title}\nSummary: ${r.summary || 'No summary'}\nContent: ${r.content?.slice(0, 500) || 'No content'}`
    ).join('\n\n---\n\n');

    const prompt = `
Analyze these legal search results for the query: "${originalQuery}"

Results:
${resultsText}

Provide a JSON response with:
{
  "themes": ["theme1", "theme2"],
  "precedents": ["precedent1", "precedent2"],
  "arguments": ["argument1", "argument2"],
  "risks": ["risk1", "risk2"],
  "recommendations": ["recommendation1", "recommendation2"]
}

Only return the JSON, no additional text:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text().trim();
      
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Could not parse JSON response');
    } catch (error) {
      console.error('Error analyzing search results:', error);
      return {
        themes: [],
        precedents: [],
        arguments: [],
        risks: [],
        recommendations: []
      };
    }
  }

  async generateStrategy(results: any[], query: string): Promise<SearchStrategy> {
    if (!this.model) {
      console.warn('Gemini API not available. Returning basic strategy.');
      return {
        primary_arguments: ['AI analysis requires Gemini API key'],
        supporting_precedents: [],
        counterarguments: [],
        next_steps: ['Configure Gemini API key for full AI features'],
        risk_assessment: 'Unable to assess risks without AI analysis'
      };
    }

    const resultsText = results.slice(0, 3).map(r => 
      `Title: ${r.title}\nSummary: ${r.summary || 'No summary'}\nContent: ${r.content?.slice(0, 500) || 'No content'}`
    ).join('\n\n---\n\n');

    const prompt = `
Based on these legal documents and the query "${query}", generate a comprehensive legal strategy:

Documents:
${resultsText}

Provide a JSON response with:
{
  "primary_arguments": ["argument1", "argument2"],
  "supporting_precedents": ["precedent1", "precedent2"],
  "counterarguments": ["counter1", "counter2"],
  "next_steps": ["step1", "step2"],
  "risk_assessment": "Risk assessment text"
}

Only return the JSON, no additional text:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text().trim();
      
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Could not parse JSON response');
    } catch (error) {
      console.error('Error generating strategy:', error);
      return {
        primary_arguments: [],
        supporting_precedents: [],
        counterarguments: [],
        next_steps: [],
        risk_assessment: 'Unable to assess risks'
      };
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // For now, we'll use a simple hash-based embedding
      // In production, you'd use Gemini's embedding model when available
      const hash = this.simpleHash(text);
      const embedding = Array(768).fill(0);
      
      // Create a deterministic embedding based on text hash
      for (let i = 0; i < 768; i++) {
        embedding[i] = Math.sin(hash + i) * 0.5;
      }
      
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return Array(768).fill(0);
    }
  }

  async generateSummary(text: string): Promise<string> {
    if (!this.model) {
      console.warn('Gemini API not available. Returning basic summary.');
      return 'AI summary requires Gemini API key configuration';
    }

    const prompt = `
Summarize this legal document in 2-3 sentences, focusing on key legal points:

Text: "${text.slice(0, 3000)}"

Summary:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Unable to generate summary';
    }
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}


# 🧠 Lex AI Advisor - Elasticsearch + Gemini AI Integration

## 🎯 Overview

This enhanced version of Lex AI Advisor combines the power of **Elasticsearch** for fast, scalable search with **Google Gemini AI** for intelligent legal analysis and strategy generation.

## ✨ Key Features

### 🔍 AI-Enhanced Search
- **Intelligent Query Enhancement**: Gemini AI improves your search queries using legal terminology
- **Hybrid Search**: Combines semantic (vector) and lexical (text) search for comprehensive results
- **Real-time Suggestions**: AI-powered autocomplete and search suggestions
- **Context-Aware Search**: Understands legal context and intent

### 🧠 AI Legal Analysis
- **Document Analysis**: Automatic extraction of legal entities, citations, and concepts
- **Legal Strategy Generation**: AI-generated legal strategies and argument approaches
- **Risk Assessment**: Intelligent risk analysis and recommendations
- **Precedent Identification**: Automatic identification of relevant case law

### 📊 Advanced Search Capabilities
- **Faceted Search**: Filter by file type, court, date ranges, legal concepts
- **Semantic Search**: Find documents by meaning, not just keywords
- **Highlighting**: Context-aware result highlighting
- **Search Analytics**: Track search performance and user behavior

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Installation

1. **Clone and setup**:
   ```bash
   git clone <your-repo>
   cd lex-ai-advisor
   ./setup.sh
   ```

2. **Configure environment**:
   - Edit `.env` file with your API keys
   - Add your Gemini API key: `VITE_GEMINI_API_KEY=your_key_here`
   - Add Supabase credentials if using existing data

3. **Start services**:
   ```bash
   # Start Elasticsearch and Kibana
   docker-compose -f docker-compose.elasticsearch.yml up -d
   
   # Start development server
   npm run dev
   ```

### Access Points
- **Frontend**: http://localhost:8080
- **Elasticsearch**: http://localhost:9200
- **Kibana**: http://localhost:5601

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │    │   Elasticsearch  │    │   Gemini AI     │
│                 │    │                  │    │                 │
│ • AI Search UI   │◄──►│ • Document Index │◄──►│ • Query Enhance │
│ • Results Display│    │ • Vector Search  │    │ • Analysis      │
│ • Strategy View  │    │ • Faceted Search │    │ • Strategy Gen  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
src/
├── services/
│   ├── GeminiService.ts              # Gemini AI integration
│   ├── ElasticsearchService.ts       # Elasticsearch operations
│   └── AIEnhancedSearchService.ts    # Combined AI + Search service
├── components/
│   └── AIEnhancedSearchInterface.tsx # AI-powered search UI
└── pages/
    └── Dashboard.tsx                 # Updated with AI search tab
```

## 🔧 Configuration

### Environment Variables

```env
# Elasticsearch Configuration
VITE_ELASTICSEARCH_URL=http://localhost:9200
VITE_ELASTICSEARCH_USERNAME=elastic
VITE_ELASTICSEARCH_PASSWORD=changeme

# Gemini AI Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration (existing)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key_here
```

### Elasticsearch Index Mapping

The system creates a sophisticated index with:
- **Legal Analyzers**: Custom analyzers for legal terminology
- **Vector Fields**: For semantic search capabilities
- **Nested Objects**: For legal entities and citations
- **Completion Suggester**: For autocomplete functionality

## 🎯 Usage Examples

### Basic AI Search
```typescript
const aiSearchService = new AIEnhancedSearchService();
const results = await aiSearchService.intelligentSearch(
  "contract breach remedies",
  "commercial law context"
);
```

### Document Processing
```typescript
const processedDoc = await aiSearchService.processDocument(file, userId);
// Automatically extracts legal entities, generates embeddings, and indexes
```

### Semantic Search
```typescript
const semanticResults = await aiSearchService.semanticSearch(
  "unfair dismissal cases"
);
```

## 🧪 Testing the Integration

1. **Start Elasticsearch**:
   ```bash
   docker-compose -f docker-compose.elasticsearch.yml up -d
   ```

2. **Check Elasticsearch health**:
   ```bash
   curl http://localhost:9200/_cluster/health
   ```

3. **Test AI services**:
   - Upload a legal document
   - Try AI-enhanced search
   - Check AI insights and strategy generation

## 🔍 Search Features

### Query Enhancement
- Converts natural language to legal terminology
- Adds relevant synonyms and legal concepts
- Maintains original search intent

### Result Analysis
- Identifies key legal themes
- Extracts relevant precedents
- Suggests legal arguments
- Assesses potential risks

### Strategy Generation
- Primary legal arguments
- Supporting precedents
- Counterargument analysis
- Next steps recommendations
- Risk assessment

## 🚨 Troubleshooting

### Common Issues

1. **Elasticsearch Connection Failed**:
   - Check if Docker containers are running
   - Verify port 9200 is not blocked
   - Check Elasticsearch logs: `docker logs lex-ai-elasticsearch`

2. **Gemini API Errors**:
   - Verify API key is correct
   - Check API quota limits
   - Ensure network connectivity

3. **Search Not Working**:
   - Check if index exists: `curl http://localhost:9200/legal_documents`
   - Verify document indexing
   - Check browser console for errors

### Debug Commands

```bash
# Check Elasticsearch status
curl http://localhost:9200/_cluster/health

# List indices
curl http://localhost:9200/_cat/indices

# Check document count
curl http://localhost:9200/legal_documents/_count

# View index mapping
curl http://localhost:9200/legal_documents/_mapping
```

## 🔮 Future Enhancements

- **Real-time Collaboration**: Multi-user document analysis
- **Advanced Analytics**: Search pattern analysis and insights
- **Custom Models**: Fine-tuned legal language models
- **Integration APIs**: Third-party legal database connections
- **Mobile App**: React Native mobile application

## 📚 API Reference

### AIEnhancedSearchService

#### `intelligentSearch(query, context?, filters?)`
Performs AI-enhanced search with query improvement and result analysis.

#### `semanticSearch(query, filters?)`
Performs vector-based semantic search using AI embeddings.

#### `processDocument(file, userId)`
Processes uploaded documents with AI analysis and indexing.

#### `getSuggestions(query)`
Returns AI-powered search suggestions.

### GeminiService

#### `enhanceQuery(query, context?)`
Improves search queries using legal terminology.

#### `analyzeDocument(text)`
Extracts legal entities, citations, and concepts from documents.

#### `generateStrategy(results, query)`
Generates comprehensive legal strategies.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚖️ Legal Disclaimer

This AI-powered tool provides suggestions and analysis for informational purposes only. It does not constitute legal advice. Always consult with a licensed attorney for legal matters. No guarantee of outcomes or success is provided.


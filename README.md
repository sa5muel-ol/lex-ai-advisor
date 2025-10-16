# Lex AI Advisor - AI-Powered Legal Research Platform

A sophisticated legal research platform that combines **Supabase**, **Elasticsearch**, and **Gemini 2.5 Flash AI** to provide intelligent document analysis, semantic search, and AI-powered legal insights.

## 🚀 Features

### Core Functionality
- **📄 Document Upload & Processing** - Upload PDFs and other legal documents
- **🔍 Semantic Search** - Search through documents using natural language
- **🤖 AI-Enhanced Search** - Get AI-powered insights and legal analysis
- **📊 Document Management** - Organize and manage your legal document library
- **⚙️ Settings Management** - Configure API keys and preferences
- **🌙 Theme Support** - Light, dark, and system theme modes

### AI Capabilities
- **Query Enhancement** - AI improves your search queries for better results
- **Document Analysis** - AI analyzes uploaded documents for key insights
- **Legal Strategy Generation** - AI suggests legal strategies based on search results
- **Precedent Analysis** - AI identifies relevant legal precedents
- **Risk Assessment** - AI evaluates potential risks and opportunities

### Search Technologies
- **Supabase Integration** - Primary database and authentication
- **Elasticsearch** - Advanced search indexing and retrieval
- **Gemini 2.5 Flash** - Latest Google AI model for legal analysis
- **Hybrid Search** - Combines keyword and semantic search
- **Real-time Sync** - Documents automatically synced between systems

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and context
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible UI components

### Backend & Services
- **Supabase** - PostgreSQL database, authentication, storage, Edge Functions
- **Elasticsearch** - Search engine and document indexing
- **Gemini 2.5 Flash** - Google's latest AI model
- **Docker** - Containerized Elasticsearch and Kibana

### Key Libraries
- **@google/generative-ai** - Gemini AI integration
- **@supabase/supabase-js** - Supabase client
- **react-router-dom** - Client-side routing
- **@tanstack/react-query** - Data fetching and caching

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or higher) - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** or **yarn** - Package manager
- **Docker** - For Elasticsearch and Kibana
- **Git** - Version control

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <YOUR_GIT_URL>
cd lex-ai-advisor
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Gemini AI Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key

# Elasticsearch Configuration (Optional - defaults to localhost)
VITE_ELASTICSEARCH_URL=http://localhost:9200
VITE_ELASTICSEARCH_USERNAME=elastic
VITE_ELASTICSEARCH_PASSWORD=your_password
```

### 4. Start Elasticsearch (Required for AI Search)

```bash
# Start Elasticsearch and Kibana using Docker Compose
docker-compose -f docker-compose.elasticsearch.yml up -d

# Verify Elasticsearch is running
curl http://localhost:9200
```

### 5. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## 🔧 Configuration

### Supabase Setup

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Get your project URL and anon key

2. **Database Schema**:
   The app uses these tables:
   - `legal_documents` - Document metadata
   - `document_chunks` - Document text chunks
   - `legal_strategies` - AI-generated strategies
   - `similar_cases` - Case similarity data
   - `search_history` - Search query history

3. **Enable Extensions**:
   ```sql
   -- Enable pgvector for embeddings
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### Gemini AI Setup

1. **Get API Key**:
   - Go to [Google AI Studio](https://aistudio.google.com)
   - Create a new API key
   - Add it to your `.env` file

2. **Model Support**:
   The app automatically tries these models in order:
   - `gemini-2.5-flash` (primary)
   - `gemini-1.5-flash` (fallback)
   - `gemini-1.5-pro` (fallback)
   - `gemini-pro` (legacy)

### Elasticsearch Setup

The app includes a Docker Compose file for easy setup:

```yaml
# docker-compose.elasticsearch.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - http.cors.enabled=true
      - http.cors.allow-origin="*"
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

## 📖 Usage Guide

### 1. Authentication

- **Sign Up**: Create a new account
- **Sign In**: Use your credentials
- **Sign Out**: Click the sign out button in the header

### 2. Document Upload

1. Go to the **Upload** tab
2. Select PDF files to upload
3. Documents are automatically processed and indexed
4. View uploaded documents in the **Documents** tab

### 3. Basic Search

1. Go to the **Basic Search** tab
2. Enter your legal query
3. Results show relevant document excerpts
4. Search uses Supabase → Elasticsearch → Sample data fallback

### 4. AI-Enhanced Search

1. Go to the **AI Search** tab
2. Enter your legal question
3. Add optional context
4. Click **AI Search** for enhanced results
5. View AI insights, strategies, and analysis

### 5. Document Management

1. Go to the **Documents** tab
2. View all uploaded documents
3. See processing status and metadata
4. Access document details and summaries

### 6. Settings Configuration

1. Go to the **Settings** tab
2. Configure API keys (Gemini, Elasticsearch)
3. Adjust search preferences
4. Change theme (Light/Dark/System)
5. Save settings (automatically applied)

## 🔍 Search Features

### Search Types

1. **Supabase Edge Function Search** - Primary search method
2. **Direct Database Search** - Fallback to Supabase database
3. **Elasticsearch Search** - Advanced search with indexing
4. **AI-Enhanced Search** - Gemini-powered analysis

### Search Capabilities

- **Semantic Search** - Understands meaning, not just keywords
- **Hybrid Search** - Combines multiple search methods
- **Faceted Search** - Filter by document type, court, date
- **Autocomplete** - Smart query suggestions
- **Real-time Results** - Instant search feedback

## 🎯 AI Features

### Query Enhancement
- AI improves your search queries for better results
- Suggests related legal terms and concepts
- Handles natural language queries

### Document Analysis
- Extracts key legal concepts
- Identifies important clauses and terms
- Generates document summaries

### Legal Strategy Generation
- Suggests legal arguments and strategies
- Identifies relevant precedents
- Assesses risks and opportunities
- Provides next steps recommendations

### Search Result Analysis
- Analyzes search results for patterns
- Identifies common themes
- Suggests related cases and precedents

## 🚀 Deployment

### Using Lovable (Recommended)

1. Open [Lovable](https://lovable.dev/projects/0d1ff849-e525-4c00-a865-c5cbf40f0c68)
2. Click **Share** → **Publish**
3. Configure environment variables
4. Deploy with one click

### Manual Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to your preferred platform**:
   - Vercel
   - Netlify
   - AWS Amplify
   - Railway

3. **Configure environment variables** in your deployment platform

4. **Set up Elasticsearch** on a cloud service:
   - AWS Elasticsearch
   - Elastic Cloud
   - Self-hosted

## 🔧 Development

### Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── SearchInterface.tsx
│   ├── AIEnhancedSearchInterface.tsx
│   ├── UploadInterface.tsx
│   ├── DocumentList.tsx
│   └── SettingsInterface.tsx
├── services/           # Business logic
│   ├── GeminiService.ts
│   ├── BrowserElasticsearchService.ts
│   ├── AIEnhancedSearchService.ts
│   ├── DocumentSyncService.ts
│   └── SettingsService.ts
├── integrations/      # External service integrations
│   └── supabase/
├── pages/             # Page components
├── providers/         # React context providers
└── hooks/             # Custom React hooks
```

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type check
npm run type-check
```

### Adding New Features

1. **Components**: Add to `src/components/`
2. **Services**: Add to `src/services/`
3. **Pages**: Add to `src/pages/`
4. **Types**: Add to `src/integrations/supabase/types.ts`

## 🐛 Troubleshooting

### Common Issues

1. **White Screen on Load**:
   - Check browser console for errors
   - Verify environment variables are set
   - Ensure all dependencies are installed

2. **Gemini API Errors**:
   - Verify API key is correct
   - Check API key permissions
   - Ensure you have quota available

3. **Elasticsearch Connection Issues**:
   - Verify Elasticsearch is running: `curl http://localhost:9200`
   - Check Docker containers: `docker ps`
   - Restart Elasticsearch: `docker-compose restart`

4. **Document Upload Issues**:
   - Check Supabase configuration
   - Verify file size limits
   - Check browser console for errors

### Debug Mode

Enable debug logging by adding to your `.env`:

```bash
VITE_DEBUG=true
```

### Getting Help

1. **Check the console** for error messages
2. **Verify configuration** in Settings tab
3. **Test services** using the Test buttons
4. **Check service status** indicators

## 📚 API Reference

### Supabase Tables

- `legal_documents` - Document metadata and content
- `document_chunks` - Text chunks for search
- `legal_strategies` - AI-generated strategies
- `similar_cases` - Case similarity data
- `search_history` - Search query history

### Elasticsearch Index

- `legal_documents` - Main search index
- Fields: title, content, summary, metadata
- Analyzers: legal_analyzer for legal text processing

### Gemini API

- **Model**: `gemini-2.5-flash` (primary)
- **Endpoints**: Text generation, analysis, embeddings
- **Rate Limits**: Check Google AI Studio dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Supabase** - Backend-as-a-Service
- **Elasticsearch** - Search and analytics engine
- **Google Gemini** - AI language model
- **shadcn/ui** - UI component library
- **Tailwind CSS** - CSS framework

---

**Need help?** Check the troubleshooting section or open an issue on GitHub.

**Ready to get started?** Follow the Quick Start guide above! 🚀
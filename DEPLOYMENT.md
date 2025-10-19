# Lex AI Advisor - Deployment Guide

## 🚀 Quick Deployment

### Prerequisites
- Docker and Docker Compose installed on your Linux VM
- API keys for all services configured in `.env` file

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd lex-ai-advisor
```

### 2. Configure Environment
```bash
# Copy and edit the environment file
cp .env.example .env
# Edit .env with your actual API keys
```

### 3. Deploy
```bash
# Option 1: Use the deployment script
./deploy.sh

# Option 2: Manual deployment
docker-compose up --build -d
```

## 🐳 Docker Services

### Development
- **Main App**: `http://localhost:8080`
- **Elasticsearch**: `http://localhost:9200`
- **Proxy Server**: `http://localhost:3001`

### Production (with Nginx)
- **Main App**: `http://localhost:80` (via Nginx)
- **Elasticsearch**: `http://localhost:9200`
- **Proxy Server**: Internal only

## 📋 Available Commands

```bash
# Development
npm run dev:full          # Start dev server + proxy
npm run docker:up         # Start Docker services
npm run docker:down       # Stop Docker services
npm run docker:logs       # View logs

# Production
npm run docker:prod       # Start with Nginx
npm run deploy           # Full deployment script
```

## 🔧 Service Architecture

### Core Services
1. **React App** - Main frontend application
2. **Elasticsearch** - Search and indexing engine
3. **Proxy Server** - Document download proxy (bypasses CORS)
4. **Nginx** - Reverse proxy (production only)

### External Integrations
- **Supabase** - Authentication and metadata storage
- **Google Cloud Storage** - Document file storage
- **Gemini AI** - AI-powered summaries
- **Court Listener API** - Legal document source

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Elasticsearch │    │   Proxy Server  │
│   (Port 8080)   │◄──►│   (Port 9200)   │    │   (Port 3001)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Supabase     │    │   Google Cloud   │    │ Court Listener  │
│  (Auth + Meta)  │    │    Storage      │    │      API        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔍 Troubleshooting

### Check Service Status
```bash
docker-compose ps
```

### View Logs
```bash
docker-compose logs -f [service-name]
```

### Restart Services
```bash
docker-compose restart [service-name]
```

### Elasticsearch Health Check
```bash
curl http://localhost:9200/_cluster/health
```

## 📊 Monitoring

- **Application**: `http://localhost:8080`
- **Elasticsearch**: `http://localhost:9200/_cluster/health`
- **Nginx Health**: `http://localhost/health`

## 🎯 Hackathon Submission

This project is built for the **AI Accelerate: Unlocking New Frontiers** hackathon, featuring:
- **Google Cloud** integration for storage and AI
- **Elastic** search capabilities
- **Fivetran** data pipeline integration
- Legal document processing and AI-powered analysis

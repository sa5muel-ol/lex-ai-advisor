#!/bin/bash

# Lex AI Advisor - Elasticsearch + Gemini AI Setup Script
# This script sets up Elasticsearch and initializes the AI-enhanced search system

echo "🚀 Setting up Lex AI Advisor with Elasticsearch + Gemini AI..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your API keys:"
    echo "   - VITE_GEMINI_API_KEY: Get from https://makersuite.google.com/app/apikey"
    echo "   - VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY: From your Supabase project"
    echo ""
    echo "Press Enter when you've updated the .env file..."
    read
fi

# Start Elasticsearch and Kibana
echo "🐳 Starting Elasticsearch and Kibana..."
docker-compose -f docker-compose.elasticsearch.yml up -d

# Wait for Elasticsearch to be ready
echo "⏳ Waiting for Elasticsearch to be ready..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:9200 > /dev/null 2>&1; then
        echo "✅ Elasticsearch is ready!"
        break
    fi
    
    echo "Attempt $attempt/$max_attempts - Elasticsearch not ready yet..."
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Elasticsearch failed to start within expected time"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start the development server
echo "🎉 Setup complete! Starting development server..."
echo ""
echo "📊 Services available:"
echo "   - Frontend: http://localhost:8080"
echo "   - Elasticsearch: http://localhost:9200"
echo "   - Kibana: http://localhost:5601"
echo ""
echo "🧠 AI Features:"
echo "   - AI-enhanced search with Gemini"
echo "   - Intelligent document analysis"
echo "   - Legal strategy generation"
echo "   - Semantic search capabilities"
echo ""
echo "Press Ctrl+C to stop the development server"

npm run dev


#!/bin/bash

# Lex AI Advisor Deployment Script
# For Linux VM deployment

echo "🚀 Deploying Lex AI Advisor..."

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
    echo "📝 Creating .env file template..."
    cat > .env << EOF
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key

# Google Cloud Storage
VITE_GCS_BUCKET_NAME=your-gcs-bucket
VITE_GOOGLE_CLOUD_API_KEY=your-gcs-api-key

# Gemini AI
VITE_GEMINI_API_KEY=your-gemini-api-key

# Court Listener API
VITE_COURT_LISTENER_API_KEY=your-court-listener-api-key

# Elasticsearch
VITE_ELASTICSEARCH_URL=http://localhost:9200
EOF
    echo "⚠️  Please update .env file with your actual API keys before running the application."
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for Elasticsearch to be ready
echo "⏳ Waiting for Elasticsearch to be ready..."
until curl -s http://localhost:9200/_cluster/health > /dev/null; do
    echo "Waiting for Elasticsearch..."
    sleep 5
done

echo "✅ Elasticsearch is ready!"

# Check if all services are running
echo "🔍 Checking service status..."
docker-compose ps

echo "🎉 Deployment complete!"
echo ""
echo "📋 Service URLs:"
echo "  - Main App: http://localhost:8080"
echo "  - Elasticsearch: http://localhost:9200"
echo "  - Proxy Server: http://localhost:3001"
echo ""
echo "📚 Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - Update services: docker-compose pull && docker-compose up -d"

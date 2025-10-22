#!/bin/bash

# Lex AI Advisor - AWS Lightsail Deployment Script
# Optimized for faster deployment

echo "🚀 Deploying Lex AI Advisor to AWS Lightsail..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
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

# Proxy Server Configuration
VITE_PROXY_SERVER_URL=https://casecompass.samuelninsiima.com

# Elasticsearch
VITE_ELASTICSEARCH_URL=http://localhost:9200
EOF
    echo "⚠️  Please update .env file with your actual API keys before running the application."
    echo "   Edit the .env file and run this script again."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.lightsail.yml down 2>/dev/null || true

# Clean up unused Docker resources
echo "🧹 Cleaning up Docker resources..."
docker system prune -f

# Build and start services with optimized settings
echo "🔨 Building and starting services (this may take a few minutes)..."
docker-compose -f docker-compose.lightsail.yml up --build -d --no-deps

# Wait for Elasticsearch to be ready
echo "⏳ Waiting for Elasticsearch to be ready..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
        echo "✅ Elasticsearch is ready!"
        break
    fi
    
    echo "Waiting for Elasticsearch... (attempt $attempt/$max_attempts)"
    sleep 10
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Elasticsearch failed to start within expected time"
    echo "📋 Checking container logs..."
    docker-compose logs elasticsearch
    exit 1
fi

# Check if all services are running
echo "🔍 Checking service status..."
docker-compose -f docker-compose.lightsail.yml ps

# Show resource usage
echo "📊 Docker resource usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Service URLs:"
echo "  - Main App: http://$(curl -s ifconfig.me):8080"
echo "  - Elasticsearch: http://$(curl -s ifconfig.me):9200"
echo "  - Proxy Server: http://$(curl -s ifconfig.me):3001"
echo ""
echo "📚 Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - Update services: docker-compose pull && docker-compose up -d"
echo ""
echo "🔧 Troubleshooting:"
echo "  - Check logs: docker-compose logs [service-name]"
echo "  - Restart service: docker-compose restart [service-name]"
echo "  - Check resources: docker stats"

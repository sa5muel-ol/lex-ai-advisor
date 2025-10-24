#!/bin/bash

# juristinsight Deployment Script (Docker Compose v2)
# Works on Linux VM with Docker Engine 20.10+ and Compose plugin 2.x+

set -e  # Exit immediately on error

# Auto-detect environment
# If we're on a server/VM (not localhost), assume production
if [ -f "package.json" ]; then
    # Check if we're running on localhost/development machine
    if [[ "$HOSTNAME" == *"localhost"* ]] || [[ "$HOSTNAME" == *"MacBook"* ]] || [[ "$HOSTNAME" == *"DESKTOP"* ]]; then
        ENVIRONMENT="development"
        echo "💻 Detected local development environment"
    else
        ENVIRONMENT="production"
        echo "🚀 Detected production environment (VM/Server)"
    fi
else
    ENVIRONMENT="production"
    echo "🚀 Detected production environment"
fi

# Set URLs based on environment
if [ "$ENVIRONMENT" = "development" ]; then
    PROXY_URL="http://localhost:3001"
    ELASTICSEARCH_URL="http://localhost:9200"
else
    # Production - use current domain or fallback
    CURRENT_DOMAIN=${CURRENT_DOMAIN:-"juristinsight.com"}
    PROXY_URL="https://${CURRENT_DOMAIN}"
    ELASTICSEARCH_URL="https://${CURRENT_DOMAIN}/es"
fi

echo "🔧 Environment: $ENVIRONMENT"
echo "🌐 Proxy URL: $PROXY_URL"
echo "🔍 Elasticsearch URL: $ELASTICSEARCH_URL"

echo "🚀 Deploying juristinsight (service: app)..."

# -----------------------------------------------------
# 1️⃣  Check prerequisites
# -----------------------------------------------------

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose v2 plugin is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose v2 plugin not found."
    echo "👉 Install it with: sudo apt install docker-compose-plugin"
    exit 1
fi

# -----------------------------------------------------
# 2️⃣  Create .env file if it doesn't exist
# -----------------------------------------------------
if [ ! -f .env ]; then
    echo "📝 Creating .env file template..."
    cat > .env << EOF
# Environment Configuration
NODE_ENV=${ENVIRONMENT}

# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key

# Google Cloud Storage
VITE_GCS_BUCKET_NAME=lex-legal-documents-bucket
VITE_GOOGLE_CLOUD_API_KEY=your-gcs-api-key

# Gemini AI
VITE_GEMINI_API_KEY=your-gemini-api-key

# Court Listener API
VITE_COURT_LISTENER_API_KEY=your-court-listener-api-key

# Auto-detected URLs
VITE_PROXY_SERVER_URL=${PROXY_URL}
VITE_ELASTICSEARCH_URL=${ELASTICSEARCH_URL}
EOF
    echo "⚠️  .env file created with placeholder values."
    echo "🔧 To provide API keys, run: ./setup-production-env.sh"
    echo "✅ URLs auto-configured for ${ENVIRONMENT} environment:"
    echo "   🌐 Proxy: ${PROXY_URL}"
    echo "   🔍 Elasticsearch: ${ELASTICSEARCH_URL}"
else
    echo "📄 .env file already exists - using existing configuration"
fi

# -----------------------------------------------------
# 3️⃣  Stop and remove existing containers
# -----------------------------------------------------
echo "🧹 Stopping and removing existing containers..."
docker compose down --remove-orphans

# -----------------------------------------------------
# 4️⃣  Rebuild and start containers
# -----------------------------------------------------
echo "🔨 Building and starting 'app' service..."
docker compose up --build -d app

# -----------------------------------------------------
# 5️⃣  Wait for Elasticsearch (optional dependency)
# -----------------------------------------------------
if docker compose ps | grep -q "elasticsearch"; then
    echo "⏳ Waiting for Elasticsearch to be ready..."
    until curl -s http://localhost:9200/_cluster/health > /dev/null; do
        echo "🕒 Waiting for Elasticsearch..."
        sleep 5
    done
    echo "✅ Elasticsearch is ready!"
fi

# -----------------------------------------------------
# 6️⃣  Show running services
# -----------------------------------------------------
echo "🔍 Checking running services..."
docker compose ps

# -----------------------------------------------------
# ✅  Done
# -----------------------------------------------------
echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Service URLs:"
echo "  - Main App: http://localhost:8080"
echo "  - Elasticsearch: http://localhost:9200 (if enabled)"
echo ""
echo "📚 Useful commands:"
echo "  - View logs: docker compose logs -f app"
echo "  - Stop services: docker compose down"
echo "  - Restart services: docker compose restart app"
echo "  - Update services: docker compose pull && docker compose up -d app"
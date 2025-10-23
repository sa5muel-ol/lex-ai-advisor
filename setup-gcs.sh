#!/bin/bash

# Auto-detect environment
if [ -f "package.json" ] && grep -q '"dev"' package.json; then
    # Check if we're running in Docker
    if [ -f "/.dockerenv" ] || [ -n "$DOCKER_CONTAINER" ]; then
        ENVIRONMENT="production"
        echo "🐳 Detected Docker production environment"
    else
        ENVIRONMENT="development"
        echo "💻 Detected local development environment"
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

echo "🚀 LegalSearch AI - Google Cloud Storage Setup"
echo "=============================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Environment Configuration
NODE_ENV=${ENVIRONMENT}

# Supabase Configuration (Required)
VITE_SUPABASE_PROJECT_ID=your-supabase-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Google Cloud Storage Configuration (Required for GCS)
VITE_GCS_BUCKET_NAME=lex-legal-documents-bucket
VITE_GOOGLE_CLOUD_PROJECT_ID=sandstorm-309311
VITE_GOOGLE_CLOUD_API_KEY=AQ.Ab8RN6L8x0z87RI00m34akZMMxhem1L2FMY-u0j7FezyfYK1Iw

# AI Configuration (Required for AI features)
VITE_GEMINI_API_KEY=your-gemini-api-key

# Auto-detected URLs
VITE_PROXY_SERVER_URL=${PROXY_URL}
VITE_ELASTICSEARCH_URL=${ELASTICSEARCH_URL}
VITE_ELASTICSEARCH_USERNAME=
VITE_ELASTICSEARCH_PASSWORD=
EOF
    echo "✅ .env file created!"
    echo "🔧 Environment: ${ENVIRONMENT}"
    echo "🌐 Auto-detected URLs:"
    echo "   Proxy: ${PROXY_URL}"
    echo "   Elasticsearch: ${ELASTICSEARCH_URL}"
else
    echo "📄 .env file already exists"
fi

echo ""
echo "🔧 Next Steps:"
echo "1. Edit .env file with your actual credentials"
echo "2. Set up CORS for your GCS bucket:"
echo "   gsutil cors set cors.json gs://lex-legal-documents-bucket"
echo "3. Restart the app: npm run dev"
echo ""
echo "📚 For detailed setup instructions, see:"
echo "   - REAL_GCS_SETUP.md"
echo "   - GCS_INTEGRATION_GUIDE.md"
echo ""
echo "🎉 Your bucket 'lex-legal-documents-bucket' is ready to use!"

#!/bin/bash

# Production Environment Setup Script
# This script helps you securely set up environment variables on your VM

set -e

echo "🔐 Setting up production environment variables..."

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env file template
echo "📝 Creating .env file template..."
cat > .env << 'EOF'
# Environment Configuration
NODE_ENV=production

# API Keys - REPLACE WITH YOUR ACTUAL KEYS
VITE_GOOGLE_CLOUD_API_KEY=your_gcs_api_key_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key_here
VITE_GCS_BUCKET_NAME=lex-legal-documents-bucket
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_COURT_LISTENER_API_KEY=your_courtlistener_api_key_here

# Auto-detected URLs
VITE_PROXY_SERVER_URL=https://juristinsight.com
VITE_ELASTICSEARCH_URL=https://juristinsight.com/es
EOF

echo "✅ .env file created!"
echo ""
echo "🔧 Next steps:"
echo "1. Edit the .env file with your actual API keys:"
echo "   nano .env"
echo ""
echo "2. Replace the placeholder values with your real API keys:"
echo "   - VITE_GOOGLE_CLOUD_API_KEY=your_actual_gcs_key"
echo "   - VITE_SUPABASE_URL=your_actual_supabase_url"
echo "   - VITE_SUPABASE_PUBLISHABLE_KEY=your_actual_supabase_key"
echo "   - VITE_GEMINI_API_KEY=your_actual_gemini_key"
echo "   - VITE_COURT_LISTENER_API_KEY=your_actual_courtlistener_key"
echo ""
echo "3. Restart your Docker containers:"
echo "   docker-compose down"
echo "   docker-compose up -d --build"
echo ""
echo "⚠️  IMPORTANT: Never commit the .env file to git!"
echo "   The .env file is already in .gitignore"

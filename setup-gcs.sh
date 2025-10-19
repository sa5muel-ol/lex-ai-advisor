#!/bin/bash

echo "🚀 LegalSearch AI - Google Cloud Storage Setup"
echo "=============================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
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

# Elasticsearch Configuration (Optional)
VITE_ELASTICSEARCH_URL=https://casecompass.samuelninsiima.com/es
VITE_ELASTICSEARCH_USERNAME=
VITE_ELASTICSEARCH_PASSWORD=
EOF
    echo "✅ .env file created!"
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

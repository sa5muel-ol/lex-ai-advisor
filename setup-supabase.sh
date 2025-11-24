#!/bin/bash

echo "🔧 Supabase Configuration Setup"
echo "==============================="
echo ""
echo "Your Supabase Project ID: kwqoqtsfdxfwrsgbiarb"
echo "Your Supabase URL: https://kwqoqtsfdxfwrsgbiarb.supabase.co"
echo ""
echo "📝 Please create a .env file with the following content:"
echo ""
echo "# Supabase Configuration"
echo "VITE_SUPABASE_PROJECT_ID=kwqoqtsfdxfwrsgbiarb"
echo "VITE_SUPABASE_URL=https://kwqoqtsfdxfwrsgbiarb.supabase.co"
echo "VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key-here"
echo ""
echo "# Google Cloud Storage Configuration"
echo "VITE_GCS_BUCKET_NAME=lex-legal-documents-bucket"
echo "VITE_GOOGLE_CLOUD_PROJECT_ID=your-google-cloud-project-id"
echo "VITE_GOOGLE_CLOUD_API_KEY=your-google-cloud-api-key"
echo ""
echo "# Gemini AI Configuration"
echo "VITE_GEMINI_API_KEY=your-gemini-api-key-here"
echo ""
echo "🔑 To get your Supabase anon key:"
echo "1. Go to https://supabase.com/dashboard"
echo "2. Select your project: kwqoqtsfdxfwrsgbiarb"
echo "3. Go to Settings > API"
echo "4. Copy the 'anon public' key"
echo "5. Replace 'your-supabase-anon-key-here' with the actual key"
echo ""
echo "🚀 After creating the .env file, restart the dev server:"
echo "   pkill -f 'vite' && npm run dev"






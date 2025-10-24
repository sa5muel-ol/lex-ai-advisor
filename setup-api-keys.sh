#!/bin/bash

# Secure API Key Setup Script
# This script allows you to set API keys via environment variables
# Usage: API_KEY1=value1 API_KEY2=value2 ./setup-api-keys.sh

set -e

echo "🔐 Setting up API keys securely..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run ./deploy.sh first to create the template."
    exit 1
fi

# Create backup
cp .env .env.backup
echo "📋 Created backup: .env.backup"

# Function to update environment variable
update_env_var() {
    local var_name=$1
    local var_value=$2
    
    if [ -n "$var_value" ]; then
        # Use sed to replace the variable in .env file
        sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" .env
        echo "✅ Updated ${var_name}"
    else
        echo "⚠️  ${var_name} not provided, keeping existing value"
    fi
}

# Update API keys if provided
update_env_var "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL"
update_env_var "VITE_SUPABASE_PUBLISHABLE_KEY" "$VITE_SUPABASE_PUBLISHABLE_KEY"
update_env_var "VITE_GCS_BUCKET_NAME" "$VITE_GCS_BUCKET_NAME"
update_env_var "VITE_GOOGLE_CLOUD_API_KEY" "$VITE_GOOGLE_CLOUD_API_KEY"
update_env_var "VITE_GEMINI_API_KEY" "$VITE_GEMINI_API_KEY"
update_env_var "VITE_COURT_LISTENER_API_KEY" "$VITE_COURT_LISTENER_API_KEY"

echo ""
echo "🎉 API keys setup complete!"
echo "🔄 Restart your application to load the new environment variables:"
echo "   docker-compose down && docker-compose up -d --build"
echo ""
echo "🔍 To verify your keys are loaded:"
echo "   docker-compose logs app | grep -i 'api key'"

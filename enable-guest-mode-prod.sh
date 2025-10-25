#!/bin/bash

# Enable Guest Mode on Production Server
# This script updates the production .env file to enable guest mode

set -e

echo "🔧 Enabling Guest Mode on Production Server..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run ./deploy.sh first to create the environment file."
    exit 1
fi

# Check current guest mode status
if grep -q "VITE_GUEST_MODE_ENABLED=true" .env; then
    echo "✅ Guest mode is already enabled!"
    echo "🔍 Current status: ENABLED"
else
    echo "🔄 Enabling guest mode..."
    
    # Update the .env file to enable guest mode
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/VITE_GUEST_MODE_ENABLED=.*/VITE_GUEST_MODE_ENABLED=true/" .env
    else
        # Linux
        sed -i "s/VITE_GUEST_MODE_ENABLED=.*/VITE_GUEST_MODE_ENABLED=true/" .env
    fi
    
    echo "✅ Guest mode enabled successfully!"
fi

echo ""
echo "👥 Guest Mode Status:"
echo "   - Users can access the app without authentication"
echo "   - All features remain available (Supabase, GCP, AI)"
echo "   - Perfect for judges and demo purposes"
echo "   - Guest users will see '👥 Guest Mode' indicator"
echo ""
echo "🚀 To apply changes, restart the application:"
echo "   docker-compose down && docker-compose up -d"
echo ""
echo "📋 After restart, users will:"
echo "   1. See '👥 Guest Mode: Demo access enabled' on login page"
echo "   2. Be automatically logged in as guest user"
echo "   3. See '👥 Guest Mode' indicator in the header"
echo "   4. Have access to all features without authentication"


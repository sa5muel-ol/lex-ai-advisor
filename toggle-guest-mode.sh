#!/bin/bash

# Toggle Guest Mode Script for juristinsight
# This script enables/disables guest mode for demo access

set -e

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run ./deploy.sh first to create the environment file."
    exit 1
fi

# Check current guest mode status
if grep -q "VITE_GUEST_MODE_ENABLED=true" .env; then
    CURRENT_STATUS="enabled"
    NEW_STATUS="disabled"
    NEW_VALUE="false"
else
    CURRENT_STATUS="disabled"
    NEW_STATUS="enabled"
    NEW_VALUE="true"
fi

echo "🔍 Current guest mode status: $CURRENT_STATUS"
echo "🔄 Switching to: $NEW_STATUS"

# Update the .env file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/VITE_GUEST_MODE_ENABLED=.*/VITE_GUEST_MODE_ENABLED=$NEW_VALUE/" .env
else
    # Linux
    sed -i "s/VITE_GUEST_MODE_ENABLED=.*/VITE_GUEST_MODE_ENABLED=$NEW_VALUE/" .env
fi

echo "✅ Guest mode $NEW_STATUS successfully!"

if [ "$NEW_VALUE" = "true" ]; then
    echo ""
    echo "👥 Guest Mode ENABLED:"
    echo "   - Users can access the app without authentication"
    echo "   - All features remain available (Supabase, GCP, AI)"
    echo "   - Perfect for judges and demo purposes"
    echo "   - Guest users will see '👥 Guest Mode' indicator"
    echo ""
    echo "🚀 To apply changes, restart the application:"
    echo "   docker-compose down && docker-compose up -d"
else
    echo ""
    echo "🔒 Guest Mode DISABLED:"
    echo "   - Users must authenticate to access the app"
    echo "   - Normal authentication flow required"
    echo ""
    echo "🚀 To apply changes, restart the application:"
    echo "   docker-compose down && docker-compose up -d"
fi

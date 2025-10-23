#!/bin/bash

# Update production environment for juristinsight.com
echo "🔄 Updating production environment for juristinsight.com..."

# Update .env file on the server
if [ -f ".env" ]; then
    echo "📝 Updating .env file..."
    
    # Update VITE_PROXY_SERVER_URL
    sed -i 's|VITE_PROXY_SERVER_URL=.*|VITE_PROXY_SERVER_URL=https://juristinsight.com|g' .env
    
    # Update VITE_ELASTICSEARCH_URL
    sed -i 's|VITE_ELASTICSEARCH_URL=.*|VITE_ELASTICSEARCH_URL=https://juristinsight.com/es|g' .env
    
    echo "✅ .env file updated!"
else
    echo "⚠️  .env file not found. Please create it manually."
fi

# Restart services to pick up new environment variables
echo "🔄 Restarting services..."
docker-compose down
docker-compose up -d --build

echo "✅ Production environment updated for juristinsight.com!"
echo "🌐 Make sure your DNS points juristinsight.com to this server"
echo "🔒 Update SSL certificates for juristinsight.com"

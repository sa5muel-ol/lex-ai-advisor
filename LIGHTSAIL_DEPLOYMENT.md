# AWS Lightsail Deployment Guide

This guide walks you through deploying juristinsight on an AWS Lightsail VM.

## Prerequisites

- AWS Lightsail instance (Ubuntu 22.04 LTS recommended)
- Domain name pointing to your Lightsail instance IP
- SSH access to your Lightsail instance

## Step 1: Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required software
sudo apt install -y nginx docker.io docker-compose git nodejs npm

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (optional, to run docker without sudo)
sudo usermod -aG docker $USER
```

## Step 2: Clone and Setup Application

```bash
# Clone your repository
git clone https://github.com/yourusername/lex-ai-advisor.git
cd lex-ai-advisor

# Create .env file with your production environment variables
nano .env
```

Required environment variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_GCS_BUCKET_NAME=your_gcs_bucket_name
VITE_GOOGLE_CLOUD_API_KEY=your_gcs_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_COURT_LISTENER_API_KEY=your_court_listener_api_key
VITE_ELASTICSEARCH_URL=http://localhost:9200
VITE_PROXY_SERVER_URL=http://localhost:3001
VITE_GUEST_MODE_ENABLED=true
NODE_ENV=production
```

## Step 3: Build and Start Services

```bash
# Build Docker images
docker-compose build

# Start services (Elasticsearch, Proxy Server, App)
docker-compose up -d

# Check service status
docker-compose ps
docker-compose logs -f
```

## Step 4: Configure Nginx (Before SSL)

```bash
# Copy nginx configuration
sudo cp nginx.lightsail.conf /etc/nginx/sites-available/juristinsight

# Create symlink to enable site
sudo ln -s /etc/nginx/sites-available/juristinsight /etc/nginx/sites-enabled/

# Remove default nginx site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 5: Configure Firewall

```bash
# Allow HTTP traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

## Step 6: Verify Deployment

1. Check that all services are running:
   ```bash
   docker-compose ps
   curl http://localhost:8080  # App (mapped from container port 4173)
   curl http://localhost:3001  # Proxy server
   curl http://localhost:9200  # Elasticsearch
   ```

2. Test nginx:
   ```bash
   curl http://localhost/health
   ```

3. Visit your domain in a browser:
   ```
   http://juristinsight.com
   ```

## Step 7: Set Up SSL (After Initial Deployment)

Once everything is working on HTTP, set up SSL with Let's Encrypt:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d juristinsight.com -d www.juristinsight.com

# Certbot will automatically update your nginx config
# Test auto-renewal
sudo certbot renew --dry-run
```

After SSL is set up, Certbot will modify your nginx config to include HTTPS. You can then update `nginx.lightsail.conf` to include SSL configuration if needed.

## Troubleshooting

### Services not starting
```bash
# Check Docker logs
docker-compose logs app
docker-compose logs proxy-server
docker-compose logs elasticsearch

# Check if ports are in use
sudo netstat -tulpn | grep -E ':(4173|3001|9200|80)'
```

### Nginx errors
```bash
# Check nginx error logs
sudo tail -f /var/log/nginx/juristinsight-error.log

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Application not accessible
- Verify domain DNS is pointing to your Lightsail instance IP
- Check Lightsail firewall rules allow HTTP (port 80)
- Verify services are running: `docker-compose ps`
- Check nginx is running: `sudo systemctl status nginx`

## Maintenance

### Update Application
```bash
cd /path/to/lex-ai-advisor
git pull
docker-compose build
docker-compose up -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f proxy-server
docker-compose logs -f elasticsearch
```

### Restart Services
```bash
docker-compose restart
# Or restart specific service
docker-compose restart app
```

## Notes

- The nginx config proxies to `localhost:8080` for the app (Docker maps container port 4173 to host port 8080)
- Proxy server runs on `localhost:3001` (exposed from Docker container)
- Elasticsearch runs on `localhost:9200` (internal only, not exposed externally via nginx)
- All file uploads/downloads go through the proxy server to bypass CORS
- The app is served via Vite preview server running in Docker container


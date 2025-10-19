# AWS Lightsail Deployment Guide

## 🚀 Quick Setup for AWS Lightsail

### 1. Launch Lightsail Instance
- Choose **Ubuntu 20.04 LTS** or **Ubuntu 22.04 LTS**
- Select **$5/month** plan (1GB RAM, 1 vCPU) - minimum recommended
- Enable **Networking** tab and open ports: **80, 8080, 9200, 3001**

### 2. Connect to Instance
```bash
# Via Lightsail console or SSH
ssh ubuntu@your-lightsail-ip
```

### 3. Install Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply docker group changes
exit
```

### 4. Deploy Application
```bash
# Clone your repository
git clone https://github.com/your-username/lex-ai-advisor.git
cd lex-ai-advisor

# Configure environment
cp .env.example .env
nano .env  # Edit with your API keys

# Deploy with optimized script
./deploy-lightsail.sh
```

## 🔧 Optimizations for Lightsail

### Resource Limits
- **Elasticsearch**: 512MB RAM limit
- **App**: 256MB RAM limit  
- **Proxy**: 128MB RAM limit
- **Total**: ~1GB RAM usage

### Performance Tips
1. **Use SSD storage** for better I/O performance
2. **Enable swap** if needed: `sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`
3. **Monitor resources**: `docker stats`

## 📊 Monitoring Commands

```bash
# Check service status
docker-compose -f docker-compose.lightsail.yml ps

# View logs
docker-compose -f docker-compose.lightsail.yml logs -f

# Check resource usage
docker stats

# Restart services
docker-compose -f docker-compose.lightsail.yml restart
```

## 🌐 Access URLs

- **Main App**: `http://your-lightsail-ip:8080`
- **Elasticsearch**: `http://your-lightsail-ip:9200`
- **Proxy Server**: `http://your-lightsail-ip:3001`

## 🚨 Troubleshooting

### Out of Memory
```bash
# Check memory usage
free -h
docker stats

# Restart with more swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Slow Build
```bash
# Clean Docker cache
docker system prune -a -f

# Use build cache
docker-compose -f docker-compose.lightsail.yml build --no-cache
```

### Service Won't Start
```bash
# Check logs
docker-compose -f docker-compose.lightsail.yml logs [service-name]

# Restart specific service
docker-compose -f docker-compose.lightsail.yml restart [service-name]
```

## 💰 Cost Optimization

- **$5/month**: 1GB RAM, 1 vCPU (minimum)
- **$10/month**: 2GB RAM, 1 vCPU (recommended)
- **$20/month**: 4GB RAM, 2 vCPU (optimal)

## 🔒 Security

- **Firewall**: Only open necessary ports
- **SSH Keys**: Use key-based authentication
- **Updates**: Keep system updated
- **Monitoring**: Monitor resource usage

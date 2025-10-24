# 🔐 Secure Production Deployment Guide

## Environment Variables Security

### ✅ DO:
- Store API keys in `.env` file on the VM (not in repository)
- Use the `setup-production-env.sh` script to create secure environment files
- Keep `.env` in `.gitignore` (already configured)
- Use Docker environment variables for containerized services

### ❌ DON'T:
- Commit API keys to the repository
- Share API keys in chat/email
- Store API keys in public files
- Use hardcoded keys in source code

## Quick Setup for Evaluation Team

### 1. Run the Setup Script
```bash
# On your VM
./setup-production-env.sh
```

### 2. Edit Environment Variables
```bash
# Edit the .env file with actual API keys
nano .env
```

Replace these placeholder values:
```bash
VITE_GOOGLE_CLOUD_API_KEY=your_actual_gcs_api_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_actual_supabase_key
VITE_GEMINI_API_KEY=your_actual_gemini_api_key
VITE_COURT_LISTENER_API_KEY=your_actual_courtlistener_api_key
```

### 3. Deploy with Environment Variables
```bash
# Restart containers with new environment
docker-compose down
docker-compose up -d --build
```

## For Evaluation Team

### API Keys Needed:
1. **Gemini API Key** - For AI document analysis and summaries
2. **Court Listener API Key** - For legal document ingestion
3. **Google Cloud Storage API Key** - For document storage
4. **Supabase Credentials** - For database and authentication

### Environment File Location:
- **File**: `.env` (in project root on VM)
- **Access**: SSH into VM and edit with `nano .env`
- **Security**: File is not committed to repository

### Verification:
```bash
# Check if environment variables are loaded
docker-compose logs app | grep -i "api key"
```

## Security Best Practices

1. **Rotate API Keys** after evaluation period
2. **Monitor Usage** through respective API dashboards
3. **Use Least Privilege** - only necessary permissions
4. **Backup Environment** - keep `.env.backup` file
5. **Clean Up** - remove keys after evaluation

## Troubleshooting

### Environment Variables Not Loading:
```bash
# Check if .env file exists
ls -la .env

# Verify Docker is reading environment
docker-compose config
```

### API Key Issues:
```bash
# Check container logs
docker-compose logs app

# Test API connectivity
curl -H "Authorization: Bearer $VITE_GEMINI_API_KEY" https://generativelanguage.googleapis.com/v1beta/models
```

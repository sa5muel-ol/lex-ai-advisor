# Multi-stage build for React + Vite app

# 1) Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first (better caching)
COPY package.json package-lock.json* bun.lockb* ./
RUN npm ci || npm install

# Copy source
COPY . .

# Build
RUN npm run build

# 2) Production image using Nginx
FROM nginx:1.25-alpine AS runner

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]



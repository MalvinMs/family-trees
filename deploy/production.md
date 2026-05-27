# Kinova Production Stack Setup Guide

This guide describes the complete workflow to deploy the Kinova production backend stack onto a Virtual Private Server (VPS) and compile/deploy the Next.js frontend onto Cloudflare Pages.

---

## 🏗️ System Architecture Overview

In a production environment:
1. **Next.js Frontend**: Compiled as a static export and hosted globally on **Cloudflare Pages** (with edge-cached low latency CDN delivery).
2. **Laravel Backend Stack**: Managed via Docker Compose containing only the API, Queue Worker, Reverb WebSockets, Postgres, and Redis containers on the **VPS**.
3. **Nginx Reverse Proxy**: Acts as the SSL terminator, proxying HTTP requests to the Laravel API and Upgrading WebSocket connections to Reverb.

---

## 🔒 Part 1: Production VPS Backend Deployment

### 1. Prerequisites
Ensure your VPS is running Ubuntu 22.04 LTS (or similar) with Docker, Docker Compose, Nginx, and Certbot installed:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx
```

### 2. Clone the Repository
Clone the codebase into the target production web root:
```bash
sudo mkdir -p /var/www/family-trees
sudo chown -R $USER:$USER /var/www/family-trees
git clone https://github.com/MalvinMs/family-trees.git /var/www/family-trees
cd /var/www/family-trees
```

### 3. Configure Laravel Production Environment
Create the production environment file at `/var/www/family-trees/backend/.env`:
```env
APP_NAME=Kinova
APP_ENV=production
APP_KEY=base64:YOUR_GENERATE_APP_KEY_HERE
APP_DEBUG=false
APP_URL=https://api.yourdomain.com

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=kinova_production
DB_USERNAME=kinova_prod_user
DB_PASSWORD=YOUR_HIGH_SECURITY_DATABASE_PASSWORD_HERE

REDIS_HOST=redis
REDIS_PORT=6379

QUEUE_CONNECTION=redis

REVERB_APP_ID=876543
REVERB_APP_KEY=kinovaprodkey
REVERB_APP_SECRET=kinovaprodsecret
REVERB_HOST=reverb
REVERB_PORT=8080
REVERB_SCHEME=https

CORS_ALLOWED_ORIGINS=https://family.yourdomain.com
```

> [!IMPORTANT]
> Change the `APP_KEY`, `DB_PASSWORD`, and Reverb details with custom, randomly-generated high-security credentials before launching.

### 4. Configure CORS Security Best Practices
To ensure secure cross-origin requests from your Cloudflare Pages frontend to the Laravel API backend, configure the allowed origins explicitly:
* **Production**: Set `CORS_ALLOWED_ORIGINS=https://family.yourdomain.com` in your backend `.env` matching your custom frontend domain.
* **Security Rules**: Do not use `*` (wildcard `Access-Control-Allow-Origin`) in production when `supports_credentials => true` is active, as modern browsers strictly block session cookies and authorization headers on wildcard origins.

### 5. Spin Up the Backend Services
Launch the production containers using the `prod` compose orchestrator profile:
```bash
# Allow script execution
chmod +x dc
./dc prod up -d --build
```
This boots:
* `kinova_postgres` (relational database, isolated internally)
* `kinova_redis` (in-memory broker, isolated internally)
* `kinova_backend` (production PHP-FPM API server)
* `kinova_queue` (Laravel background async queue listener)
* `kinova_reverb` (Laravel WebSocket server)

### 6. Build Database Tables & Optimize Cache
Run production migrations and optimize the Laravel framework configuration files inside the container:
```bash
# Migrate database tables
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force

# Cache routes, configs, and events for maximum production speed
docker compose -f docker-compose.prod.yml exec backend php artisan optimize
```

### 7. Configure Nginx Reverse Proxy
Create a new Virtual Host configuration file:
```bash
sudo nano /etc/nginx/sites-available/kinova-api
```

Paste the following reverse-proxy virtual host layout:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Standard Laravel API Proxy
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Upgraded WebSockets Laravel Reverb Proxy
    location /app {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

Enable the site configuration and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/kinova-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Secure SSL Certificates with Let's Encrypt
Automatically procure and install Let's Encrypt SSL certificates:
```bash
sudo certbot --nginx -d api.yourdomain.com
```

---

## ⚡ Part 2: Cloudflare Pages Frontend Deployment

Deploying the Next.js static application on Cloudflare Pages guarantees low latency and global edge acceleration.

### 1. Set Up Static Exports Config
Ensure `/frontend/next.config.js` or `next.config.mjs` is configured to render static static-site builds (`output: 'export'`) with unoptimized images:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Required for Next.js static exports
  },
};
export default nextConfig;
```

### 2. Connect Your Git Repo to Cloudflare
1. Log into your **Cloudflare Dashboard**.
2. Go to **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
3. Select your repository containing the genealogy tree codebase.

### 3. Configure Pages Build Settings
Define these parameters during the connection wizard:
* **Project Name**: `kinova-genealogy`
* **Production Branch**: `main`
* **Framework Preset**: `Next.js (Static HTML Export)`
* **Build Command**: `npm run build`
* **Build Output Directory**: `frontend/out`
* **Root Directory**: `frontend`

### 4. Inject Production Environmental Variables
Navigate to your Cloudflare Pages project **Settings** -> **Environment Variables** and add:
* `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com` (Your secure VPS API domain)

### 5. Deploy
Click **Save and Deploy**. Cloudflare compiles your Next.js application into static files and serves them across their globally distributed CDN edges. You can easily bind a custom domain in the **Custom Domains** tab.

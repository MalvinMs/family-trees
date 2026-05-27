# Kinova Deployment & Setup Guide

This document provides a step-by-step walkthrough for spinning up the local development environment and deploying the production backend (VPS) and frontend (Cloudflare Pages).

---

## 💻 Local Development Setup

The development environment runs a full-stack containerized local environment including the Next.js frontend, Laravel API, PostgreSQL database, Redis queue, and Reverb WebSocket server.

### 1. Prerequisites
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) or Docker Engine (Linux).
- Verify docker compose command availability: `docker compose version`

### 2. Multi-Environment Orchestrator
We use the `./dc` tool (Bash) or `.\dc.ps1` (PowerShell on Windows) to orchestrate local compose files:

* **Start Dev Containers**:
  ```bash
  ./dc dev up -d --build
  ```
  *(PowerShell: `.\dc.ps1 dev up -d --build`)*

* **Automated Full Stack Spin-Up & Database Seeding**:
  ```bash
  ./rebuild-stack.sh
  ```

### 3. Verification Addresses
- **Next.js Frontend**: `http://localhost:3000`
- **Laravel Backend API**: `http://localhost:8000`
- **Reverb WebSockets Port**: `http://localhost:8080`
- **Seed User Login**: `admin@kinova.com` / `password`

---

## 🔒 Production Backend Deployment (VPS)

Production services are containerized to run only the core backend elements (`postgres`, `redis`, `backend`, `queue`, `reverb`) on a Virtual Private Server (VPS), securing internal database ports and proxying traffic via Nginx.

### 1. Clone & Set Up VPS Directory
Clone the repository to `/var/www/family-trees` on your VPS:
```bash
git clone https://github.com/your-username/family-trees.git /var/www/family-trees
cd /var/www/family-trees
```

### 2. Configure Production Environments
Create the Laravel production environmental settings file `/var/www/family-trees/backend/.env`:
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
DB_PASSWORD=SecureProductionPassword123

REDIS_HOST=redis
REDIS_PORT=6379

QUEUE_CONNECTION=redis

REVERB_APP_ID=123456
REVERB_APP_KEY=kinovakey
REVERB_APP_SECRET=kinovasecret
REVERB_HOST=reverb
REVERB_PORT=8080
REVERB_SCHEME=https
```

### 3. Spin Up Backend Stack
Launch the backend stack using the production composer profile:
```bash
./dc prod up -d --build
```
This launches only PostgreSQL (internal), Redis (internal), Laravel API, Queue Worker, and the Reverb WebSocket engine.

### 4. Database Setup & Optimizations
```bash
# Run migrations & seeders on production
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force

# Optimize Laravel bootstrap caches
docker compose -f docker-compose.prod.yml exec backend php artisan optimize
```

### 5. Nginx Reverse Proxy Setup
Install Nginx and configure secure reverse proxies for your API and WebSockets:
```nginx
# /etc/nginx/sites-available/kinova-api
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Laravel Reverb WebSocket proxy
    location /app {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 60s;
    }
}
```
Symlink to active sites and secure SSL via Certbot:
```bash
ln -s /etc/nginx/sites-available/kinova-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d api.yourdomain.com
```

---

## ⚡ Cloudflare Pages Frontend Deployment

The Next.js frontend is deployed on Cloudflare Pages to benefit from low-latency global CDN edge caching.

### 1. Prerequisites
- Create a [Cloudflare Dashboard](https://dash.cloudflare.com/) account.
- Push your frontend workspace changes to a Git provider (GitHub / GitLab).

### 2. Configure Next.js Build Target
Ensure that the Next.js frontend is configured for a static export build if utilizing Cloudflare standard Pages.
In `/frontend/next.config.js` or `next.config.mjs`, add `output: 'export'`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Required for static exports
  },
};
export default nextConfig;
```

### 3. Connect to Cloudflare Pages
1. In the Cloudflare Dashboard, navigate to **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
2. Select your repository containing the genealogy tree codebase.
3. Configure build variables:
   - **Project Name**: `kinova-genealogy`
   - **Production Branch**: `main`
   - **Framework Preset**: `Next.js (Static HTML Export)`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `frontend/out`
   - **Root Directory**: `frontend`

### 4. Environmental Variables
Inside **Settings** -> **Environment Variables** in the Cloudflare project, add the production backend API base URL:
- `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com`

### 5. Deploy & Bind Custom Domain
Click **Save and Deploy**. Cloudflare compiles your Next.js application, caches static chunks at the edge, and provides an active URL like `https://kinova-genealogy.pages.dev`. You can link a custom domain (e.g., `https://family.yourdomain.com`) directly in the CF custom domains tab.

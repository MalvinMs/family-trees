#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "====================================================================="
echo " Starting Kinova Production Deployment"
echo "====================================================================="

# 1. Pull latest changes from git
echo ">>> Pulling latest changes from main branch..."
git pull origin main

# Check if production env file exists, warn if not
if [ ! -f .env ]; then
    echo "ERROR: .env file is missing in the production root directory!"
    echo "Please copy .env.prod.example to .env and configure all variables before continuing."
    exit 1
fi

# 2. Build images without cache
echo ">>> Building production Docker images (no-cache)..."
docker compose -f docker-compose.prod.yml build --no-cache

# 3. Start postgres and redis dependencies first to ensure health checks pass
echo ">>> Starting database and cache services..."
docker compose -f docker-compose.prod.yml up -d postgres redis

# Wait for PostgreSQL to be healthy
echo ">>> Waiting for PostgreSQL database to be healthy..."
until [ "$(docker inspect -f '{{.State.Health.Status}}' kinova_postgres 2>/dev/null)" == "healthy" ]; do
    printf '.'
    sleep 2
done
echo " PostgreSQL is healthy!"

# Start the backend container initially so we can execute commands
echo ">>> Starting backend service..."
docker compose -f docker-compose.prod.yml up -d backend

# 4. Runs migrations inside the backend container
echo ">>> Running database migrations..."
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force

# 5. Caches config, routes, and views
echo ">>> Caching application configuration, routes, and views..."
docker compose -f docker-compose.prod.yml exec backend php artisan optimize

# 6. Restarts the backend services gracefully (backend, queue, reverb)
echo ">>> Restarting backend services gracefully..."
docker compose -f docker-compose.prod.yml up -d --force-recreate backend queue reverb

# 7. Cleans up dangling images
echo ">>> Pruning dangling docker images..."
docker image prune -f

echo "====================================================================="
echo " Kinova Production Deployment Completed Successfully! 🎉"
echo "====================================================================="

#!/bin/bash
echo "========================================================"
echo "  Kinova Family Tree - Rebuilding and Seeding Stack...  "
echo "========================================================"
echo ""

echo "[1/5] Stopping existing containers..."
docker compose -f docker-compose.dev.yml down

echo "[2/5] Building and launching containers..."
docker compose -f docker-compose.dev.yml up -d --build

echo "[3/5] Waiting for database to be ready..."
sleep 5

echo "[4/5] Running fresh migrations and seeders..."
docker compose -f docker-compose.dev.yml exec backend php artisan migrate:fresh --seed

echo "[5/5] Refreshing and caching Laravel framework bootstrap..."
docker compose -f docker-compose.dev.yml exec backend php artisan optimize:clear
docker compose -f docker-compose.dev.yml exec backend php artisan optimize

echo ""
echo "========================================================"
echo "  Kinova Stack is Rebuilt, Cleaned, and Cached!"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "========================================================"

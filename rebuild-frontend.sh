#!/bin/bash
echo "========================================================"
echo "  Kinova Family Tree - Rebuilding Frontend Container... "
echo "========================================================"
echo ""

echo "[1/2] Building and launching frontend service..."
docker compose -f docker-compose.dev.yml up -d --build frontend

echo ""
echo "========================================================"
echo "  Frontend Container Rebuilt Successfully!"
echo "  Frontend: http://localhost:3000"
echo "========================================================"

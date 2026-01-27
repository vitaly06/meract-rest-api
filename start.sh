#!/bin/bash
# MERACT REST API - Quick Start Script for Linux

echo "========================================"
echo "  MERACT REST API - QUICK START"
echo "========================================"
echo ""

# Переход в директорию скрипта
cd "$(dirname "$0")"

# Проверка, что Docker запущен
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Проверка конфликта с локальным PostgreSQL
echo "[0/5] Checking for PostgreSQL conflicts..."
if sudo systemctl is-active --quiet postgresql 2>/dev/null; then
    echo "⚠️  WARNING: Local PostgreSQL is running on port 5432"
    echo "   This may conflict with Docker container."
    read -p "   Stop local PostgreSQL? (Y/n): " stop_pg
    if [[ ! "$stop_pg" =~ ^[Nn]$ ]]; then
        sudo systemctl stop postgresql
        echo "✅ Local PostgreSQL stopped"
    fi
fi

echo ""
echo "[1/5] Stopping and cleaning old containers..."
docker compose down -v 2>/dev/null
docker volume rm meract-rest-api_postgres_data -f 2>/dev/null

echo ""
echo "[2/5] Building and starting containers..."
docker compose up -d --build

echo ""
echo "[3/5] Waiting for database initialization (30 seconds)..."
sleep 30

echo ""
echo "[4/5] Checking container status..."
docker compose ps

echo ""
echo "[5/5] Checking application logs..."
sleep 5

# Проверка логов приложения
if docker compose logs app --tail 20 2>&1 | grep -q "Database connected successfully"; then
    echo "✅ Database connection successful!"
elif docker compose logs app --tail 20 2>&1 | grep -q "P1000\|authentication failed"; then
    echo "⚠️  Warning: Database authentication issue detected"
    echo "   Retrying in 10 seconds..."
    sleep 10
    docker compose restart app
else
    echo "ℹ️  Application is starting..."
fi

echo ""
echo "========================================"
echo "  SERVICES STARTED!"
echo "========================================"
echo ""
echo "📍 API:         http://localhost:3000"
echo "📚 Swagger UI:  http://localhost:3000/docs"
echo "🗄️  PostgreSQL:  localhost:5433"
echo "   User:        postgres"
echo "   Password:    postgres"
echo "   Database:    Meract"
echo ""
echo "📊 Useful commands:"
echo "   View logs:       docker compose logs -f"
echo "   View app logs:   docker compose logs -f app"
echo "   View db logs:    docker compose logs -f db"
echo "   Stop services:   docker compose down"
echo "   Restart app:     docker compose restart app"
echo ""

# Спросить, открыть ли Swagger
read -p "Open Swagger UI in browser? (Y/n): " open_swagger
if [[ ! "$open_swagger" =~ ^[Nn]$ ]]; then
    sleep 3
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:3000/docs" &
    elif command -v gnome-open > /dev/null; then
        gnome-open "http://localhost:3000/docs" &
    else
        echo "Please open http://localhost:3000/docs in your browser"
    fi
fi

echo ""
echo "Press Enter to view live logs (Ctrl+C to exit)..."
read

docker compose logs -f

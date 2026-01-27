#!/usr/bin/env pwsh
# MERACT REST API - Quick Start Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MERACT REST API - QUICK START" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Переход в директорию проекта
$projectPath = "c:\Users\User\Desktop\projects\Meract\meract-rest-api"
Set-Location $projectPath

Write-Host "[1/5] Stopping and cleaning old containers..." -ForegroundColor Yellow
docker compose down -v 2>$null
docker volume rm meract-rest-api_postgres_data -f 2>$null

Write-Host ""
Write-Host "[2/5] Building and starting containers..." -ForegroundColor Yellow
docker compose up -d --build

Write-Host ""
Write-Host "[3/5] Waiting for database initialization (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "[4/5] Checking container status..." -ForegroundColor Yellow
docker compose ps

Write-Host ""
Write-Host "[5/5] Checking application logs..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Проверка логов приложения
$appLogs = docker compose logs app --tail 20 2>&1
if ($appLogs -match "Database connected successfully") {
    Write-Host "✅ Database connection successful!" -ForegroundColor Green
} elseif ($appLogs -match "P1000|authentication failed") {
    Write-Host "⚠️  Warning: Database authentication issue detected" -ForegroundColor Red
    Write-Host "   Retrying in 10 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    docker compose restart app
} else {
    Write-Host "ℹ️  Application is starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SERVICES STARTED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📍 API:         " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host "📚 Swagger UI:  " -NoNewline; Write-Host "http://localhost:3000/docs" -ForegroundColor Cyan
Write-Host "🗄️  PostgreSQL:  " -NoNewline; Write-Host "localhost:5433" -ForegroundColor Cyan
Write-Host "   User:        postgres"
Write-Host "   Password:    postgres"
Write-Host "   Database:    Meract"
Write-Host ""
Write-Host "📊 Useful commands:" -ForegroundColor Yellow
Write-Host "   View logs:       docker compose logs -f"
Write-Host "   View app logs:   docker compose logs -f app"
Write-Host "   View db logs:    docker compose logs -f db"
Write-Host "   Stop services:   docker compose down"
Write-Host "   Restart app:     docker compose restart app"
Write-Host ""

# Спросить, открыть ли Swagger
$openSwagger = Read-Host "Open Swagger UI in browser? (Y/n)"
if ($openSwagger -ne "n" -and $openSwagger -ne "N") {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3000/docs"
}

Write-Host ""
Write-Host "Press any key to view live logs (Ctrl+C to exit)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

docker compose logs -f

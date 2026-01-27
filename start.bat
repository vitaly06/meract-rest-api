@echo off
echo ========================================
echo   MERACT REST API - QUICK START
echo ========================================
echo.

echo [1/4] Stopping and cleaning old containers...
docker compose down -v
docker volume rm meract-rest-api_postgres_data -f 2>nul

echo.
echo [2/4] Building and starting containers...
docker compose up -d --build

echo.
echo [3/4] Waiting for services to start (30 seconds)...
timeout /t 30 /nobreak >nul

echo.
echo [4/4] Checking status...
docker compose ps

echo.
echo ========================================
echo   SERVICES STARTED!
echo ========================================
echo.
echo API:         http://localhost:3000
echo Swagger UI:  http://localhost:3000/docs
echo PostgreSQL:  localhost:5433
echo.
echo To view logs: docker compose logs -f
echo To stop:      docker compose down
echo.
pause

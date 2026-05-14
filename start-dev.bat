@echo off
setlocal
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║         Opal Perfumes — Local Dev Stack              ║
echo ╚══════════════════════════════════════════════════════╝
echo.

:: ── 1. Start Docker services ──────────────────────────────────────────────────
echo [1/4] Building and starting Docker services (MongoDB + PHP API)...
docker compose up -d --build
if errorlevel 1 (
    echo ERROR: Docker compose failed. Make sure Docker Desktop is running.
    pause
    exit /b 1
)

:: ── 2. Wait for API to be ready ───────────────────────────────────────────────
echo.
echo [2/4] Waiting for API to be ready (up to 60s)...
set ATTEMPTS=0
:wait_loop
set /a ATTEMPTS+=1
if %ATTEMPTS% gtr 20 (
    echo WARNING: API may not be ready yet. Continuing anyway...
    goto seed
)
timeout /t 3 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:8000/api/categories >tmp_status.txt 2>nul
set /p STATUS=<tmp_status.txt
del tmp_status.txt >nul 2>&1
if "%STATUS%"=="200" goto ready
if "%STATUS%"=="404" goto ready
echo   Attempt %ATTEMPTS%/20 — waiting...
goto wait_loop

:ready
echo   API is up!

:: ── 3. Seed database ──────────────────────────────────────────────────────────
:seed
echo.
echo [3/4] Seeding database (safe — skips existing data)...
docker compose exec -T api php seed.php
echo.

:: ── 4. Start React apps ───────────────────────────────────────────────────────
echo [4/4] Starting React apps...
start "Opal Store  :5173" cmd /k "cd /d %~dp0opal-store && npm run dev"
timeout /t 2 /nobreak >nul
start "Opal Admin  :5174" cmd /k "cd /d %~dp0opal-admin && npm run dev"

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║  All services started!                               ║
echo ║                                                      ║
echo ║  Store  →  http://localhost:5173                     ║
echo ║  Admin  →  http://localhost:5174                     ║
echo ║  API    →  http://localhost:8000/api                 ║
echo ║  Mongo  →  mongodb://localhost:27017                 ║
echo ║                                                      ║
echo ║  Admin login:                                        ║
echo ║    Email:    admin@opalperfumes.com                  ║
echo ║    Password: Admin@1234                              ║
echo ╚══════════════════════════════════════════════════════╝
echo.
pause

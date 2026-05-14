@echo off
cd /d "%~dp0"
echo Stopping Docker services...
docker compose down
echo Done.
pause

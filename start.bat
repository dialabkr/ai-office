@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || ( echo [!] Node.js 18+ is required: https://nodejs.org & pause & exit /b 1 )
start "" http://127.0.0.1:4310/
node server.js
pause

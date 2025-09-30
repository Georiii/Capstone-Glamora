@echo off
echo Starting Admin Dashboard...
echo.

REM Kill any existing servers
taskkill /f /im "Live Server.exe" 2>nul
taskkill /f /im node.exe 2>nul

REM Start server from admin-side
cd /d "%~dp0\admin-side"
start /min npx http-server . -p 5500

REM Wait and open login page
timeout /t 2 /nobreak >nul
start http://127.0.0.1:5500/login.html

echo.
echo ✅ Admin Dashboard started!
echo 🌐 URL: http://127.0.0.1:5500/login.html
echo 🔐 Login: admin / admin123
echo.
pause

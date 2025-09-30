@echo off
echo Starting Glamora Admin Dashboard...
echo.

REM Kill any existing servers
taskkill /f /im "Live Server.exe" 2>nul
taskkill /f /im node.exe 2>nul

REM Change to admin-side directory
cd /d "%~dp0\admin-side"

REM Start Node.js server
echo Starting server from admin-side directory...
start /min npx http-server . -p 5500

REM Wait for server to start
timeout /t 3 /nobreak >nul

REM Open the login page
echo Opening admin login page...
start http://127.0.0.1:5500/login.html

echo.
echo ✅ Admin server started successfully!
echo 🌐 URL: http://127.0.0.1:5500/login.html
echo 🔐 Login: admin / admin123
echo.
echo Press any key to close this window...
pause >nul

@echo off
echo Starting Glamora Admin Dashboard directly...
echo.

REM Kill any existing Python processes on port 5500
netstat -ano | findstr :5500 >nul
if %errorlevel% == 0 (
    echo Stopping existing server on port 5500...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5500') do taskkill /f /pid %%a >nul 2>&1
)

REM Change to admin-side directory
cd /d "%~dp0\admin-side"

REM Start Python server
echo Starting server from admin-side directory...
start /min python -m http.server 5500

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


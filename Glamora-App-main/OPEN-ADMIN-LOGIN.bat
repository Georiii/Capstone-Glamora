@echo off
echo Opening Glamora Admin Login Page...
echo.

REM Start Python server in admin-side directory
cd /d "%~dp0\admin-side"
start python -m http.server 5500

REM Wait a moment for server to start
timeout /t 2 /nobreak >nul

REM Open the login page in default browser
start http://127.0.0.1:5500/login.html

echo.
echo Admin server started on port 5500
echo Login page opened in your browser
echo.
echo Login credentials:
echo Username: admin
echo Password: admin123
echo.
echo Press any key to close this window...
pause >nul


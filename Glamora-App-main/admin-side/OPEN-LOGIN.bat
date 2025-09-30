@echo off
echo Starting Glamora Admin Login...
echo.

REM Start Python server
start python -m http.server 5500

REM Wait for server to start
timeout /t 2 /nobreak >nul

REM Open login page
start http://127.0.0.1:5500/login.html

echo.
echo Server started! Login page should open automatically.
echo If not, go to: http://127.0.0.1:5500/login.html
echo.
echo Login: admin / admin123
echo.
pause


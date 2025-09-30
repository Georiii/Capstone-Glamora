@echo off
echo Starting Glamora Admin Dashboard...
cd /d "%~dp0"
echo Current directory: %CD%
echo Starting HTTP server on port 5500...
echo.
echo After server starts, open your browser to: http://127.0.0.1:5500/login.html
echo Press Ctrl+C to stop the server.
echo.
python -m http.server 5500
pause
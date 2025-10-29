@echo off
echo =========================================
echo   GLAMORA MARKETPLACE - HTTP START
echo =========================================
echo.
echo This will start the app with HTTP only
echo to prevent HTTPS auto-upgrade issues
echo.
echo Press Ctrl+C to stop
echo.

cd GlamoraApp
call npm run start:http

pause



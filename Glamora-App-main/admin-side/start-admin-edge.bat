@echo off
echo Starting Glamora Admin Dashboard in Microsoft Edge...
echo Opening admin dashboard...

REM Get current directory
set CURRENT_DIR=%~dp0
set CURRENT_DIR=%CURRENT_DIR:~0,-1%

REM Open the admin dashboard directly in Microsoft Edge
start msedge "file:///%CURRENT_DIR%/login.html"

echo Admin dashboard opened in Microsoft Edge!
echo.
echo You can also access other pages directly:
echo - Content Moderation: file:///%CURRENT_DIR%/content-moderation.html
echo - Analytics: file:///%CURRENT_DIR%/analytics.html
echo - User Management: file:///%CURRENT_DIR%/user-management.html
echo.
pause

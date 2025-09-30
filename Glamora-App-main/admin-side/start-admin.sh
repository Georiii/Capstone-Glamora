#!/bin/bash

echo "Starting Glamora Admin Dashboard..."
echo ""
echo "Opening admin dashboard in your default browser..."
echo ""
echo "Default login credentials:"
echo "Username: admin"
echo "Password: admin123"
echo ""
echo "If the page doesn't open automatically, navigate to:"
echo "http://localhost:8080/login.html"
echo ""
echo "Available pages:"
echo "- Login: http://localhost:8080/login.html"
echo "- Analytics: http://localhost:8080/analytics.html"
echo "- User Management: http://localhost:8080/user-management.html"
echo "- Content Moderation: http://localhost:8080/content-moderation.html"
echo ""

# Try to open browser (works on macOS and Linux)
if command -v open &> /dev/null; then
    open http://localhost:8080/login.html
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8080/login.html
fi

# Start the server
npx http-server . -p 8080

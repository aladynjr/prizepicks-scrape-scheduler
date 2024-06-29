@echo off
echo Running Node.js Script for Fetching Projections and Updating Google Sheets...
echo.

REM Check if Node.js is installed
node -v >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed. Please download and install Node.js from https://nodejs.org/
    pause
    exit /b
)

REM Check if node_modules directory exists
if not exist node_modules (
    echo Installing npm dependencies...
    npm install
    echo.
)

REM Run the Node.js script
node main.js

echo.
echo Script execution completed.
pause

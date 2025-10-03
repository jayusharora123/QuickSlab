@echo off
REM Simple script to start the PSA API server

cd /d "%~dp0"

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js not found in PATH. Trying default installation location...
    set "PATH=%PATH%;C:\Program Files\nodejs"
)

REM Check if .env file exists
if not exist ".env" (
    echo Creating .env file...
    echo PSA_API_KEY=your-api-key-here > .env
    echo.
    echo ⚠️  IMPORTANT: Edit the .env file and add your actual PSA API key!
    echo    Open .env file and replace 'your-api-key-here' with your real API key
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install dependencies. Please install Node.js first.
        pause
        exit /b 1
    )
)

echo Starting PSA API Proxy Server...
echo Server will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo To restart: just run this batch file again
echo.

REM Start the server and keep the window open
node server.js

REM If server stops, keep window open
echo.
echo Server stopped. Press any key to close this window.
pause
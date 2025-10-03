@echo off
echo 🔧 PSA API Setup Script
echo =====================

cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo.
    echo 📥 Please install Node.js first:
    echo    1. Go to https://nodejs.org
    echo    2. Download the LTS version
    echo    3. Run the installer
    echo    4. Restart this script
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Install dependencies
echo.
echo 📦 Installing dependencies...
npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully!
echo.
echo 🚀 Setup complete! 
echo.
echo 💡 To start the server, just double-click: start-server.bat
echo    Or run: npm start
echo.
echo 📝 Your API key is already configured in the .env file
echo.
pause
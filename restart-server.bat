@echo off
echo 🔄 Restarting PSA API Server...

cd /d "%~dp0"

REM Kill any existing node processes
taskkill /f /im node.exe >nul 2>nul

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js not found in PATH. Adding default location...
    set "PATH=%PATH%;C:\Program Files\nodejs"
)

echo ✅ Starting server...
echo.
node server.js

echo.
echo Server stopped. Press any key to close.
pause
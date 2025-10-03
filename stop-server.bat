@echo off
echo 🛑 Stopping PSA API Server...

cd /d "%~dp0"

REM Kill any existing node processes
taskkill /f /im node.exe >nul 2>nul

if %ERRORLEVEL% EQU 0 (
    echo ✅ Server stopped successfully
) else (
    echo ℹ️  No server was running
)

echo.
pause
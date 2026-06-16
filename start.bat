@echo off
title Pulse
cd /d "%~dp0"

:: Check if setup has been run
if not exist .env.local (
    echo.
    echo  [!] Pulse hasn't been set up yet.
    echo.
    echo  Please run setup.bat first.
    echo.
    pause
    exit /b 1
)

:: Check that .env.local isn't just the template
findstr /c:"YOUR_KEY_HERE" .env.local >nul 2>&1
if not errorlevel 1 (
    echo.
    echo  [!] Pulse setup is not complete.
    echo.
    echo  Please run setup.bat to finish configuring Pulse.
    echo.
    pause
    exit /b 1
)

echo.
echo  Starting Pulse...
echo  Your browser will open automatically.
echo.
echo  To stop Pulse, close this window.
echo.

:: Open browser after 3 seconds
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

npm run dev

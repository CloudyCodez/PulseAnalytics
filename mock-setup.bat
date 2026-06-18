@echo off

:: ============================================================
:: Force relaunch inside a persistent cmd /k window
:: ============================================================
if "%PULSE_MOCK_RELAUNCHED%"=="" (
    set PULSE_MOCK_RELAUNCHED=1
    cmd /k ""%~f0""
    exit
)

cd /d "%~dp0"
setlocal enabledelayedexpansion
title Pulse -- Mock Setup (Local Test Mode)

cls
echo.
echo   ____  _   _ _     ____  _____
echo  ^|  _ \^| ^| ^| ^| ^|   / ___^|^| ____^|
echo  ^| ^|_) ^| ^| ^| ^| ^|   \___ \^|  _^|
echo  ^|  __/^| ^|_^| ^| ^|___ ___) ^| ^|___
echo  ^|_^|    \___/^|_____^|____/^|_____^|
echo.
echo  -----------------------------------------
echo   Local Test Mode -- No accounts needed
echo  -----------------------------------------
echo.
echo  This sets up a fully working Pulse instance
echo  on your computer using mock auth and local data.
echo.
echo  No Clerk. No Supabase. No Stripe. No API keys.
echo  Everything runs locally and privately.
echo.
echo  Press any key to begin...
pause >nul

:: ============================================================
:: STEP 0: CHECK NODE + NPM
:: ============================================================
echo.
echo  ==========================================
echo   STEP 0 -- Checking your computer
echo  ==========================================
echo.

echo  Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo  [!] Node.js is not installed.
    echo  Go to https://nodejs.org and install the LTS version.
    pause >nul
    goto :eof
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js !NODE_VER! is installed.

echo  Checking for npm...
for /f "tokens=*" %%n in ('npm --version 2^>nul') do set NPM_VER=%%n
if "!NPM_VER!"=="" (
    echo  [!] npm not found. Reinstall Node.js from nodejs.org
    pause >nul
    goto :eof
)
echo  [OK] npm !NPM_VER! is ready.
echo.
echo  Press any key to continue...
pause >nul

:: ============================================================
:: STEP 1: INSTALL PACKAGES
:: ============================================================
echo.
echo  ==========================================
echo   STEP 1 -- Installing Pulse
echo  ==========================================
echo.

echo  Installing packages (this may take a minute)...
echo.
call npm install
if errorlevel 1 (
    echo  [!] npm install failed. Check your internet connection.
    pause >nul
    goto :eof
)
echo.
echo  [OK] Pulse installed successfully.
echo.
echo  Press any key to continue...
pause >nul

:: ============================================================
:: STEP 2: CHECK / INSTALL PULSE AI
:: ============================================================
echo.
echo  ==========================================
echo   STEP 2 -- Installing Pulse AI
echo  ==========================================
echo.
echo  Pulse AI runs entirely on your computer.
echo  No internet required after this step.
echo.

echo  Checking if Pulse AI engine is already installed...
ollama --version >nul 2>&1
if not errorlevel 1 (
    echo  [OK] Pulse AI engine already installed.
    goto :check_model
)

echo  Downloading Pulse AI engine (one-time only)...
set OLLAMA_INSTALLER=%TEMP%\pulse-ai-setup.exe
curl -L -o "!OLLAMA_INSTALLER!" "https://ollama.com/download/OllamaSetup.exe" --progress-bar
if errorlevel 1 (
    echo  [!] Could not download Pulse AI. Check your internet connection.
    pause >nul
    goto :eof
)
echo  Installing Pulse AI engine...
"!OLLAMA_INSTALLER!" /S
timeout /t 8 /nobreak >nul

:check_model
echo  Checking if Pulse AI model is ready...
ollama list 2>nul | findstr /i "llama3.1" >nul
if not errorlevel 1 (
    echo  [OK] Pulse AI model already loaded.
    goto :ai_done
)

echo  Loading Pulse AI model (about 4.7 GB -- one time only)...
ollama pull llama3.1
if errorlevel 1 (
    echo  [!] Could not load Pulse AI model. Check your internet.
    pause >nul
    goto :eof
)

:ai_done
echo  [OK] Pulse AI is ready.
echo.
echo  Press any key to continue...
pause >nul

:: ============================================================
:: STEP 3: WRITE MOCK .env.local
:: ============================================================
echo.
echo  ==========================================
echo   STEP 3 -- Setting up local configuration
echo  ==========================================
echo.

echo  Generating encryption key...
for /f "tokens=*" %%k in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set ENCRYPTION_KEY=%%k

echo  Writing mock configuration...

:: ── SAFETY CHECK: don't overwrite real keys ───────────────────────────────
if exist .env.local (
    findstr /c:"pk_live_" .env.local >nul 2>&1
    if not errorlevel 1 (
        echo.
        echo  [!] SAFETY STOP: .env.local already contains live production keys.
        echo      Mock setup would overwrite them. Aborting to protect your data.
        echo.
        echo      If you really want mock mode, rename .env.local first.
        echo.
        pause >nul
        goto :eof
    )
)

(
echo NEXT_PUBLIC_MOCK_MODE=true
echo NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_mock_local_key
echo CLERK_SECRET_KEY=sk_test_mock_local_key
echo CLERK_WEBHOOK_SECRET=whsec_mock
echo NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
echo NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
echo NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
echo NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
echo NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=mock_anon_key
echo SUPABASE_SERVICE_ROLE_KEY=mock_service_key
echo NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_mock
echo STRIPE_SECRET_KEY=sk_test_mock
echo STRIPE_WEBHOOK_SECRET=whsec_mock
echo STRIPE_PRICE_STARTER=price_mock_starter
echo STRIPE_PRICE_GROWTH=price_mock_growth
echo STRIPE_PRICE_AGENCY=price_mock_agency
echo PULSE_AI_URL=http://localhost:11434
echo PULSE_AI_MODEL=llama3.1
echo RESEND_API_KEY=re_mock
echo RESEND_FROM_EMAIL=reports@pulse.local
echo INNGEST_EVENT_KEY=mock_event_key
echo INNGEST_SIGNING_KEY=mock_signing_key
echo GOOGLE_CLIENT_ID=
echo GOOGLE_CLIENT_SECRET=
echo GOOGLE_DEVELOPER_TOKEN=
echo NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
echo META_APP_ID=
echo META_APP_SECRET=
echo SHOPIFY_API_KEY=
echo SHOPIFY_API_SECRET=
echo NEXT_PUBLIC_APP_URL=http://localhost:3000
echo ENCRYPTION_KEY=!ENCRYPTION_KEY!
) > .env.local

echo  [OK] Mock configuration written.
echo.
echo  Press any key to continue...
pause >nul

:: ============================================================
:: STEP 4: FIX NEXT CONFIG + WRITE CLERK-FREE MIDDLEWARE
:: ============================================================
echo.
echo  ==========================================
echo   STEP 4 -- Enabling mock auth
echo  ==========================================
echo.

:: Fix next.config.ts -> next.config.js (Next 14 doesn't support .ts config)
if exist next.config.ts (
    echo  Fixing Next.js config format...
    node -e "var fs=require('fs');var c=fs.readFileSync('next.config.ts','utf8');c=c.replace('import type { NextConfig } from \"next\";','').replace('const nextConfig: NextConfig = {','/** @type {import(\"next\").NextConfig} */\nconst nextConfig = {').replace('export default nextConfig;','module.exports = nextConfig;').trim();fs.writeFileSync('next.config.js',c);"
    del next.config.ts >nul 2>&1
    echo  [OK] Next.js config fixed.
)

:: Run pre-written helper scripts (already on disk, no generation needed)
echo  Writing mock-mode middleware...
node _write_middleware.js
if errorlevel 1 (
    echo  [!] Failed to write middleware.
    pause >nul
    goto :eof
)
echo  [OK] Mock auth enabled.
echo.
echo  Press any key to continue...
pause >nul

:: ============================================================
:: STEP 5: WRITE MOCK DASHBOARD + LAYOUT
:: ============================================================
echo.
echo  ==========================================
echo   STEP 5 -- Setting up mock dashboard
echo  ==========================================
echo.

echo  Writing mock dashboard...
node _write_dashboard.js
if errorlevel 1 (
    echo  [!] Failed to write mock dashboard.
    pause >nul
    goto :eof
)

echo  Writing mock dashboard layout...
node _write_layout.js
if errorlevel 1 (
    echo  [!] Failed to write dashboard layout.
    pause >nul
    goto :eof
)

echo  [OK] Mock dashboard ready.
echo.
echo  Press any key to launch Pulse...
pause >nul

:: ============================================================
:: STEP 6: START PULSE AI + LAUNCH
:: ============================================================
echo.
echo  ==========================================
echo   STEP 6 -- Launching Pulse
echo  ==========================================
echo.

echo  Checking Pulse AI engine...
tasklist /FI "IMAGENAME eq ollama.exe" 2>nul | findstr /i "ollama.exe" >nul
if errorlevel 1 (
    echo  Starting Pulse AI engine...
    start /B ollama serve
    timeout /t 3 /nobreak >nul
) else (
    echo  [OK] Pulse AI engine already running.
)

echo.
echo  Starting Pulse...
echo.
echo  +---------------------------------------------------------+
echo  ^|  Pulse is running at: http://localhost:3000             ^|
echo  ^|                                                         ^|
echo  ^|  Mock mode active:                                      ^|
echo  ^|    - Auth bypassed (go straight to dashboard^)          ^|
echo  ^|    - Sample data shown                                  ^|
echo  ^|    - Pulse AI running locally                          ^|
echo  ^|    - Emails log to console only                        ^|
echo  ^|                                                         ^|
echo  ^|  Press Ctrl+C to stop Pulse                            ^|
echo  +---------------------------------------------------------+
echo.

start "" "http://localhost:3000/dashboard"
call npm run dev

echo.
echo  ==========================================
echo   Pulse has stopped. Press any key to close.
echo  ==========================================
pause >nul
goto :eof

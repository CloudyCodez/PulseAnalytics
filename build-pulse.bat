@echo off
setlocal enabledelayedexpansion
title Pulse Build Tool
color 0B
cd /d D:\business\Pulse

call :print_banner

echo  What do you want to do?
echo.
echo  [1] Build Pulse Demo.exe  (mock mode, no API keys needed)
echo  [2] Build Pulse.exe       (real mode, full setup wizard)
echo  [3] Test in Electron dev  (fastest - no build needed)
echo.
set /p choice="Enter 1, 2, or 3: "

if "%choice%"=="3" goto DEV
if "%choice%"=="2" goto REAL
if "%choice%"=="1" goto DEMO
echo Invalid choice. Exiting.
pause
exit /b 1

:: ─────────────────────────────────────────────────────────────────────────────
:DEV
echo.
echo  Starting Pulse in Electron dev mode...
echo  (Next.js must already be running on port 3000 or 3001)
echo  Press Ctrl+C to quit.
echo.
npm run electron:dev
goto END

:: ─────────────────────────────────────────────────────────────────────────────
:DEMO
echo.
:: ── SAFETY CHECK: don't overwrite real keys ───────────────────────────────
if exist .env.local (
    findstr /c:"pk_live_" .env.local >nul 2>&1
    if not errorlevel 1 (
        echo.
        echo  [!] SAFETY STOP: .env.local contains live production keys.
        echo      Demo/mock build would overwrite them. Aborting.
        echo.
        echo      Rename .env.local first if you truly want a demo build.
        echo.
        pause
        goto END
    )
)
call :section "STEP 1" "Checking dependencies"
call npm install
if errorlevel 1 ( call :fail "npm install failed." )
echo  [OK] Dependencies ready.

echo.
call :section "STEP 2" "Checking Pulse AI (Ollama)"
call :ensure_ollama
call :ensure_model

echo.
call :section "STEP 3" "Generating icon"
if exist electron\icon.ico del /f electron\icon.ico >nul 2>&1
node _gen_icon.js
if errorlevel 1 ( call :fail "Icon generation failed." )
echo  [OK] Icon generated.

echo.
call :section "STEP 4" "Building Next.js (mock mode)"
echo  Clearing previous build cache...
if exist .next rmdir /s /q .next
set NEXT_PUBLIC_MOCK_MODE=true
call npx next build
if errorlevel 1 ( call :fail "Next.js build failed. Check errors above." )
call node scripts\prepare-standalone.js
if errorlevel 1 ( call :fail "Standalone preparation failed." )
if not exist .next\standalone ( call :fail "Standalone output missing. next.config.js output must be set to standalone." )
echo  [OK] Next.js built.

echo.
call :section "STEP 5" "Packaging Pulse Demo.exe"
echo  Killing any running Electron processes...
taskkill /F /IM electron.exe /T >nul 2>&1
taskkill /F /IM "Pulse.exe" /T >nul 2>&1
taskkill /F /IM "Pulse Demo.exe" /T >nul 2>&1
taskkill /F /IM "RazerAppEngine.exe" /T >nul 2>&1
taskkill /F /IM "claude.exe" /T >nul 2>&1
if exist dist\win-unpacked rmdir /s /q dist\win-unpacked >nul 2>&1
timeout /t 2 /nobreak >nul
call npx electron-builder --config.productName="Pulse Demo" --win
if errorlevel 1 ( call :fail "electron-builder failed." )

echo.
echo  ============================================================
echo   BUILD COMPLETE -- Pulse Demo.exe ready in dist\
echo  ============================================================
echo.
explorer dist
goto END

:: ─────────────────────────────────────────────────────────────────────────────
:REAL
echo.
call :section "STEP 1" "Checking dependencies"
call npm install
if errorlevel 1 ( call :fail "npm install failed." )
echo  [OK] Dependencies ready.

echo.
call :section "STEP 2" "Checking Pulse AI (Ollama)"
call :ensure_ollama
call :ensure_model

echo.
call :section "STEP 3" "Generating icon"
if exist electron\icon.ico (
    echo  [OK] Icon already exists, skipping.
) else (
    node _gen_icon.js
    if errorlevel 1 ( call :fail "Icon generation failed." )
    echo  [OK] Icon generated.
)

echo.
call :section "STEP 4" "API Keys and Configuration"
echo.
echo  Pulse needs a few API keys to run in production.
echo  You only do this once -- the keys get baked into the build.
echo.
echo  If you already have a .env.local with your keys, press S to skip.
echo.
set /p skip_keys="  Skip key setup? (S to skip, Enter to continue): "
if /i "!skip_keys!"=="S" goto :keys_done

:: ── Clerk ──────────────────────────────────────────────────────────────────
echo.
echo  +---------------------------------------------------------+
echo  ^|  CLERK (Authentication)                                 ^|
echo  ^|                                                         ^|
echo  ^|  1. Go to https://clerk.com and create a free account  ^|
echo  ^|  2. Create application called "Pulse"                  ^|
echo  ^|  3. Go to API Keys on the left sidebar                 ^|
echo  +---------------------------------------------------------+
echo.
start "" "https://clerk.com"
set /p CLERK_PUB="  -> Clerk PUBLISHABLE KEY (pk_...): "
set /p CLERK_SEC="  -> Clerk SECRET KEY (sk_...): "
set /p CLERK_WEBHOOK="  -> Clerk Webhook Signing Secret (or Enter to skip): "

:: ── Supabase ───────────────────────────────────────────────────────────────
echo.
echo  +---------------------------------------------------------+
echo  ^|  SUPABASE (Database)                                    ^|
echo  ^|                                                         ^|
echo  ^|  1. Go to https://supabase.com and sign up             ^|
echo  ^|  2. Create a new project called "pulse"                ^|
echo  ^|  3. Go to Settings -^> API                              ^|
echo  +---------------------------------------------------------+
echo.
start "" "https://supabase.com"
set /p SUPA_URL="  -> Supabase PROJECT URL (https://xxxx.supabase.co): "
set /p SUPA_ANON="  -> Supabase ANON/PUBLIC key: "
echo.
echo   (Service role key is NOT needed here -- it never ships in this build.)

echo.
echo  Now run your database schema:
echo  1. In Supabase click SQL Editor on the left
echo  2. Paste the contents of supabase\schema.sql
echo  3. Click Run
echo.
if "!SUPA_URL!" NEQ "" (
    start "" "!SUPA_URL!/project/default/sql/new"
)
echo  Press any key once you've run the schema...
pause >nul

:: ── Stripe ─────────────────────────────────────────────────────────────────
echo.
echo  +---------------------------------------------------------+
echo  ^|  STRIPE (Payments)                                      ^|
echo  ^|                                                         ^|
echo  ^|  1. Go to https://stripe.com                           ^|
echo  ^|  2. Developers -^> API Keys                             ^|
echo  +---------------------------------------------------------+
echo.
start "" "https://dashboard.stripe.com/apikeys"
set /p STRIPE_PUB="  -> Stripe PUBLISHABLE KEY (pk_...): "
set /p STRIPE_SEC="  -> Stripe SECRET KEY (sk_...): "
set /p STRIPE_WEBHOOK="  -> Stripe Webhook Secret (whsec_...): "
set /p STRIPE_STARTER="  -> Starter Plan Price ID (price_...): "
set /p STRIPE_GROWTH="  -> Growth Plan Price ID (price_...): "
set /p STRIPE_AGENCY="  -> Agency Plan Price ID (price_...): "

:: ── Resend ─────────────────────────────────────────────────────────────────
echo.
echo  Resend is skipped here — report email delivery is server-side logic
echo  that runs on pulseanalytics.space, not in the local build. No key needed.
echo.

:: ── Inngest ────────────────────────────────────────────────────────────────
echo.
echo  Inngest is skipped here — scheduled background jobs (weekly reports,
echo  anomaly detection) run on pulseanalytics.space, which has a stable URL
echo  Inngest can call. A local install doesn't, so it never registers. No key needed.
echo.

:: ── App URL ────────────────────────────────────────────────────────────────
echo.
set /p APP_URL_INPUT="  -> Your app URL (press Enter for http://localhost:3000): "
if "!APP_URL_INPUT!"=="" (
    set APP_URL=http://localhost:3000
) else (
    set APP_URL=!APP_URL_INPUT!
)

:: ── Generate encryption key + write .env.local ─────────────────────────────
echo.
echo  Writing .env.local (server-only secrets excluded by design)...
(
echo # Pulse Configuration -- generated by build-pulse.bat
echo NEXT_PUBLIC_MOCK_MODE=false
echo.
echo # Clerk
echo NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=!CLERK_PUB!
echo CLERK_SECRET_KEY=!CLERK_SEC!
echo CLERK_WEBHOOK_SECRET=!CLERK_WEBHOOK!
echo NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
echo NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
echo NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
echo NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
echo.
echo # Supabase
echo NEXT_PUBLIC_SUPABASE_URL=!SUPA_URL!
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=!SUPA_ANON!
echo.
echo # NOTE: SUPABASE_SERVICE_ROLE_KEY is intentionally NOT written here. It
echo # bypasses Row Level Security entirely — baking it into a build that ships
echo # to customer machines would let anyone who installs Pulse read or modify
echo # every other customer's data. Server-side Supabase writes happen on
echo # pulseanalytics.space (Vercel) only. The local app proxies to it instead.
echo.
echo # Stripe
echo NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=!STRIPE_PUB!
echo.
echo # NOTE: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and the price IDs are
echo # intentionally NOT written here. Billing is server-side-only logic that
echo # belongs on pulseanalytics.space (Vercel), never inside a build that ships
echo # to a customer's machine. If you need them for local dev/testing, add them
echo # to a .env.local.dev-only file that build-pulse.bat never reads from.
echo.
echo # Pulse AI (local -- no key needed)
echo PULSE_AI_URL=http://localhost:11434
echo PULSE_AI_MODEL=llama3.1
echo.
echo # Google OAuth (fill in after Google Cloud setup)
echo GOOGLE_CLIENT_ID=
echo GOOGLE_CLIENT_SECRET=
echo GOOGLE_DEVELOPER_TOKEN=
echo NEXT_PUBLIC_GOOGLE_REDIRECT_URI=!APP_URL!/api/integrations/google/callback
echo.
echo # Meta
echo META_APP_ID=
echo META_APP_SECRET=
echo.
echo # Shopify
echo SHOPIFY_API_KEY=
echo SHOPIFY_API_SECRET=
echo.
echo # App
echo NEXT_PUBLIC_APP_URL=!APP_URL!
) > .env.local
echo  [OK] .env.local written.

:keys_done
echo.
call :section "STEP 5" "Building Next.js (production)"
echo  Clearing previous build cache...
if exist .next rmdir /s /q .next
set NEXT_PUBLIC_MOCK_MODE=false
call npx next build
if errorlevel 1 ( call :fail "Next.js build failed. Check errors above." )
call node scripts\prepare-standalone.js
if errorlevel 1 ( call :fail "Standalone preparation failed." )
if not exist .next\standalone ( call :fail "Standalone output missing. next.config.js output must be set to standalone." )
echo  [OK] Next.js built.

echo.
call :section "STEP 6" "Packaging Pulse.exe"
call npx electron-builder --config.productName="Pulse" --win
if errorlevel 1 ( call :fail "electron-builder failed." )

echo.
echo  ============================================================
echo   BUILD COMPLETE -- Pulse.exe ready in dist\
echo  ============================================================
echo.
explorer dist
goto END

:: ─────────────────────────────────────────────────────────────────────────────
:: SUBROUTINES
:: ─────────────────────────────────────────────────────────────────────────────

:ensure_ollama
echo  Checking for Ollama...
ollama --version >nul 2>&1
if not errorlevel 1 (
    echo  [OK] Ollama already installed.
    goto :eof
)
echo  Ollama not found. Downloading now (one-time, ~100MB)...
set OLLAMA_INSTALLER=%TEMP%\pulse-ollama-setup.exe
curl -L -o "!OLLAMA_INSTALLER!" "https://ollama.com/download/OllamaSetup.exe" --progress-bar
if errorlevel 1 ( call :fail "Could not download Ollama. Check your internet connection." )
echo  Installing Ollama silently...
"!OLLAMA_INSTALLER!" /S
timeout /t 8 /nobreak >nul
echo  [OK] Ollama installed.
goto :eof

:ensure_model
echo  Checking for llama3.1 model...
ollama list 2>nul | findstr /i "llama3.1" >nul
if not errorlevel 1 (
    echo  [OK] llama3.1 model already present.
    goto :eof
)
echo.
echo  Downloading llama3.1 model (~4.7 GB, one-time only).
echo  This will take 5-15 minutes depending on your connection.
echo.
ollama pull llama3.1
if errorlevel 1 ( call :fail "Could not pull llama3.1 model. Check your internet connection." )
echo  [OK] llama3.1 model ready.
goto :eof

:section
echo.
echo  ============================================================
echo   %~1 -- %~2
echo  ============================================================
echo.
goto :eof

:fail
echo.
echo  [FAIL] %~1
echo.
pause
exit /b 1

:print_banner
echo.
echo   ____  _   _ _     ____  _____
echo  ^|  _ \^| ^| ^| ^| ^|   / ___^|^| ____^|
echo  ^| ^|_) ^| ^| ^| ^| ^|   \___ \^|  _^|
echo  ^|  __/^| ^|_^| ^| ^|___ ___) ^| ^|___
echo  ^|_^|    \___/^|_____^|____/^|_____^|
echo.
echo  -----------------------------------------
echo   Build Tool
echo  -----------------------------------------
echo.
goto :eof

:END
echo.
pause

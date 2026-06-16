@echo off

:: ============================================================
:: Force relaunch inside a persistent cmd /k window so the
:: window never closes automatically, even on errors.
:: ============================================================
if "%PULSE_RELAUNCHED%"=="" (
    set PULSE_RELAUNCHED=1
    cmd /k ""%~f0""
    exit
)

:: Always run from the script's own directory
cd /d "%~dp0"

setlocal enabledelayedexpansion
title Pulse Setup Wizard

call :clear_screen
call :print_banner

echo.
echo  Welcome! This wizard will set up Pulse on your computer.
echo  It takes about 15 minutes and we'll guide you through every step.
echo.
echo  You'll need accounts at a few services (all free to start).
echo  We'll tell you exactly what to copy from each one.
echo.
echo  Press any key to begin setup...
pause >nul

:: ============================================================
:: STEP 0: CHECK NODE.JS + NPM
:: ============================================================
call :step_header "0" "Checking your computer"

echo  Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [!] Node.js is not installed on your computer.
    echo.
    echo  Please do the following:
    echo   1. Open your browser and go to: https://nodejs.org
    echo   2. Click the big green "LTS" download button
    echo   3. Run the installer ^(click Next through everything^)
    echo   4. Close and reopen this window, then run setup.bat again
    echo.
    echo  Press any key to exit...
    pause >nul
    goto :eof
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js !NODE_VER! is installed.

echo  Checking for npm...
for /f "tokens=*" %%n in ('npm --version 2^>nul') do set NPM_VER=%%n
if "!NPM_VER!"=="" (
    echo  [!] npm not found. Please reinstall Node.js from nodejs.org
    echo.
    echo  Press any key to exit...
    pause >nul
    goto :eof
)
echo  [OK] npm !NPM_VER! is ready.
echo.
echo  Press any key to continue...
pause >nul

:: ============================================================
:: STEP 1: INSTALL PULSE PACKAGES
:: ============================================================
call :step_header "1" "Installing Pulse"

echo  Installing packages ^(this may take a minute^)...
echo.
call npm install
if errorlevel 1 (
    echo.
    echo  [!] Installation failed. Check your internet connection and try again.
    echo.
    echo  Press any key to exit...
    pause >nul
    goto :eof
)
echo.
echo  [OK] Pulse installed successfully.
echo.
echo  Press any key to continue...
pause >nul

:: ============================================================
:: STEP 2: INSTALL PULSE AI (OLLAMA + LLAMA)
:: ============================================================
call :step_header "2" "Installing Pulse AI"

echo  Pulse AI is a local intelligence engine that runs entirely
echo  on your computer. No internet required. No API keys. Ever.
echo.
echo  Checking if Pulse AI is already installed...

:: Check if Ollama is already installed
ollama --version >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%o in ('ollama --version 2^>nul') do set OLLAMA_VER=%%o
    echo  [OK] Pulse AI engine already installed ^(!OLLAMA_VER!^).
    goto :check_model
)

echo  Downloading Pulse AI engine...
echo  ^(This is a one-time download -- it will not happen again^)
echo.

:: Download Ollama silently
set OLLAMA_INSTALLER=%TEMP%\pulse-ai-setup.exe
curl -L -o "!OLLAMA_INSTALLER!" "https://ollama.com/download/OllamaSetup.exe" --progress-bar
if errorlevel 1 (
    echo.
    echo  [!] Could not download Pulse AI. Check your internet connection.
    echo.
    echo  Press any key to exit...
    pause >nul
    goto :eof
)

echo.
echo  Installing Pulse AI engine...
"!OLLAMA_INSTALLER!" /S
if errorlevel 1 (
    echo.
    echo  [!] Pulse AI installation failed. Please try running setup again.
    echo.
    echo  Press any key to exit...
    pause >nul
    goto :eof
)

:: Wait for Ollama to finish installing and start
echo  Initializing Pulse AI...
timeout /t 8 /nobreak >nul

:check_model
echo.
echo  Checking if Pulse AI model is ready...

:: Check if the model is already pulled
ollama list 2>nul | findstr /i "llama3.1" >nul
if not errorlevel 1 (
    echo  [OK] Pulse AI model already loaded. Skipping download.
    goto :ai_done
)

echo.
echo  Loading Pulse AI model for the first time...
echo  This download is about 4.7 GB and only happens once.
echo.
echo  +---------------------------------------------------------+
echo  ^|  Please be patient -- this may take 5-15 minutes       ^|
echo  ^|  depending on your internet speed.                     ^|
echo  ^|                                                         ^|
echo  ^|  Pulse AI will be ready instantly on future launches.  ^|
echo  +---------------------------------------------------------+
echo.

ollama pull llama3.1
if errorlevel 1 (
    echo.
    echo  [!] Could not load Pulse AI model. Check your internet and try again.
    echo.
    echo  Press any key to exit...
    pause >nul
    goto :eof
)

:ai_done
echo.
echo  [OK] Pulse AI is ready.
echo.
echo  Press any key to continue...
pause >nul

:: ============================================================
:: STEP 3: GENERATE ENCRYPTION KEY
:: ============================================================
call :step_header "3" "Generating security key"

echo  Generating your unique encryption key...
for /f "tokens=*" %%k in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set ENCRYPTION_KEY=%%k
echo  [OK] Security key generated.
echo.
echo  Press any key to continue...
pause >nul

:: ============================================================
:: STEP 4: CLERK (AUTH)
:: ============================================================
call :step_header "4" "Setting up Login ^(Clerk^)"

echo  Clerk handles your users' logins and accounts.
echo  It's free for up to 10,000 users.
echo.
echo  +---------------------------------------------------------+
echo  ^|  INSTRUCTIONS:                                          ^|
echo  ^|                                                         ^|
echo  ^|  1. Go to https://clerk.com and create a free account  ^|
echo  ^|  2. Click "Create application"                         ^|
echo  ^|  3. Name it "Pulse" and click Create                   ^|
echo  ^|  4. On the left sidebar click "API Keys"               ^|
echo  ^|  5. You'll see two keys to copy below                  ^|
echo  +---------------------------------------------------------+
echo.
call :open_url "https://clerk.com"
echo.
set /p CLERK_PUB="  -> Paste your Clerk PUBLISHABLE KEY (starts with pk_): "
echo.
set /p CLERK_SEC="  -> Paste your Clerk SECRET KEY (starts with sk_): "
echo.
echo  Now set up the Clerk webhook ^(so Pulse knows when users sign up^):
echo.
echo  +---------------------------------------------------------+
echo  ^|  1. In Clerk Dashboard, click "Webhooks" on the left   ^|
echo  ^|  2. Click "Add Endpoint"                               ^|
echo  ^|  3. For URL, enter your live domain:                   ^|
echo  ^|     https://YOURDOMAIN.com/api/webhooks/clerk          ^|
echo  ^|     ^(skip this for now if testing locally^)             ^|
echo  ^|  4. Check these events:                                ^|
echo  ^|       user.created   user.updated   user.deleted       ^|
echo  ^|  5. Click Create, then copy the "Signing Secret"       ^|
echo  +---------------------------------------------------------+
echo.
set /p CLERK_WEBHOOK="  -> Paste your Clerk Webhook Signing Secret (or press Enter to skip): "
echo.
echo  [OK] Clerk configured.
echo  Press any key to continue...
pause >nul

:: ============================================================
:: STEP 5: SUPABASE (DATABASE)
:: ============================================================
call :step_header "5" "Setting up Database ^(Supabase^)"

echo  Supabase is your database. It stores users, reports, and integrations.
echo  It's free to start.
echo.
echo  +---------------------------------------------------------+
echo  ^|  INSTRUCTIONS:                                          ^|
echo  ^|                                                         ^|
echo  ^|  1. Go to https://supabase.com and sign up             ^|
echo  ^|  2. Click "New Project"                                 ^|
echo  ^|  3. Name it "pulse" and set a database password        ^|
echo  ^|     ^(save that password somewhere safe^)                ^|
echo  ^|  4. Wait ~1 minute for it to finish setting up         ^|
echo  ^|  5. Go to Settings -^> API on the left sidebar          ^|
echo  ^|  6. Copy the three values below                        ^|
echo  +---------------------------------------------------------+
echo.
call :open_url "https://supabase.com"
echo.
set /p SUPA_URL="  -> Paste your Supabase PROJECT URL (e.g. https://xxxx.supabase.co): "
echo.
set /p SUPA_ANON="  -> Paste your Supabase ANON/PUBLIC key: "
echo.
set /p SUPA_SERVICE="  -> Paste your Supabase SERVICE ROLE key: "
echo.
echo  [OK] Database credentials saved.
echo.
echo  +---------------------------------------------------------+
echo  ^|  FINAL STEP FOR DATABASE:                               ^|
echo  ^|                                                         ^|
echo  ^|  1. In Supabase, click "SQL Editor" on the left        ^|
echo  ^|  2. Click "New query"                                   ^|
echo  ^|  3. Open the file: supabase\schema.sql                 ^|
echo  ^|     ^(it's in your Pulse folder^)                        ^|
echo  ^|  4. Copy ALL the contents and paste into Supabase      ^|
echo  ^|  5. Click the green "Run" button                       ^|
echo  ^|  6. You should see "Success. No rows returned"         ^|
echo  +---------------------------------------------------------+
echo.
echo  Opening your Supabase SQL Editor now...
call :open_url "!SUPA_URL!/project/default/sql/new"
echo.
echo  Press any key once you've run the schema SQL...
pause >nul

:: ============================================================
:: STEP 6: STRIPE (PAYMENTS)
:: ============================================================
call :step_header "6" "Setting up Payments ^(Stripe^)"

echo  Stripe handles all your billing and subscriptions.
echo.
echo  +---------------------------------------------------------+
echo  ^|  INSTRUCTIONS:                                          ^|
echo  ^|                                                         ^|
echo  ^|  1. Go to https://stripe.com and create an account     ^|
echo  ^|  2. In the dashboard, click "Developers" top right     ^|
echo  ^|  3. Click "API keys" and copy the two keys below       ^|
echo  +---------------------------------------------------------+
echo.
call :open_url "https://dashboard.stripe.com/apikeys"
echo.
set /p STRIPE_PUB="  -> Paste your Stripe PUBLISHABLE KEY (starts with pk_): "
echo.
set /p STRIPE_SEC="  -> Paste your Stripe SECRET KEY (starts with sk_): "
echo.
echo  Now set up the Stripe webhook:
echo.
echo  +---------------------------------------------------------+
echo  ^|  1. In Stripe Dashboard go to Developers -^> Webhooks  ^|
echo  ^|  2. Click "Add endpoint"                               ^|
echo  ^|  3. Enter: https://YOURDOMAIN.com/api/webhooks/stripe  ^|
echo  ^|  4. Select these events:                               ^|
echo  ^|       customer.subscription.created                    ^|
echo  ^|       customer.subscription.updated                    ^|
echo  ^|       customer.subscription.deleted                    ^|
echo  ^|       invoice.payment_succeeded                        ^|
echo  ^|       invoice.payment_failed                           ^|
echo  ^|  5. Copy the "Signing secret" below                    ^|
echo  +---------------------------------------------------------+
echo.
set /p STRIPE_WEBHOOK="  -> Paste your Stripe Webhook Secret (starts with whsec_): "
echo.
echo  Now paste your 3 Stripe Price IDs:
echo  ^(Find these in Stripe -^> Products -^> click each plan -^> copy Price ID^)
echo.
set /p STRIPE_STARTER="  -> Starter Plan Price ID (starts with price_): "
echo.
set /p STRIPE_GROWTH="  -> Growth Plan Price ID (starts with price_): "
echo.
set /p STRIPE_AGENCY="  -> Agency Plan Price ID (starts with price_): "
echo.
echo  [OK] Payments configured.
echo  Press any key to continue...
pause >nul

:: ============================================================
:: STEP 7: RESEND (EMAIL)
:: ============================================================
call :step_header "7" "Setting up Email ^(Resend^)"

echo  Resend delivers your weekly reports to clients' inboxes.
echo.
echo  +---------------------------------------------------------+
echo  ^|  1. Go to https://resend.com and sign up               ^|
echo  ^|  2. Click "API Keys" -^> "Create API Key"               ^|
echo  ^|  3. Name it "Pulse" and copy the key                   ^|
echo  ^|  4. Add and verify your sending domain                 ^|
echo  ^|     ^(the domain you want reports to come FROM^)         ^|
echo  +---------------------------------------------------------+
echo.
call :open_url "https://resend.com/api-keys"
echo.
set /p RESEND_KEY="  -> Paste your Resend API Key (starts with re_): "
echo.
set /p RESEND_FROM="  -> Enter your FROM email (e.g. reports@yourdomain.com): "
echo.
echo  [OK] Email configured.
echo  Press any key to continue...
pause >nul

:: ============================================================
:: STEP 8: INNGEST (BACKGROUND JOBS)
:: ============================================================
call :step_header "8" "Setting up Background Jobs ^(Inngest^)"

echo  Inngest runs your weekly reports automatically every Monday.
echo.
echo  +---------------------------------------------------------+
echo  ^|  1. Go to https://www.inngest.com and sign up          ^|
echo  ^|  2. Create a new app called "Pulse"                    ^|
echo  ^|  3. Go to Manage -^> Event Keys and copy your Event Key ^|
echo  ^|  4. Go to Manage -^> Signing Key and copy your          ^|
echo  ^|     Signing Key                                        ^|
echo  +---------------------------------------------------------+
echo.
call :open_url "https://app.inngest.com"
echo.
set /p INNGEST_EVENT="  -> Paste your Inngest Event Key: "
echo.
set /p INNGEST_SIGN="  -> Paste your Inngest Signing Key: "
echo.
echo  [OK] Background jobs configured.
echo  Press any key to continue...
pause >nul

:: ============================================================
:: STEP 9: APP URL
:: ============================================================
call :step_header "9" "Your website address"

echo  What is the web address where Pulse will live?
echo.
echo  - If you're just testing locally, press Enter to use localhost
echo  - If you have a domain, enter it like: https://app.mypulse.com
echo.
set /p APP_URL_INPUT="  -> Your Pulse URL (press Enter for http://localhost:3000): "
if "!APP_URL_INPUT!"=="" (
    set APP_URL=http://localhost:3000
) else (
    set APP_URL=!APP_URL_INPUT!
)
echo  [OK] URL set to: !APP_URL!
echo.
echo  Press any key to continue...
pause >nul

:: ============================================================
:: STEP 10: WRITE .env.local
:: ============================================================
call :step_header "10" "Saving your configuration"

echo  Writing your configuration file...

(
echo # ============================================================
echo # PULSE CONFIGURATION -- generated by setup.bat
echo # Do not share this file. Keep it private.
echo # ============================================================
echo.
echo # Clerk ^(Authentication^)
echo NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=!CLERK_PUB!
echo CLERK_SECRET_KEY=!CLERK_SEC!
echo CLERK_WEBHOOK_SECRET=!CLERK_WEBHOOK!
echo NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
echo NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
echo NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
echo NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
echo.
echo # Supabase ^(Database^)
echo NEXT_PUBLIC_SUPABASE_URL=!SUPA_URL!
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=!SUPA_ANON!
echo SUPABASE_SERVICE_ROLE_KEY=!SUPA_SERVICE!
echo.
echo # Stripe ^(Payments^)
echo NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=!STRIPE_PUB!
echo STRIPE_SECRET_KEY=!STRIPE_SEC!
echo STRIPE_WEBHOOK_SECRET=!STRIPE_WEBHOOK!
echo STRIPE_PRICE_STARTER=!STRIPE_STARTER!
echo STRIPE_PRICE_GROWTH=!STRIPE_GROWTH!
echo STRIPE_PRICE_AGENCY=!STRIPE_AGENCY!
echo.
echo # Pulse AI ^(Local -- no API key needed^)
echo PULSE_AI_URL=http://localhost:11434
echo PULSE_AI_MODEL=llama3.1
echo.
echo # Resend ^(Email^)
echo RESEND_API_KEY=!RESEND_KEY!
echo RESEND_FROM_EMAIL=!RESEND_FROM!
echo.
echo # Inngest ^(Background Jobs^)
echo INNGEST_EVENT_KEY=!INNGEST_EVENT!
echo INNGEST_SIGNING_KEY=!INNGEST_SIGN!
echo.
echo # Google OAuth ^(GA4 + Google Ads^) -- fill in after Google Cloud setup
echo GOOGLE_CLIENT_ID=
echo GOOGLE_CLIENT_SECRET=
echo GOOGLE_DEVELOPER_TOKEN=
echo NEXT_PUBLIC_GOOGLE_REDIRECT_URI=!APP_URL!/api/integrations/google/callback
echo.
echo # Meta ^(Facebook/Instagram Ads^) -- fill in after Meta App setup
echo META_APP_ID=
echo META_APP_SECRET=
echo.
echo # Shopify -- fill in after Shopify Partner app setup
echo SHOPIFY_API_KEY=
echo SHOPIFY_API_SECRET=
echo.
echo # App
echo NEXT_PUBLIC_APP_URL=!APP_URL!
echo.
echo # Encryption ^(auto-generated -- never change this^)
echo ENCRYPTION_KEY=!ENCRYPTION_KEY!
) > .env.local

echo  [OK] Configuration saved to .env.local
echo.

:: ============================================================
:: STEP 11: CREATE start.bat + LAUNCH
:: ============================================================
call :step_header "11" "Starting Pulse"

echo  Everything is configured! Let's start Pulse.
echo.
echo  +---------------------------------------------------------+
echo  ^|  Pulse will open in your browser automatically.         ^|
echo  ^|                                                         ^|
echo  ^|  To start Pulse in the future, just double-click:      ^|
echo  ^|    start.bat                                            ^|
echo  ^|                                                         ^|
echo  ^|  To stop Pulse, press Ctrl+C in this window.           ^|
echo  +---------------------------------------------------------+
echo.

(
echo @echo off
echo title Pulse
echo cd /d "%%~dp0"
echo echo  Starting Pulse AI engine...
echo start /B ollama serve
echo timeout /t 3 /nobreak ^>nul
echo echo  [OK] Pulse AI is running.
echo echo  Starting Pulse...
echo start "" "http://localhost:3000"
echo npm run dev
echo echo.
echo echo  Pulse has stopped. Press any key to close.
echo pause ^>nul
) > start.bat

echo  [OK] start.bat created.
echo.
echo  Press any key to launch Pulse for the first time...
pause >nul

:: Start Ollama in background then launch Pulse
echo  Starting Pulse AI engine...
start /B ollama serve
timeout /t 3 /nobreak >nul
echo  [OK] Pulse AI is running.
echo.

start "" "!APP_URL!"
call npm run dev

echo.
echo  ==========================================
echo   Pulse has stopped. Press any key to close.
echo  ==========================================
pause >nul
goto :eof

:: ============================================================
:: HELPER SUBROUTINES
:: ============================================================

:print_banner
echo.
echo   ____  _   _ _     ____  _____
echo  ^|  _ \^| ^| ^| ^| ^|   / ___^|^| ____^|
echo  ^| ^|_) ^| ^| ^| ^| ^|   \___ \^|  _^|
echo  ^|  __/^| ^|_^| ^| ^|___ ___) ^| ^|___
echo  ^|_^|    \___/^|_____^|____/^|_____^|
echo.
echo  -----------------------------------------
echo   Automated Business Intelligence -- Setup
echo  -----------------------------------------
goto :eof

:step_header
echo.
echo  ==========================================
echo   STEP %~1 -- %~2
echo  ==========================================
echo.
goto :eof

:clear_screen
cls
goto :eof

:open_url
echo  Opening: %~1
start "" "%~1"
echo.
goto :eof

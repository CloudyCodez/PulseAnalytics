# Pulse — Live Environment Setup Guide
> Follow this top to bottom. Takes about 30–45 minutes. After this, Pulse is live and takes real money.

---

## Overview of what we're wiring up

```
Visitor clicks pricing button
  → POST /api/stripe/checkout (Next.js)
  → Stripe Checkout (hosted payment page)
  → Payment succeeds
  → Stripe fires webhook → POST /api/webhooks/stripe
  → We create Clerk user + send magic-link email via Resend
  → User clicks email link → /sign-in?token=xxx
  → Clerk signs them in → /dashboard
  → User connects integrations → reports generate automatically
```

---

## Step 1 — Clerk (Auth)

1. Go to https://dashboard.clerk.com → Create application
2. Name it "Pulse" — enable Email + Google sign-in
3. From the API Keys page, copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_live_`)
4. In Clerk dashboard → **JWT Templates** → New template → Choose **Supabase**
   - This lets Supabase verify Clerk JWTs for RLS policies
   - Copy the JWT signing key — you'll need it in Supabase Step 3

---

## Step 2 — Supabase (Database)

1. Go to https://supabase.com → New project → name it "pulse-prod"
2. Wait for it to provision (~2 min)
3. Go to **Settings → API** and copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Go to **SQL Editor** → paste the contents of `supabase/migrations/001_initial_schema.sql` → Run
   - This creates all tables, indexes, and RLS policies
5. Go to **Settings → Authentication → JWT Settings**
   - Paste the JWT signing key from Clerk Step 1 under "JWT Secret"
   - This connects Clerk auth to Supabase RLS

---

## Step 3 — Stripe (Billing)

1. Go to https://dashboard.stripe.com → Make sure you're in **Live mode** (toggle top-left)
2. **Create products:**
   - Products → Add product → "Pulse Starter" → $297/month recurring
     - Copy the Price ID (starts with `price_`) → `STRIPE_PRICE_STARTER`
   - Repeat for "Pulse Growth" → $597/month → `STRIPE_PRICE_GROWTH`
   - Repeat for "Pulse Scale" → $1,197/month → `STRIPE_PRICE_SCALE`
3. **API Keys** → copy:
   - `STRIPE_SECRET_KEY` (starts with `sk_live_`)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_live_`)
4. **Webhooks** (do this AFTER deploying to Vercel in Step 6):
   - Webhooks → Add endpoint
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed` ← most important, triggers user creation
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copy the Signing Secret → `STRIPE_WEBHOOK_SECRET`

---

## Step 4 — Resend (Email)

1. Go to https://resend.com → Sign up → Create API key
2. Copy it → `RESEND_API_KEY`
3. **Add your sending domain** (e.g. pulse.app):
   - Domains → Add domain → follow DNS instructions
   - Once verified, set `RESEND_FROM_EMAIL=reports@yourdomain.com`
4. Until domain is verified, you can use `onboarding@resend.dev` for testing

---

## Step 5 — Anthropic (AI)

1. Go to https://console.anthropic.com → API Keys → Create key
2. Copy it → `ANTHROPIC_API_KEY`

---

## Step 6 — Deploy to Vercel

1. Push Pulse to a GitHub repo (private is fine)
2. Go to https://vercel.com → New Project → import the repo
3. Framework: Next.js (auto-detected)
4. **Environment Variables** — add all of these:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_SCALE=price_...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=reports@yourdomain.com

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_MOCK_MODE=false

# Encryption (for OAuth tokens at rest — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=<32-byte hex string>
```

5. Deploy → copy your Vercel URL (or add your custom domain)
6. Go back to Stripe → add the webhook endpoint URL (Step 3 point 4)

---

## Step 7 — Test the full flow

1. Open your live URL → click a pricing button
2. You'll land on Stripe Checkout — use test card `4242 4242 4242 4242`, any future date, any CVC
   - (Switch Stripe to Test mode first if you want a dry run without charging yourself)
3. After payment → you land on `/welcome`
4. Check your email → click the magic sign-in link
5. You're in the dashboard — try connecting an integration

---

## Step 8 — Switch off mock mode locally

Update your local `.env.local` for live testing:
```bash
NEXT_PUBLIC_MOCK_MODE=false
# Then fill in real keys from above
```

Run `npm run dev` — the app now requires real Clerk auth.

---

## Post-launch checklist

- [ ] Stripe webhook endpoint added and verified (check for green checkmark)
- [ ] Test purchase completed end-to-end in Stripe test mode
- [ ] Welcome email received and sign-in link works
- [ ] Dashboard loads correctly after sign-in
- [ ] At least one integration connected successfully
- [ ] Supabase RLS verified (users can't see each other's data)
- [ ] Custom domain pointing to Vercel
- [ ] Resend sending domain verified (check DNS propagation)
- [ ] Inngest account created and connected for weekly report scheduler

---

## Inngest (Weekly Reports — Phase 3)

This powers the automated report delivery. Wire this up when you're ready to run the report engine:

1. Go to https://inngest.com → Create account → New app
2. Copy `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` to your env vars
3. Add the Inngest webhook route to your Vercel deployment: `/api/webhooks/inngest`
4. The weekly report job is already written in `src/lib/inngest/functions/`

---

*Last updated: June 16, 2026*

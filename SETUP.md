# Pulse — Setup Guide

## Prerequisites
- Node.js 18+
- A Supabase project
- A Clerk application
- A Stripe account
- An Inngest account
- A Resend account
- Google Cloud project (for GA4 / Google Ads OAuth)
- Meta Developer App (for Meta Ads OAuth)

---

## 1. Install dependencies

```bash
cd D:\business\pulse
npm install
```

---

## 2. Database (Supabase)

1. Go to your Supabase project → **SQL Editor**
2. Paste and run the contents of `supabase/schema.sql`
3. Copy your project URL and keys into `.env.local`

---

## 3. Auth (Clerk)

1. Create a Clerk application at clerk.com
2. Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` into `.env.local`
3. In Clerk Dashboard → **Webhooks** → Add endpoint:
   - URL: `https://yourdomain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy the signing secret → `CLERK_WEBHOOK_SECRET` in `.env.local`

---

## 4. Payments (Stripe)

1. Create 3 products in Stripe:
   - Starter — $297/month
   - Growth — $597/month
   - Scale — $1,197/month
2. Copy each price ID into `.env.local` as `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_SCALE`
3. Add a webhook in Stripe Dashboard:
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`

---

## 5. Background Jobs (Inngest)

1. Create an Inngest account at inngest.com
2. Copy your Event Key and Signing Key into `.env.local`
3. In production, register your app endpoint: `https://yourdomain.com/api/webhooks/inngest`
4. To run locally: `npm run inngest:dev`

---

## 6. Email (Resend)

1. Create a Resend account and verify your sending domain
2. Copy API key into `.env.local` as `RESEND_API_KEY`
3. Set `RESEND_FROM_EMAIL` to your verified sending address

---

## 7. Google OAuth (GA4 + Ads)

1. Go to Google Cloud Console → Create OAuth 2.0 credentials
2. Authorized redirect URIs: `https://yourdomain.com/api/integrations/google/callback`
3. Copy Client ID and Secret into `.env.local`
4. For Google Ads, apply for a Developer Token in Google Ads API Center

---

## 8. Meta OAuth

1. Create a Meta Developer App at developers.facebook.com
2. Add Facebook Login product, set redirect URI: `https://yourdomain.com/api/integrations/meta/callback`
3. Copy App ID and Secret into `.env.local`

---

## 9. Shopify OAuth

1. Create a Shopify Partner app at partners.shopify.com
2. Set redirect URL: `https://yourdomain.com/api/integrations/shopify/callback`
3. Copy API key and secret into `.env.local`

---

## 10. Encryption key

Generate a secure 32-byte hex key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste into `.env.local` as `ENCRYPTION_KEY`.

---

## 11. Run locally

```bash
npm run dev
# In a separate terminal:
npm run inngest:dev
```

Visit `http://localhost:3000`

---

## File structure summary

```
src/
  app/
    page.tsx                        ← Landing page
    layout.tsx                      ← Root layout (Clerk provider)
    globals.css                     ← CSS variables + fonts
    (auth)/
      sign-in/page.tsx
      sign-up/page.tsx
    dashboard/
      layout.tsx                    ← Sidebar layout
      page.tsx                      ← Overview
      integrations/page.tsx
      reports/page.tsx
      alerts/page.tsx
      settings/page.tsx
    api/
      webhooks/
        clerk/route.ts              ← User sync → Supabase
        stripe/route.ts             ← Subscription events
        inngest/route.ts            ← Background job serve
      integrations/
        google/auth/route.ts
        google/callback/route.ts
        meta/auth/route.ts
        meta/callback/route.ts
        shopify/connect/route.ts
        shopify/callback/route.ts
      stripe/
        create-checkout/route.ts
        portal/route.ts
      reports/route.ts
  components/
    dashboard/
      MetricCard.tsx
      Sidebar.tsx
      IntegrationTile.tsx
    report/
      BarRow.tsx
      AICommentaryBox.tsx
    ui/
      Badge.tsx
      Button.tsx
  lib/
    supabase/client.ts + server.ts
    stripe/client.ts
    inngest/client.ts + functions/
    connectors/ga4.ts + meta.ts + shopify.ts + index.ts
    ai/commentary.ts
    email/sender.ts
    encryption.ts
  middleware.ts
supabase/
  schema.sql
```

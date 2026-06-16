# Pulse — Product Blueprint
> Version 1.0 | Created June 15, 2026 | Status: IN BUILD

---

## What Pulse Is

Pulse is a B2B SaaS platform that eliminates manual performance reporting for marketing agencies, e-commerce brands, and growth-focused businesses. Clients connect their data sources once, and every Monday morning they receive a boardroom-ready performance report — with AI-written analysis — delivered automatically to their inbox. No dashboards to remember to check. No spreadsheets. No manual work. Ever.

**One-line pitch:**
> "Connect your platforms once. Get clarity every Monday. Forever."

**Core promise:** Replace 3–5 hours of weekly manual reporting with zero minutes. Deliver not just data, but decisions.

---

## The Problem Pulse Solves

Marketing agencies and growing businesses are drowning in data spread across Google Ads, Meta, Shopify, GA4, Klaviyo, TikTok, and more. Someone on the team spends 3–5 hours every Sunday night pulling numbers, building slides, writing commentary, and emailing clients. At $75–$100/hr billing rates, that's $900–$2,000/month in labor per client — just for reporting.

Existing tools (AgencyAnalytics, DashThis, Databox) give you a dashboard — but someone still has to log in, interpret it, and write the "so what." Pulse automates the entire chain: data → analysis → delivery.

---

## Business Model

- **Model:** Monthly recurring subscription (MRR)
- **Trial:** 14-day free trial, no credit card required
- **Billing:** Stripe subscriptions, automatic access gating on cancellation
- **Target MRR milestones:**
  - Month 1: $3,000 (5–6 clients)
  - Month 3: $10,000 (15–17 clients)
  - Month 6: $20,000 (25–30 clients)
- **Profit margin at $10K MRR:** ~88% (tooling costs ~$150–$300/mo)

---

## Pricing Tiers

### Starter — $297/month
For solo operators, local businesses, early-stage creators.
- Weekly automated email report
- Up to 3 connected data sources
- Live dashboard (always-on)
- Monthly PDF summary
- Email support

### Growth — $597/month *(Most Popular)*
For agencies and e-commerce brands.
- Everything in Starter
- Up to 8 data sources
- AI-written "what to do next" analysis section
- Anomaly alerts via Slack or email
- Monthly 30-min strategy call

### Scale — $1,197/month
For multi-location brands, funded startups, agencies with 15+ clients.
- Everything in Growth
- Unlimited data sources
- Custom branded report design
- Multi-location / multi-brand support
- White-label reseller option
- Bi-weekly strategy calls
- Priority Slack channel

### Add-ons
- Additional brand/client seat: $149/month
- White-label reseller: $997 setup + $97/seat/month
- One-time custom dashboard: $497
- Quarterly deep-dive audit: $297

---

## Target Customers

### Tier 1 — Start Now
- **Marketing agencies (2–50 employees):** Highest pain, fastest close. Managing 10–50 clients manually. $597–$1,197/mo deal size.
- **E-commerce / DTC brands (Shopify):** Drowning in fragmented data. Just scaled ad spend or hired a marketer. $597–$1,197/mo.

### Tier 2 — Month 2+
- **Content creators ($5K+/month):** YouTube, TikTok, newsletter, podcast — no unified view.
- **Local service businesses:** Gyms, med spas, dental, law firms running ads with no reporting infrastructure.

### Tier 3 — Month 3+
- **SaaS companies (seed to Series A):** MRR, churn, activations across Stripe, Intercom, Mixpanel.
- **Real estate teams:** Lead pipeline, listing performance, closed deals.

---

## Data Sources (Integrations)

### Launch (Phase 1)
- Google Analytics 4
- Google Ads
- Meta Ads (Facebook + Instagram)
- Shopify

### Phase 2
- Klaviyo (email marketing)
- TikTok for Business
- HubSpot (CRM)
- GoHighLevel (CRM)

### Phase 3
- YouTube Studio
- Stripe (revenue)
- Beehiiv / ConvertKit (newsletter)
- Pinterest Ads
- LinkedIn Ads

---

## Tech Stack

### Frontend
- **Next.js 14** (App Router) — industry-standard React framework, server components, fast routing
- **Tailwind CSS** — utility-first styling, matches Pulse design system
- **Framer Motion** — subtle, purposeful animations
- **Recharts** — data visualization in the dashboard

### Auth
- **Clerk** — drop-in auth for Next.js. Handles signup, login, email verification, password reset, social login, session management. Multi-tenant ready out of the box.

### Database
- **Supabase (PostgreSQL)** — real database with row-level security (RLS) so clients only ever see their own data. Real-time subscriptions for live dashboard updates. Hosted and managed.

### Billing
- **Stripe** — subscription management, trial periods, webhook handling, automatic access gating on cancellation/failure.

### Background Jobs / Scheduler
- **Inngest** — serverless scheduled functions. The weekly report runner lives here. Scales automatically, no server to manage, retries on failure, full observability dashboard.

### AI
- **Anthropic Claude API (claude-sonnet-4-6)** — generates the "what happened, why, and what to do next" analysis section of every report. Called via Inngest job, not in the request path.

### Email Delivery
- **Resend** — transactional email API built for developers. Sub-100ms delivery, open tracking, bounce handling.
- **React Email** — build report emails as React components. Renders to pixel-perfect HTML email.

### Connectors
- **TypeScript API routes** in Next.js — each integration is a separate module
- OAuth 2.0 flows handled server-side, tokens encrypted at rest in Supabase
- Google: `googleapis` npm package
- Meta: Graph API via `fetch`
- Shopify: Admin API via `@shopify/shopify-api`

### Deployment
- **Vercel** — Next.js deploys here natively. Edge network, zero-config CI/CD from GitHub.
- **Supabase** — managed PostgreSQL, hosted globally

### Monitoring
- **Inngest dashboard** — scheduler health, job success/failure rates
- **Sentry** — error tracking in production
- **Resend dashboard** — email delivery, open rates, bounces

---

## Database Schema (Supabase / PostgreSQL)

```sql
-- Users managed by Clerk, referenced by clerk_user_id

users
  id                  uuid primary key
  clerk_user_id       text unique not null
  email               text not null
  full_name           text
  company_name        text
  plan                text default 'trial'   -- trial | starter | growth | scale
  stripe_customer_id  text
  stripe_sub_id       text
  trial_ends_at       timestamptz
  created_at          timestamptz default now()

integrations
  id                  uuid primary key
  user_id             uuid references users(id) on delete cascade
  provider            text not null   -- google_ads | ga4 | meta | shopify | klaviyo | ...
  access_token        text            -- encrypted
  refresh_token       text            -- encrypted
  token_expires_at    timestamptz
  account_id          text            -- e.g. Google Ads customer ID
  property_id         text            -- e.g. GA4 property ID
  store_url           text            -- Shopify only
  connected_at        timestamptz default now()
  last_synced_at      timestamptz
  status              text default 'active'  -- active | error | expired

reports
  id                  uuid primary key
  user_id             uuid references users(id) on delete cascade
  week_start          date not null
  week_end            date not null
  status              text default 'pending'  -- pending | generating | sent | failed
  data_snapshot       jsonb           -- raw metric data used to generate report
  ai_commentary       text            -- Claude-generated analysis
  email_html          text            -- rendered email HTML
  sent_at             timestamptz
  error_message       text
  created_at          timestamptz default now()

anomalies
  id                  uuid primary key
  user_id             uuid references users(id) on delete cascade
  detected_at         timestamptz default now()
  metric              text            -- e.g. 'meta_roas'
  change_pct          numeric
  direction           text            -- up | down
  message             text
  alerted             boolean default false
```

Row-level security (RLS) policies ensure users can only read/write their own rows.

---

## Application Architecture

```
pulse/
├── app/                          # Next.js App Router
│   ├── (marketing)/              # Public pages (no auth)
│   │   ├── page.tsx              # Landing page
│   │   ├── pricing/page.tsx
│   │   └── demo/page.tsx
│   ├── (auth)/                   # Clerk auth pages
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── dashboard/                # Protected client area
│   │   ├── layout.tsx            # Sidebar + nav shell
│   │   ├── page.tsx              # Overview / latest report
│   │   ├── reports/page.tsx      # Report history
│   │   ├── integrations/page.tsx # Connect data sources
│   │   ├── settings/page.tsx     # Account + billing
│   │   └── alerts/page.tsx       # Anomaly feed
│   ├── api/                      # API routes
│   │   ├── webhooks/
│   │   │   ├── stripe/route.ts   # Stripe billing events
│   │   │   └── inngest/route.ts  # Inngest job handler
│   │   ├── integrations/
│   │   │   ├── google/
│   │   │   │   ├── auth/route.ts      # OAuth start
│   │   │   │   └── callback/route.ts  # OAuth callback
│   │   │   ├── meta/
│   │   │   │   └── connect/route.ts
│   │   │   └── shopify/
│   │   │       └── connect/route.ts
│   │   └── reports/
│   │       └── preview/[id]/route.ts
│   └── layout.tsx                # Root layout (Clerk provider)
│
├── components/
│   ├── ui/                       # Design system primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── ...
│   ├── dashboard/
│   │   ├── Sidebar.tsx
│   │   ├── MetricCard.tsx
│   │   ├── ReportCard.tsx
│   │   ├── IntegrationTile.tsx
│   │   └── AnomalyFeed.tsx
│   └── report/
│       ├── ReportEmail.tsx       # React Email template
│       └── ReportPreview.tsx     # In-app preview
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   ├── stripe/
│   │   └── client.ts
│   ├── inngest/
│   │   ├── client.ts
│   │   └── functions/
│   │       ├── weekly-reports.ts  # Main weekly job
│   │       ├── token-refresh.ts   # Pre-expiry token refresh
│   │       └── anomaly-detect.ts  # Mid-week anomaly check
│   ├── connectors/
│   │   ├── google-ads.ts
│   │   ├── ga4.ts
│   │   ├── meta.ts
│   │   ├── shopify.ts
│   │   └── index.ts              # Unified fetch orchestrator
│   ├── ai/
│   │   └── commentary.ts         # Claude API call + prompt
│   └── email/
│       └── sender.ts             # Resend integration
│
├── inngest.ts                    # Inngest client export
├── middleware.ts                 # Clerk auth middleware
├── .env.local                    # Environment variables
└── ...config files
```

---

## Build Phases

### Phase 1 — Foundation ✅ Starting now
- [ ] Next.js 14 project scaffold with TypeScript
- [ ] Tailwind CSS configured with Pulse design tokens (navy, cyan, type scale)
- [ ] Clerk auth integrated (signup, login, protected routes, middleware)
- [ ] Supabase project + schema migration
- [ ] Stripe products created ($297, $597, $1,197/mo) + webhook handler
- [ ] Landing page (already designed)
- [ ] Basic dashboard shell (sidebar, nav, empty states)

### Phase 2 — Integrations
- [ ] Google OAuth flow (server-side, PKCE)
- [ ] Google Ads data connector (TypeScript)
- [ ] GA4 data connector (TypeScript)
- [ ] Meta token exchange + data connector
- [ ] Shopify OAuth + data connector
- [ ] Integration status UI (connected / error / expired)

### Phase 3 — Report Engine
- [ ] Inngest setup + weekly scheduler (Sunday 8PM per timezone)
- [ ] Data fetch orchestrator (runs all connected integrations per user)
- [ ] Claude API commentary generation
- [ ] React Email report template (matches Pulse brand)
- [ ] Resend delivery + open tracking
- [ ] Report storage in Supabase (data_snapshot + html)
- [ ] Anomaly detection job (mid-week, Tuesday/Thursday)

### Phase 4 — Client Dashboard
- [ ] Live metrics overview (latest week at a glance)
- [ ] Report history feed with in-app preview
- [ ] Anomaly alerts feed
- [ ] Integration management UI (connect, disconnect, re-auth)
- [ ] Account + billing settings (Stripe Customer Portal)
- [ ] PDF export of any report

### Phase 5 — Agency / White-Label Tier
- [ ] Sub-account system (agency manages multiple client workspaces)
- [ ] Custom branding upload (logo, colors, domain)
- [ ] Reseller seat billing ($97/seat/mo)
- [ ] White-label email sending domain

### Phase 6 — Growth Features
- [ ] Klaviyo integration
- [ ] TikTok Ads integration
- [ ] HubSpot integration
- [ ] Slack delivery option
- [ ] WhatsApp delivery option
- [ ] Custom report frequency (weekly / bi-weekly / monthly)
- [ ] Referral program

---

## Environment Variables

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_GROWTH=
STRIPE_PRICE_SCALE=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=reports@pulse.app

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_DEVELOPER_TOKEN=
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=

# Meta
META_APP_ID=
META_APP_SECRET=

# App
NEXT_PUBLIC_APP_URL=https://pulse.app
ENCRYPTION_KEY=   # 32-byte key for encrypting OAuth tokens at rest
```

---

## Design System

### Brand
- **Product name:** Pulse
- **Tagline:** "Your business. Unmistakably clear. Every Monday."

### Color Palette
| Name | Hex | Usage |
|------|-----|-------|
| Navy | `#0A0F1E` | Primary background |
| Navy 2 | `#111827` | Card / surface background |
| Navy 3 | `#1A2235` | Elevated surface |
| Cyan | `#00E5CC` | Primary accent, CTA, highlights |
| Cyan Dim | `#00B8A4` | Hover states |
| White | `#F0F4FF` | Primary text |
| Muted | `#8892A4` | Secondary text, labels |
| Border | `rgba(255,255,255,0.08)` | Card borders, dividers |
| Success | `#4ADE80` | Positive delta, up arrows |
| Danger | `#F87171` | Negative delta, errors |

### Typography
- **Display / headings:** Space Grotesk — 700 weight, tight letter-spacing
- **Body / UI:** Inter — 400/500 weight
- **Monospace (tokens, IDs):** JetBrains Mono

### Spacing
- Base unit: 4px
- Component padding: 16px / 24px / 32px
- Section padding: 80px / 100px

---

## Key Differentiators vs Competitors

| Feature | Pulse | AgencyAnalytics | DashThis | Databox |
|---------|-------|----------------|----------|---------|
| AI-written analysis | ✅ | ❌ | ❌ | ❌ |
| Zero manual work after setup | ✅ | ❌ | ❌ | ❌ |
| Email delivery (not just dashboard) | ✅ | ✅ | ✅ | ❌ |
| Anomaly alerts | ✅ | ✅ | ❌ | ✅ |
| White-label reseller | ✅ | ✅ | ✅ | ❌ |
| Live in 48 hours | ✅ | ✅ | ✅ | ✅ |
| Starts at | $297 | $12 | $33 | $47 |

Pulse's pricing is premium and intentional. The value proposition is not a dashboard — it's eliminated work and better decisions. The AI commentary layer is the moat. No competitor does this.

---

## Revenue Model Summary

```
Starter:  $297/mo × 10 clients = $2,970 MRR
Growth:   $597/mo × 10 clients = $5,970 MRR
Scale:  $1,197/mo ×  5 clients = $5,985 MRR
                                -----------
25 clients total              = $14,925 MRR (~$179K ARR)

Tool costs at this scale: ~$400/month
Net margin: ~97%
```

---

*Last updated: June 15, 2026. This document is the single source of truth for the Pulse product. Update after every major architectural or product decision.*

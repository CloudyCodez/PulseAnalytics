-- Pulse — Initial Schema Migration
-- Run this in your Supabase project: SQL Editor → paste → Run
-- Or via CLI: supabase db push

-- ─── Extensions ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Users ──────────────────────────────────────────────────────────────────
-- Clerk manages auth. We store a mirror row here for data ownership + billing.
create table if not exists public.users (
  id                    uuid primary key default uuid_generate_v4(),
  clerk_user_id         text unique not null,
  email                 text not null,
  full_name             text,
  company_name          text,
  plan                  text not null default 'trial',  -- trial | starter | growth | scale | cancelled
  stripe_customer_id    text,
  stripe_subscription_id text,
  trial_ends_at         timestamptz default (now() + interval '14 days'),
  report_day            text not null default 'monday', -- day of week for delivery
  report_time           text not null default '07:00',  -- HH:MM local time
  timezone              text not null default 'America/New_York',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── Integrations ────────────────────────────────────────────────────────────
create table if not exists public.integrations (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.users(id) on delete cascade,
  provider          text not null,  -- ga4 | google_ads | meta | shopify | klaviyo | ...
  access_token      text,           -- encrypted at rest (AES-256 in app layer)
  refresh_token     text,           -- encrypted at rest
  token_expires_at  timestamptz,
  account_id        text,           -- Google Ads customer ID, Meta ad account ID, etc.
  property_id       text,           -- GA4 property ID
  store_url         text,           -- Shopify store URL
  extra             jsonb,          -- provider-specific extra data
  connected_at      timestamptz not null default now(),
  last_synced_at    timestamptz,
  status            text not null default 'active',  -- active | error | expired | disconnected
  error_message     text,
  unique(user_id, provider)
);

-- ─── Reports ─────────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  week_start      date not null,
  week_end        date not null,
  status          text not null default 'pending',  -- pending | generating | sent | failed
  data_snapshot   jsonb,   -- raw metric data used to generate this report
  ai_commentary   text,    -- Claude-generated analysis text
  email_html      text,    -- rendered email HTML (stored for re-send / preview)
  sent_at         timestamptz,
  error_message   text,
  created_at      timestamptz not null default now()
);

-- ─── Anomalies ───────────────────────────────────────────────────────────────
create table if not exists public.anomalies (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.users(id) on delete cascade,
  detected_at   timestamptz not null default now(),
  provider      text,         -- which integration triggered it
  metric        text,         -- e.g. 'meta_roas', 'ga4_sessions'
  change_pct    numeric,      -- percent change
  direction     text,         -- up | down
  message       text,         -- human-readable alert message
  alerted       boolean not null default false,
  alert_channel text          -- email | slack
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_users_clerk_user_id on public.users(clerk_user_id);
create index if not exists idx_users_stripe_customer_id on public.users(stripe_customer_id);
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_integrations_user_id on public.integrations(user_id);
create index if not exists idx_integrations_provider on public.integrations(provider);
create index if not exists idx_reports_user_id on public.reports(user_id);
create index if not exists idx_reports_status on public.reports(status);
create index if not exists idx_anomalies_user_id on public.anomalies(user_id);
create index if not exists idx_anomalies_alerted on public.anomalies(alerted);

-- ─── Updated_at trigger ──────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row execute procedure public.handle_updated_at();

-- ─── Row-Level Security ───────────────────────────────────────────────────────
-- Users can only see their own data. The service role key bypasses RLS (used
-- in Stripe webhook + Inngest jobs server-side).

alter table public.users enable row level security;
alter table public.integrations enable row level security;
alter table public.reports enable row level security;
alter table public.anomalies enable row level security;

-- Users: read/write own row only
-- The JWT sub claim from Clerk is matched against clerk_user_id.
-- Requires a Clerk JWT template in Supabase — see SETUP.md.
create policy "users_own" on public.users
  using (clerk_user_id = (auth.jwt() ->> 'sub'))
  with check (clerk_user_id = (auth.jwt() ->> 'sub'));

-- Integrations: scoped to user's own rows
create policy "integrations_own" on public.integrations
  using (user_id = (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub')))
  with check (user_id = (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub')));

-- Reports: scoped to user's own rows
create policy "reports_own" on public.reports
  using (user_id = (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub')))
  with check (user_id = (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub')));

-- Anomalies: scoped to user's own rows
create policy "anomalies_own" on public.anomalies
  using (user_id = (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub')))
  with check (user_id = (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub')));

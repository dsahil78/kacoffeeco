-- Kick Ass Coffee Co. — initial schema
-- Run with `supabase db push`, or paste into the Supabase SQL editor.
--
-- Every table here is written to exclusively by the Express API using the
-- service-role key. RLS is enabled with no policies, so the anon/publishable
-- key can read and write precisely nothing. The service role bypasses RLS.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- customers — one row per guest email. No auth, no accounts.
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id                      uuid primary key default gen_random_uuid(),
  email                   text not null unique,
  hyperswitch_customer_id text unique,
  full_name               text,
  shipping_address        jsonb,
  created_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- orders — one row per checkout attempt. Amounts are in minor units.
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                      uuid primary key default gen_random_uuid(),
  customer_id             uuid not null references public.customers (id) on delete restrict,
  plan                    text not null default 'monthly_kick'
                            check (plan in ('monthly_kick')),
  amount_cents            integer not null default 4900 check (amount_cents > 0),
  currency                text not null default 'USD',
  hyperswitch_payment_id  text unique,
  status                  text not null default 'created'
                            check (status in ('created', 'processing', 'succeeded', 'failed')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_created_at_idx  on public.orders (created_at desc);

-- ---------------------------------------------------------------------------
-- webhook_events — the idempotency ledger. `event_id` is unique, so a replayed
-- delivery loses the insert race and is skipped instead of reprocessed.
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null unique,
  event_type   text,
  payload      jsonb not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- keep orders.updated_at honest
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Lock everything down. No policies == no access for anon/authenticated roles.
-- ---------------------------------------------------------------------------
alter table public.customers      enable row level security;
alter table public.orders         enable row level security;
alter table public.webhook_events enable row level security;

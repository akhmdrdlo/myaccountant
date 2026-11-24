-- Rplanner: notifikasi push + catat otomatis
-- Jalankan di Supabase SQL Editor (atau `supabase db push`).
-- Aman dijalankan ulang (idempoten).

-- ─────────────────────────────────────────────────────────────
-- 1. Idempotensi transaksi otomatis (langganan, notifikasi, email)
-- ─────────────────────────────────────────────────────────────
alter table public.transactions add column if not exists source text not null default 'manual';
alter table public.transactions add column if not exists external_id text;

-- NULL dianggap berbeda oleh Postgres, jadi transaksi manual (external_id null) tidak bentrok.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_user_source_external_key') then
    alter table public.transactions
      add constraint transactions_user_source_external_key unique (user_id, source, external_id);
  end if;
end $$;

create index if not exists transactions_user_timestamp_idx on public.transactions (user_id, "timestamp" desc);

-- ─────────────────────────────────────────────────────────────
-- 2. Draft transaksi hasil deteksi (belum memengaruhi saldo)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.transaction_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('notification', 'email', 'share', 'shortcut')),
  external_id text not null,
  type text not null check (type in ('income', 'expense')),
  amount bigint not null check (amount > 0),
  category text not null default 'Lainnya',
  account_hint text,
  merchant text,
  confidence real not null default 0.5,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);

create index if not exists transaction_drafts_user_created_idx on public.transaction_drafts (user_id, created_at desc);

alter table public.transaction_drafts enable row level security;

drop policy if exists "drafts: pemilik baca" on public.transaction_drafts;
create policy "drafts: pemilik baca" on public.transaction_drafts
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "drafts: pemilik hapus" on public.transaction_drafts;
create policy "drafts: pemilik hapus" on public.transaction_drafts
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "drafts: pemilik tambah" on public.transaction_drafts;
create policy "drafts: pemilik tambah" on public.transaction_drafts
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- Realtime supaya draft baru langsung muncul di aplikasi yang sedang terbuka
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transaction_drafts'
  ) then
    alter publication supabase_realtime add table public.transaction_drafts;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Langganan Web Push per perangkat
-- ─────────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push: pemilik kelola" on public.push_subscriptions;
create policy "push: pemilik kelola" on public.push_subscriptions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. Preferensi notifikasi & catat otomatis
-- ─────────────────────────────────────────────────────────────
create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bill_reminder boolean not null default true,
  budget_alert boolean not null default true,
  daily_reminder boolean not null default false,
  daily_hour smallint not null default 20 check (daily_hour between 0 and 23),
  auto_confirm boolean not null default false,
  notify_on_capture boolean not null default true,
  timezone text not null default 'Asia/Jakarta',
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists "prefs: pemilik kelola" on public.notification_prefs;
create policy "prefs: pemilik kelola" on public.notification_prefs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────
-- 5. Token webhook catat otomatis (hanya hash yang disimpan)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.ingest_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token_hash text not null unique,
  token_hint text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.ingest_tokens enable row level security;

drop policy if exists "ingest: pemilik baca" on public.ingest_tokens;
create policy "ingest: pemilik baca" on public.ingest_tokens
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "ingest: pemilik hapus" on public.ingest_tokens;
create policy "ingest: pemilik hapus" on public.ingest_tokens
  for delete to authenticated using ((select auth.uid()) = user_id);

create extension if not exists pgcrypto with schema extensions;

-- Membuat/mengganti token. Token asli hanya dikembalikan sekali, lalu yang disimpan hanya SHA-256-nya.
create or replace function public.rotate_ingest_token()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  plain text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  plain := 'rpl_' || encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.ingest_tokens (user_id, token_hash, token_hint)
  values (uid, encode(extensions.digest(plain, 'sha256'), 'hex'), right(plain, 4))
  on conflict (user_id) do update
    set token_hash = excluded.token_hash,
        token_hint = excluded.token_hint,
        created_at = now(),
        last_used_at = null;
  return plain;
end;
$$;

revoke all on function public.rotate_ingest_token() from public, anon;
grant execute on function public.rotate_ingest_token() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 6. Log notifikasi terkirim (mencegah pengingat dobel)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.notification_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  dedupe_key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, dedupe_key)
);

alter table public.notification_log enable row level security;
-- Tidak ada policy: hanya service role (Edge Function) yang mengakses.

-- ─────────────────────────────────────────────────────────────
-- 7. Jadwal pengingat tiap jam (butuh ekstensi pg_cron + pg_net)
--    Ganti xsuonvqwjzoazsgfuyfd dan simpan CRON_SECRET di Vault terlebih dulu:
--    select vault.create_secret('<isi-acak-panjang>', 'cron_secret');
-- ─────────────────────────────────────────────────────────────
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
-- select cron.schedule(
--   'rplanner-reminders-hourly',
--   '5 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://xsuonvqwjzoazsgfuyfd.supabase.co/functions/v1/reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

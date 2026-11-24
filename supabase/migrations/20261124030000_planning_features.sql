-- Rplanner: periode gajian, utang-piutang, cicilan, aturan merchant, tag. Aman dijalankan ulang.

-- 1. Pengaturan pengguna
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payday smallint not null default 1 check (payday between 1 and 31),
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
drop policy if exists "settings: pemilik kelola" on public.user_settings;
create policy "settings: pemilik kelola" on public.user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 2. Utang-piutang dengan orang lain
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person text not null,
  -- 'owe' = aku berutang ke dia; 'owed' = dia berutang ke aku
  direction text not null check (direction in ('owe', 'owed')),
  amount bigint not null check (amount > 0),
  note text,
  due_date date,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists debts_user_open_idx on public.debts (user_id) where settled_at is null;
alter table public.debts enable row level security;
drop policy if exists "debts: pemilik kelola" on public.debts;
create policy "debts: pemilik kelola" on public.debts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 3. Cicilan & paylater
create table if not exists public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  account text,
  monthly_amount bigint not null check (monthly_amount > 0),
  total_months smallint not null check (total_months between 1 and 360),
  paid_months smallint not null default 0 check (paid_months >= 0),
  due_day smallint not null check (due_day between 1 and 31),
  created_at timestamptz not null default now()
);
create index if not exists installments_user_idx on public.installments (user_id);
alter table public.installments enable row level security;
drop policy if exists "installments: pemilik kelola" on public.installments;
create policy "installments: pemilik kelola" on public.installments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 4. Aturan kategori per merchant (dipelajari dari koreksi pengguna)
create table if not exists public.merchant_rules (
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant_key text not null,
  category text not null,
  account text,
  hits integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, merchant_key)
);
alter table public.merchant_rules enable row level security;
drop policy if exists "merchant_rules: pemilik kelola" on public.merchant_rules;
create policy "merchant_rules: pemilik kelola" on public.merchant_rules
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 5. Tag/label lintas kategori (mis. "Liburan Bali")
alter table public.transactions add column if not exists tags text[] not null default '{}';
create index if not exists transactions_tags_idx on public.transactions using gin (tags);

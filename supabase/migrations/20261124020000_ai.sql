-- Rplanner: pembatas pemakaian AI + preferensi ringkasan mingguan. Aman dijalankan ulang.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Jakarta')::date,
  calls integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage: pemilik baca" on public.ai_usage;
create policy "ai_usage: pemilik baca" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- Tambah 1 pemakaian; kembalikan false jika sudah melewati batas harian.
create or replace function public.bump_ai_usage(p_user uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Jakarta')::date;
  n integer;
begin
  insert into public.ai_usage (user_id, day, calls)
  values (p_user, today, 1)
  on conflict (user_id, day) do update set calls = public.ai_usage.calls + 1
  returning calls into n;
  return n <= p_limit;
end;
$$;

-- Hanya Edge Function (service role) yang boleh memanggil
revoke all on function public.bump_ai_usage(uuid, integer) from public, anon, authenticated;

alter table public.notification_prefs add column if not exists weekly_summary boolean not null default true;
alter table public.notification_prefs add column if not exists ai_fallback boolean not null default true;

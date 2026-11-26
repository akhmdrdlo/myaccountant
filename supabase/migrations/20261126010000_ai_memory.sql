-- Rplanner: memori AI per pengguna. Aman dijalankan ulang.
-- Isolasi antar pengguna dijamin RLS: setiap baris hanya bisa dibaca/diubah pemiliknya.

create table if not exists public.ai_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'konteks' check (kind in ('profil', 'tujuan', 'gaya', 'konteks')),
  content text not null check (char_length(content) between 1 and 280),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_memory_user_idx on public.ai_memory (user_id);

alter table public.ai_memory enable row level security;
-- FORCE: pemilik tabel pun tunduk RLS (service role tetap bisa, dan tidak dipakai untuk tabel ini)
alter table public.ai_memory force row level security;

drop policy if exists "ai_memory: pemilik baca" on public.ai_memory;
create policy "ai_memory: pemilik baca" on public.ai_memory
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "ai_memory: pemilik tambah" on public.ai_memory;
create policy "ai_memory: pemilik tambah" on public.ai_memory
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "ai_memory: pemilik ubah" on public.ai_memory;
create policy "ai_memory: pemilik ubah" on public.ai_memory
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "ai_memory: pemilik hapus" on public.ai_memory;
create policy "ai_memory: pemilik hapus" on public.ai_memory
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Tidak ada akses untuk anon sama sekali
revoke all on public.ai_memory from anon;

-- Batas 30 catatan per pengguna (menjaga biaya token & mencegah penyalahgunaan)
create or replace function public.ai_memory_limit()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if (select count(*) from public.ai_memory where user_id = new.user_id) >= 30 then
    raise exception 'Memori penuh (maksimal 30 catatan). Hapus yang tidak perlu dulu.';
  end if;
  return new;
end $$;

drop trigger if exists ai_memory_limit on public.ai_memory;
create trigger ai_memory_limit before insert on public.ai_memory
  for each row execute function public.ai_memory_limit();

-- Rplanner: penjaga isi memori AI + klaim perangkat push. Aman dijalankan ulang.

-- 1. Tolak isi yang tampak seperti rahasia, sama dengan cek di aplikasi (looksSensitive),
--    supaya akses langsung ke API pun tidak bisa menyimpannya.
alter table public.ai_memory drop constraint if exists ai_memory_no_secret;
alter table public.ai_memory add constraint ai_memory_no_secret check (
  regexp_replace(content, '[\s-]', '', 'g') !~ '\d{8,}'
  and content !~* '\m(pin|password|kata sandi|otp|cvv|token)\M'
) not valid;  -- baris lama tidak diperiksa ulang; semua insert/update baru diperiksa

-- 2. Satu perangkat (endpoint) hanya milik satu akun.
--    Upsert biasa gagal kalau endpoint masih tercatat atas nama akun lain (RLS menolak UPDATE),
--    sehingga pengingat akun lama tetap masuk ke HP ini. Fungsi ini memindahkan endpoint
--    ke akun yang sedang login. Memegang endpoint (URL rahasia dari browser) = bukti perangkatnya.
create or replace function public.claim_push_endpoint(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_endpoint is null or p_endpoint !~ '^https://' then raise exception 'endpoint tidak valid'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id <> uid;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 200))
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;
end $$;

revoke all on function public.claim_push_endpoint(text, text, text, text) from public, anon;
grant execute on function public.claim_push_endpoint(text, text, text, text) to authenticated;

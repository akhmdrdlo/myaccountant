-- Uji isolasi memori AI antar pengguna. Jalankan: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

-- Pengguna A menulis satu catatan
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.ai_memory (kind, content) values ('profil', 'Catatan rahasia milik A');
select is((select count(*)::int from public.ai_memory), 1, 'A melihat catatannya sendiri');

select throws_ok(
  $$insert into public.ai_memory (user_id, kind, content) values ('00000000-0000-0000-0000-00000000000b', 'profil', 'menyusup')$$,
  '42501', null, 'A tidak bisa menulis atas nama B');
select throws_ok($$insert into public.ai_memory (content) values ('rekening 1234567890')$$, '23514', null, 'nomor panjang ditolak database');
select throws_ok($$insert into public.ai_memory (content) values ('pin aku 1234')$$, '23514', null, 'kata PIN ditolak database');

-- Pengguna B tidak boleh melihat / mengubah / menghapus milik A
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select count(*)::int from public.ai_memory), 0, 'B tidak melihat catatan A');
update public.ai_memory set content = 'diubah B';
delete from public.ai_memory;
select is((select count(*)::int from public.ai_memory where content = 'diubah B'), 0, 'B tidak bisa mengubah');

-- Anon tidak punya akses sama sekali
reset role;
set local role anon;
select throws_ok($$select * from public.ai_memory$$, '42501', null, 'anon ditolak');

-- Kembali ke A: catatan utuh
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select content from public.ai_memory limit 1), 'Catatan rahasia milik A', 'catatan A tidak tersentuh B');
select is((select count(*)::int from public.ai_memory), 1, 'catatan A tidak terhapus B');

select * from finish();
rollback;

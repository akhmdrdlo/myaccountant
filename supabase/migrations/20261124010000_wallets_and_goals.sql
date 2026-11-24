-- Rplanner: institusi dompet (logo bank/e-wallet) + wishlist tertaut ke akun.
-- Aman dijalankan ulang.

-- 1. Jenis institusi per akun (id dari src/lib/institutions.ts, mis. 'bca', 'gopay', 'cash')
alter table public.accounts add column if not exists institution text;

-- Isi otomatis untuk akun lama berdasarkan namanya
update public.accounts set institution = case
  when name ~* '(^|[^a-z])(cash|tunai|kantong)([^a-z]|$)' then 'cash'
  when name ~* 'seabank|sea bank' then 'seabank'
  when name ~* 'gopay ?later' then 'gopaylater'
  when name ~* 'gopay|gojek' then 'gopay'
  when name ~* 'shopee ?pay' then 'shopeepay'
  when name ~* '(^|[^a-z])ovo([^a-z]|$)' then 'ovo'
  when name ~* '(^|[^a-z])dana([^a-z]|$)' then 'dana'
  when name ~* 'mandiri|livin' then 'mandiri'
  when name ~* '(^|[^a-z])bca([^a-z]|$)' then 'bca'
  when name ~* '(^|[^a-z])bri([^a-z]|$)|brimo' then 'bri'
  when name ~* '(^|[^a-z])bni([^a-z]|$)' then 'bni'
  when name ~* '(^|[^a-z])btn([^a-z]|$)' then 'btn'
  when name ~* '(^|[^a-z])bsi([^a-z]|$)' then 'bsi'
  when name ~* 'jago' then 'jago'
  when name ~* 'jenius' then 'jenius'
  else null
end
where institution is null;

-- Nama dompet unik per pengguna (dilewati jika data lama masih punya nama ganda)
do $$
begin
  create unique index if not exists accounts_user_name_key on public.accounts (user_id, name);
exception when unique_violation then
  raise notice 'Ada nama akun ganda; indeks unik dilewati. Rapikan dulu lalu jalankan ulang.';
end $$;

-- 2. Wishlist yang jumlah terkumpulnya mengikuti saldo satu akun
alter table public.goals add column if not exists linked_account text;

-- Pertahankan perilaku lama: wishlist bernama "barang harapan"/"wishlist" dulu otomatis ikut saldo SeaBank
update public.goals g
set linked_account = a.name
from public.accounts a
where g.linked_account is null
  and a.user_id = g.user_id
  and a.name ~* 'seabank|sea bank'
  and g.name ~* 'barang harapan|wishlist';

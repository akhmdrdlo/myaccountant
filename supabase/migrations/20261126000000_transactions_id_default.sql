-- Rplanner: beri default UUID untuk transactions.id (pengaman; aplikasi juga sudah membuat id sendiri).
-- Aman dijalankan ulang. Hanya berlaku bila kolom id bertipe uuid atau text.
do $$
declare
  t text;
begin
  select data_type into t from information_schema.columns
  where table_schema = 'public' and table_name = 'transactions' and column_name = 'id';

  if t = 'uuid' then
    alter table public.transactions alter column id set default gen_random_uuid();
  elsif t in ('text', 'character varying') then
    alter table public.transactions alter column id set default gen_random_uuid()::text;
  else
    raise notice 'transactions.id bertipe %, default tidak diubah', t;
  end if;
end $$;

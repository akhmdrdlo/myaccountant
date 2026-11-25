# Setup notifikasi push & catat otomatis

Kode sudah siap. Langkah di bawah menyambungkannya ke project Supabase kamu. Semua perintah dijalankan dari root project.

## 1. Migrasi database

Buka Supabase Dashboard → SQL Editor, lalu jalankan **berurutan** (semuanya aman diulang):

1. `supabase/migrations/20261124000000_push_and_autocapture.sql`
2. `supabase/migrations/20261124010000_wallets_and_goals.sql` (logo dompet + wishlist tertaut akun)
3. `supabase/migrations/20261124020000_ai.sql` (batas pemakaian AI + ringkasan mingguan)
4. `supabase/migrations/20261124030000_planning_features.sql` (tanggal gajian, utang-piutang, cicilan, aturan kategori merchant, tag)

Ini menambah:
- kolom `source` + `external_id` di `transactions` (anti-duplikat transaksi otomatis)
- tabel `transaction_drafts`, `push_subscriptions`, `notification_prefs`, `ingest_tokens`, `notification_log` (semua dengan RLS)
- fungsi `rotate_ingest_token()`

## 2. Kunci VAPID & secrets

Kunci sudah dibuat:
- kunci publik → `.env` (`VITE_VAPID_PUBLIC_KEY`)
- kunci privat + `CRON_SECRET` → `supabase/.env.local` (ter-ignore git, jangan dibagikan)

Edit `VAPID_SUBJECT` di `supabase/.env.local` jadi `mailto:` email kamu, lalu:

```powershell
npx supabase login
```

```powershell
npx supabase link --project-ref xsuonvqwjzoazsgfuyfd
```

```powershell
npx supabase secrets set --env-file supabase/.env.local
```

## 3. API key Claude (fitur AI)

Buat API key di console.anthropic.com, tambahkan dua baris ini ke `supabase/.env.local`, lalu jalankan ulang `secrets set` di atas:

```
ANTHROPIC_API_KEY=sk-ant-...
AI_DAILY_LIMIT=150
```

Setelah key diset dan fungsi `ai` ter-deploy, ubah `VITE_AI_ENABLED=true` di `.env` (dan di env hosting), lalu build ulang. Selama `false`, tombol Pindai struk, Tanya AI, dan "Baca pakai AI" disembunyikan.

Model: **Claude Haiku 5.5** (`claude-haiku-5-5`, $0.10 / $0.50 per 1 juta token). Perkiraan per pemakaian: notifikasi ±400 token, foto struk ±1.500 token, satu pertanyaan Tanya AI ±3.000 token. Tanpa key ini aplikasi tetap jalan; fitur AI saja yang menampilkan "AI belum diaktifkan".

## 4. Deploy Edge Functions

Deploy ulang juga fungsi yang sudah ada, karena isinya berubah (AI cadangan, filter promo/OTP, ringkasan mingguan):

```powershell
npx supabase functions deploy ingest reminders push-test ai
```

`config.toml` sudah mengatur `ingest` & `reminders` tanpa verifikasi JWT (keduanya pakai token/secret sendiri).

## 5. Jadwal pengingat (pg_cron)

Di Dashboard → Database → Extensions, aktifkan **pg_cron** dan **pg_net**. Lalu di SQL Editor:

```sql
select vault.create_secret('<isi CRON_SECRET dari supabase/.env.local>', 'cron_secret');
```

Setelah itu jalankan blok `cron.schedule(...)` di bagian 7 file migrasi pertama (hapus tanda `--` di awal barisnya; URL sudah berisi project ref kamu). Kalau secret `cron_secret` sudah ada, pakai `vault.update_secret` sebagai gantinya.

## 6. Deploy PWA

Push/Share Target butuh HTTPS. Deploy `dist/` (hasil `npm run build`) ke Vercel/Netlify/Cloudflare Pages dan tambahkan env `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.

## 7. Di HP

1. Buka situs → **Pasang aplikasi** (Android) / **Bagikan → Tambah ke Layar Utama** (iPhone).
2. Buka Rplanner dari ikon → ikon lonceng → **Aktifkan notifikasi** → **Kirim tes**.
3. **Buat token**, lalu ikuti panduan di layar yang sama: Autox.js (Android, gratis), MacroDroid, email, atau Shortcuts (iPhone).

### Android dengan Autox.js (gratis)

Autox.js adalah aplikasi otomasi JavaScript open source (turunan Auto.js). Lisensinya melarang pemakaian komersial, jadi cocok untuk pemakaian pribadi.

1. Pasang Autox.js dari halaman Releases proyeknya di GitHub, lalu aktifkan **Foreground service** di pengaturan Autox.
2. Di Rplanner: lonceng → **Buat token** → buka panduan Autox → **Salin skrip Autox**. Token dan URL webhook sudah terisi.
   Template tanpa token juga ada di [`tools/autox/rplanner.js`](../tools/autox/rplanner.js).
3. Di Autox: buat file baru, tempel, simpan sebagai `rplanner.js`, lalu jalankan.
4. Saat pertama jalan, Autox membuka pengaturan **Akses notifikasi**. Izinkan, lalu jalankan skripnya sekali lagi.
5. Set Autox ke **Tidak dibatasi** di pengaturan baterai HP.

Skrip hanya meneruskan notifikasi dari daftar `APPS` (bank & e-wallet umum). Kalau bank-mu belum ada, ubah `CARI_NAMA_PAKET = true`, lihat nama paket di log Autox, tambahkan ke `APPS`, lalu kembalikan ke `false`.

## Cara uji webhook tanpa HP

```powershell
curl.exe -X POST "https://xsuonvqwjzoazsgfuyfd.supabase.co/functions/v1/ingest" -H "x-rplanner-token: <TOKEN>" -H "Content-Type: application/json" -d '{\"text\":\"Pembayaran QRIS Rp 25.000 di KOPI KENANGAN berhasil\",\"app\":\"BRImo\"}'
```

Respons `{"captured":true,"mode":"draft"}` berarti draft masuk ke **Transaksi terdeteksi**.

## Batasan yang perlu diketahui

- Aplikasi web tidak bisa membaca notifikasi aplikasi lain. Itu sebabnya Android memakai MacroDroid/Tasker sebagai jembatan, dan iPhone memakai Shortcuts atau email.
- iOS: push hanya untuk PWA yang sudah dipasang, iOS 16.4+.
- Parser berbasis pola teks bank Indonesia (`supabase/functions/_shared/parseBankText.ts`). Kalau format bankmu tidak terbaca, tambahkan pola di sana. Parser yang sama dipakai PWA dan server.

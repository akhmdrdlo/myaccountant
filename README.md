# Rplanner

Aplikasi pencatat keuangan pribadi berbentuk PWA, dibuat untuk pengguna Indonesia. Bisa dipasang di HP seperti aplikasi biasa, jalan offline, dan bisa mencatat transaksi otomatis dari notifikasi bank atau e-wallet.

*Your Cash, Your Control.*

## Fitur

**Mencatat**
- Pemasukan, pengeluaran, dan transfer antar dompet. Transaksi bisa diedit dan dihapus, dan bisa diberi tag seperti `#liburan bali`.
- Dompet untuk tunai, rekening bank, e-wallet, dan paylater, dengan logo dari katalog 40 bank dan e-wallet Indonesia. Akun baru dimulai dengan satu "Kantong Utama".
- Impor mutasi rekening dari file CSV internet banking (BCA, Mandiri, dan format serupa). Impor yang sama tidak akan tercatat dua kali.
- Mode offline: transaksi yang gagal terkirim disimpan di HP dan dikirim otomatis saat online.

**Catat otomatis**
- Notifikasi bank atau e-wallet diteruskan ke webhook pribadi lewat MacroDroid/Tasker (Android), email, atau Shortcuts (iPhone).
- Parser membaca nominal, arah uang, merchant, dan kategori. Promo dan OTP diabaikan.
- Hasilnya masuk sebagai draft untuk dikonfirmasi. Kategori yang kamu koreksi diingat untuk merchant yang sama.
- Dari HP juga bisa lewat menu Bagikan: tekan lama notifikasi atau SMS, pilih Bagikan, lalu Rplanner.

**Merencanakan**
- Periode anggaran mengikuti tanggal gajian, bukan bulan kalender.
- "Aman dibelanjakan hari ini": saldo dikurangi tagihan, cicilan, dan utang yang jatuh tempo sebelum gajian, dikurangi dana darurat, lalu dibagi sisa hari.
- Budget per kategori, langganan yang tercatat otomatis, wishlist dengan target tabungan per bulan.
- Utang-piutang dengan teman, cicilan dan paylater dengan progres bulanan.
- Kekayaan bersih 12 bulan terakhir dan rekap tahunan.

**Notifikasi**
- Web Push untuk tagihan, cicilan, dan utang yang jatuh tempo besok, budget 80% dan 100%, ringkasan mingguan, serta pengingat harian kalau belum mencatat.

**AI (opsional, Claude Haiku 5.5)**
- Pindai struk dari foto, Tanya AI soal keuanganmu, dan cadangan parser untuk format notifikasi yang tidak dikenali.
- Mati secara bawaan. Butuh API key Anthropic sendiri (dibayar per pemakaian, sekitar beberapa ribu rupiah per bulan untuk pemakaian pribadi).

**Keamanan**
- Setiap pengguna hanya bisa membaca datanya sendiri lewat Row Level Security di Supabase.
- Kunci aplikasi dengan sidik jari atau wajah (WebAuthn) di perangkat yang mendukung.
- Semua kunci rahasia (VAPID, API key AI, service role) hanya disimpan sebagai secret di Supabase.

## Teknologi

React 19, TypeScript, Vite 7, Tailwind CSS 3, Zustand, Recharts, vite-plugin-pwa (Workbox). Backend memakai Supabase: Postgres + RLS, Auth, Realtime, Edge Functions (Deno), dan pg_cron.

## Menjalankan di komputer

Butuh Node.js 20 atau lebih baru dan project Supabase.

```bash
git clone https://github.com/akhmdrdlo/myaccountant.git
cd myaccountant
npm install
```

Buat file `.env` di root project:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_VAPID_PUBLIC_KEY=<kunci publik VAPID>
VITE_AI_ENABLED=false
```

Kunci VAPID bisa dibuat dengan `npx web-push generate-vapid-keys`. Kunci publiknya masuk ke `.env`, kunci privatnya ke `supabase/.env.local` (file ini tidak ikut di-commit).

```bash
npm run dev       # server pengembangan
npm run build     # typecheck + build produksi
npm run preview   # coba hasil build (dipakai untuk menguji PWA dan notifikasi)
```

## Menyiapkan Supabase

1. Jalankan file di `supabase/migrations/` secara berurutan di SQL Editor. Semuanya aman dijalankan ulang.
2. Isi `supabase/.env.local` (VAPID, `CRON_SECRET`, dan `ANTHROPIC_API_KEY` kalau memakai AI), lalu kirim ke Supabase:
   ```bash
   npx supabase secrets set --env-file supabase/.env.local
   ```
3. Deploy Edge Functions:
   ```bash
   npx supabase functions deploy ingest reminders push-test ai
   ```
4. Aktifkan pg_cron dan pg_net, lalu jadwalkan fungsi `reminders` tiap jam.

Langkah lengkapnya, termasuk cara menghubungkan MacroDroid dan Shortcuts, ada di [docs/SETUP-NOTIFIKASI.md](docs/SETUP-NOTIFIKASI.md).

## Struktur singkat

```
src/
  components/      layar dan komponen (home, planning, analytics, notifications, common)
  hooks/           akses data Supabase, navigasi, draft, perencanaan
  lib/             logika murni: periode gajian, safe-to-spend, impor CSV, push, AI
  store/           state keuangan (Zustand)
  sw.ts            service worker: cache offline, push, klik notifikasi
supabase/
  migrations/      skema database
  functions/       ingest, reminders, push-test, ai, dan kode bersama di _shared/
docs/              brand kit, aturan pengembangan, panduan setup
```

Aturan desain dan pengembangan ada di [docs/BRANDKIT.md](docs/BRANDKIT.md) dan [docs/rules.md](docs/rules.md).

## Batasan

- Aplikasi web tidak bisa membaca notifikasi aplikasi lain secara langsung. Karena itu Android memakai MacroDroid/Tasker sebagai jembatan, dan iPhone memakai Shortcuts atau email.
- Di iPhone, notifikasi push hanya jalan untuk aplikasi yang sudah ditambahkan ke Layar Utama (iOS 16.4 atau lebih baru).
- Notifikasi push dan menu Bagikan butuh HTTPS, jadi untuk menguji di HP aplikasi harus di-deploy dulu.

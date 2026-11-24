# Rplanner — Personal Finance PWA

Aplikasi pencatat keuangan pribadi (pemasukan, pengeluaran, transfer, budget, langganan, wishlist, investasi) berbentuk PWA mobile-first untuk pengguna Indonesia.

## Source of Truth
- Brand & visual: @docs/BRANDKIT.md
- Aturan wajib: @docs/rules.md

## Tech Stack
- React 19 + TypeScript + Vite 7
- Tailwind CSS 3 (token `rp-*` dari CSS variables, dark mode via class)
- Zustand (`src/store/useFinanceStore.ts`) untuk state; Supabase (Postgres + RLS + Auth) untuk data (`src/hooks/useSupabase.ts`)
- `vite-plugin-pwa` untuk service worker & manifest
- Recharts, lucide-react, sonner, date-fns

## Commands
- Dev: `npm run dev`
- Build (termasuk typecheck): `npm run build`
- Preview build produksi (wajib untuk uji PWA/notifikasi): `npm run preview`
- Lint: `npm run lint`

## Peta Kode
- `src/App.tsx` — shell, tab, sub-view, deep link (jangan menambah logika bisnis di sini)
- `src/hooks/useAppNavigation.ts` — tab/sub-layar tersinkron dengan history (tombol Back Android)
- `src/components/home/*` — layar & widget beranda
- `src/components/layout/*` — TopBar, BottomNav, Layout, SubviewHeader
- `src/components/notifications/*` — NotificationCenter (push, pengingat, setup catat otomatis) & DraftInbox
- `src/store/*` — state keuangan & tema
- `src/hooks/useSupabase.ts` — akses database; `useDrafts.ts` — draft transaksi + realtime
- `src/lib/push.ts` — Web Push client; `src/lib/parseBankText.ts` → re-export parser bersama
- `src/sw.ts` — service worker (precache, push, notificationclick); manifest + share target di `vite.config.ts`
- `supabase/migrations/*` — skema; `supabase/functions/{ingest,reminders,push-test}` — Edge Functions (Deno)
- `supabase/functions/_shared/parseBankText.ts` — SATU parser untuk PWA & server; tambah pola bank di sini (termasuk filter promo/OTP `isNoise`)
- `supabase/functions/_shared/ai.ts` + `functions/ai` — Claude Haiku 5.5 (`claude-haiku-5-5`): cadangan parser, baca struk, Tanya AI, ringkasan mingguan. Key hanya di secret `ANTHROPIC_API_KEY`; kuota harian via `bump_ai_usage`
- `src/lib/ai.ts` — pemanggil fungsi `ai` dari PWA + `buildFinanceSummary` (hanya agregat, bukan riwayat penuh)
- `src/lib/institutions.ts` + `components/common/InstitutionLogo.tsx` — katalog bank/e-wallet/paylater & logo lencana. File logo resmi: `public/logos/<id>.svg` + daftarkan di `LOGO_FILES`
- `src/lib/offlineQueue.ts` — transaksi gagal kirim disimpan di HP (`external_id = offline:<uuid>`) dan dikirim ulang saat online
- Akun baru hanya punya "Kantong Utama"; dompet lain ditambah lewat layar Dompet dan disimpan ke tabel `accounts` (kolom `institution`)
- `src/lib/period.ts` — periode anggaran dari tanggal gajian (`payday`). SEMUA hitungan "bulan ini" pakai `period` dari store, bukan `getMonth()`
- `src/lib/safeToSpend.ts` — "aman dibelanjakan": saldo − tagihan/cicilan/utang sebelum gajian − dana darurat, dibagi sisa hari
- `src/hooks/usePlanning.ts` — gajian, utang-piutang (`debts`), cicilan (`installments`), aturan merchant (`merchant_rules`)
- `supabase/functions/_shared/merchant.ts` — kunci merchant bersama; kategori yang dikoreksi pengguna dipelajari & dipakai di form, inbox, dan ingest
- `src/lib/statementImport.ts` — parser CSV mutasi (BCA/Mandiri/dll), impor idempoten `source='import'`
- `src/lib/appLock.ts` + `components/auth/AppLock.tsx` — kunci sidik jari (WebAuthn) di perangkat
- `components/planning/*` (Utang, Cicilan, Impor, Tanggal gajian), `components/analytics/*` (Kekayaan bersih, Rekap tahunan), `components/common/Sheet.tsx` (bottom sheet + field standar)
- Kategori `Utang-piutang` dan transfer bersifat netral (tidak dihitung pemasukan/pengeluaran) — lihat `isNeutralCategory`
- Fitur AI tampil hanya jika `VITE_AI_ENABLED=true`
- Typecheck Edge Functions: `npx deno check --config supabase/functions/deno.json supabase/functions/*/index.ts`
- Warisan (jangan dikembangkan): `db/`, `google_apps_script.js`, `src/services/localDb.ts` (masih dipakai untuk metadata akun lokal)

## Setup notifikasi & catat otomatis
Lihat `docs/SETUP-NOTIFIKASI.md`. Secrets server ada di `supabase/.env.local` (ter-ignore) — jangan pernah dipindah ke `VITE_*`.

## Catatan Styling
- Token `rp-*` didefinisikan sebagai triplet RGB di `src/index.css` dan dipetakan di `tailwind.config.js`.
- Skala Tailwind `blue/green/red/amber/orange/gray` DITIMPA dengan turunan brand, jadi kelas lama ikut konsisten. Warna lain (purple, pink, teal, dll) jangan dipakai.
- `rp-navy` di mode gelap menjadi biru muda (untuk teks). Untuk latar tombol berteks putih pakai `bg-blue-800` atau `bg-rp-action`.

## Domain Notes
- Tipe transaksi: `income | expense | transfer | adjustment`. Transfer dicatat sebagai dua entri.
- Kategori default: Makan Weekday, Makan Weekend, Transport, Jajan/Hobi, Utilitas, Kos (Tabungan), Lainnya.
- "Dana Darurat (Safety Buffer)" disimpan sebagai budget khusus.

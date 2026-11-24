# Rules — Rplanner

Aturan wajib untuk siapa pun (manusia atau AI) yang mengubah kode Rplanner.

## A. Data & Keuangan (paling penting)
1. **Uang disimpan sebagai integer Rupiah.** Tidak ada float untuk nominal; parsing input selalu buang titik/koma ribuan dulu.
2. **Saldo tidak pernah disimpan, selalu dihitung** dari saldo awal + transaksi (lihat `useFinanceStore`). Jangan menambah kolom "balance" yang bisa tidak sinkron.
3. **Transfer = dua entri berpasangan** (keluar dari akun A, masuk ke akun B) dan tidak dihitung sebagai pemasukan/pengeluaran di analitik.
4. **Pencatatan otomatis harus idempoten.** Setiap transaksi otomatis (langganan, notifikasi bank, email) punya `source` + `external_id` unik; insert memakai upsert/unique constraint di database, bukan cek di client.
5. **Transaksi otomatis masuk sebagai draft** (`status: 'pending'`) sampai dikonfirmasi pengguna, kecuali pengguna mengaktifkan "catat langsung" untuk sumber tersebut.
6. Jangan hardcode nama akun/bank tertentu (mis. "Seabank", "Cash") di logika. Pakai id akun dari tabel `accounts` dan pengaturan pengguna.

## B. Keamanan
1. Semua data lewat Supabase dengan RLS aktif. Tidak ada endpoint yang membaca data berdasarkan `username` dari query string.
2. Kunci rahasia (service role, VAPID private key, API AI) hanya di Supabase Edge Function secrets, tidak pernah di `VITE_*` atau di repo.
3. Webhook masuk (notifikasi bank, email) wajib diverifikasi dengan token per-pengguna yang bisa dicabut.
4. Teks notifikasi/email mentah tidak disimpan lebih lama dari yang diperlukan untuk parsing; simpan hasil parse saja.

## C. UI
1. Ikuti `docs/BRANDKIT.md`. Warna hanya dari token `rp-*`; dilarang kelas warna mentah Tailwind (`text-purple-600`, `bg-pink-50`, …) di komponen baru.
2. Teks informasi minimal 12px; target sentuh minimal 44×44px; kontras teks ≥ 4.5:1 di mode terang dan gelap.
3. Setiap layar data punya 4 keadaan: loading (skeleton), kosong (dengan aksi), error (dengan coba lagi), dan terisi.
4. Tidak ada UI untuk fitur yang belum berfungsi. Pakai feature flag dan sembunyikan.
5. Nominal selalu memakai `.rp-num` (tabular) dan helper format tunggal `formatRupiah()` di `src/lib/utils.ts`.
6. Navigasi sub-layar harus mendukung tombol Back Android (history API), bukan hanya state `currentSubview`.

## D. Arsitektur Kode
1. `App.tsx` hanya merangkai layout & routing. Logika data di hooks/store, tampilan di komponen.
2. Satu sumber data: Supabase. `server.js` + `db/*.json` dan Google Apps Script adalah warisan; jangan menambah fitur di sana.
3. Komponen > 250 baris dipecah. Satu komponen, satu tanggung jawab.
4. TypeScript strict; dilarang `any` baru.

## E. Verifikasi Sebelum Selesai
1. `npm run build` lulus tanpa error, `npm run lint` bersih untuk file yang disentuh.
2. Cek tampilan di 360px dan 414px (mode terang & gelap) lewat browser preview.
3. Untuk fitur PWA/notifikasi: uji di build produksi (`npm run build && npm run preview`), bukan hanya dev server.

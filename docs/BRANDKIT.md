# BRANDKIT — Rplanner

> **"Your Cash, Your Control."** Pencatat keuangan pribadi yang tenang, jujur, dan cepat dipakai satu tangan.

## 1. Arah Visual

**Buku kas yang rapi, bukan kasino.** Rplanner terasa seperti buku catatan akuntan yang bersih: angka jadi pahlawan, warna dipakai hemat dan selalu punya arti. Identitas diambil dari logo (dua lembar "buku" miring: biru langit + biru royal → navy).

Prinsip:
1. **Angka dulu.** Saldo, pemasukan, pengeluaran harus terbaca dalam 2 detik. Dekorasi tidak boleh bersaing dengan angka.
2. **Warna = makna.** Hijau hanya untuk uang masuk, merah hanya untuk uang keluar/bahaya, oranye hanya untuk aksi utama. Tidak ada warna "biar rame".
3. **Satu tangan, satu ibu jari.** Aksi penting ada di sepertiga bawah layar, target sentuh ≥ 44px.
4. **Tenang saat boros, tegas saat bahaya.** Peringatan budget memakai bahasa dan warna bertingkat, bukan alarm merah di semua tempat.

### Anti-pola (JANGAN)
- Grid menu pelangi (tiap ikon beda warna: ungu, pink, teal, kuning…). Ikon fitur memakai satu warna brand.
- Gradien + blur glow dekoratif (`blur-2xl`, `bg-gradient-to-r from-x/10`) dan kartu glassmorphism.
- Badge "AI" / "NEW" yang menempel di fitur yang belum jalan.
- Teks di bawah 12px untuk informasi (10px hanya untuk label tab bar).
- Meniru identitas bank (nama token, warna, atau layout BRImo/BCA/dll). Rplanner punya wajah sendiri.
- Emoji sebagai ikon UI; ilustrasi stok; blob 3D.

## 2. Token Warna

Didefinisikan sebagai CSS custom property di `src/index.css`, dipetakan ke Tailwind sebagai `rp-*`.

```css
:root {
  /* Surface */
  --rp-canvas: #F4F7FB;        /* latar aplikasi */
  --rp-surface: #FFFFFF;       /* kartu, sheet */
  --rp-surface-2: #EAF2FB;     /* panel sekunder, chip aktif */
  --rp-line: #DCE5F0;          /* border & divider */

  /* Brand (dari logo) */
  --rp-navy: #0B3C7A;          /* judul, kartu saldo utama */
  --rp-royal: #1F5FDB;         /* link, ikon aktif, fokus */
  --rp-sky: #5AB0E4;           /* aksen data sekunder, chart */
  --rp-mist: #CFE8F7;          /* highlight lembut */

  /* Aksi — HANYA untuk aksi utama (FAB tambah, tombol simpan) */
  --rp-action: #F26A1B;
  --rp-action-press: #D9570D;

  /* Semantik uang */
  --rp-in: #138A55;            /* pemasukan */
  --rp-in-soft: #E3F5EC;
  --rp-out: #C8372D;           /* pengeluaran */
  --rp-out-soft: #FBE9E7;
  --rp-warn: #B86E00;          /* budget > 80% */
  --rp-warn-soft: #FFF3DC;

  /* Teks */
  --rp-ink: #0F1E33;
  --rp-ink-2: #4A5B72;         /* caption, metadata (kontras ≥ 4.5:1 di canvas) */
  --rp-ink-inverse: #F7FAFD;
}

.dark {
  --rp-canvas: #0B1220;
  --rp-surface: #121B2C;
  --rp-surface-2: #18243A;
  --rp-line: #24324A;
  --rp-navy: #9CC4F2;
  --rp-royal: #6EA2F5;
  --rp-sky: #5AB0E4;
  --rp-mist: #1B3150;
  --rp-action: #FF8A3D;
  --rp-action-press: #F26A1B;
  --rp-in: #3CCB8A;
  --rp-in-soft: #10291F;
  --rp-out: #FF7A6E;
  --rp-out-soft: #2E1614;
  --rp-warn: #F2B24C;
  --rp-warn-soft: #2B2111;
  --rp-ink: #EAF0F8;
  --rp-ink-2: #9AAAC0;
  --rp-ink-inverse: #0F1E33;
}
```

Palet chart kategori (urut, maksimal 6 lalu "Lainnya" abu-abu): `--rp-navy`, `--rp-royal`, `--rp-sky`, `#7C8FB0`, `#B6C6DC`, `#2E8C9A`.

## 3. Tipografi

- **UI & body:** Plus Jakarta Sans (400/500/600/700). Lokal & dibaca nyaman di HP Android murah.
- **Angka uang:** font yang sama dengan `font-variant-numeric: tabular-nums` (kelas `.rp-num`) supaya digit sejajar di list mutasi.
- Skala (mobile):
  | Peran | Ukuran | Berat |
  |---|---|---|
  | Saldo hero | 32px | 700 |
  | Judul layar | 20px | 700 |
  | Judul section | 15px | 600 |
  | Body / item list | 14px | 500 |
  | Caption | 12px | 500 |
  | Label tab bar | 11px | 600 |
- Judul section **tidak** UPPERCASE tracking-wide; cukup sentence case.

## 4. Bentuk, Ruang, Gerak

- Radius: kartu 16px, tombol/input 12px, chip 999px. Satu sistem, jangan campur `rounded-3xl` dengan `rounded-lg` di layar yang sama.
- Bayangan: hanya dua level. `--rp-shadow-1: 0 1px 2px rgba(11,60,122,.06)` untuk kartu, `--rp-shadow-2: 0 8px 24px -8px rgba(11,60,122,.25)` untuk sheet/FAB.
- Spasi: kelipatan 4px; padding layar 16px; jarak antar section 24px.
- Gerak: 150–220ms, `ease-out`. Bottom sheet naik dari bawah; angka saldo boleh count-up sekali saat load. Hormati `prefers-reduced-motion`.

## 5. Elemen Khas

- **Kartu Saldo "Buku":** latar `--rp-navy` solid dengan potongan diagonal tipis `--rp-royal` di pojok kanan atas (mengulang bentuk logo). Bukan gradien penuh.
- **Garis Kas:** pemisah antar hari di mutasi berupa garis putus-putus `--rp-line` + tanggal dan subtotal hari itu, seperti buku kas.
- **Indikator arus:** panah kecil ↑ (in, hijau) / ↓ (out, merah) di samping nominal, selalu disertai tanda `+`/`−` agar tetap terbaca bagi buta warna.

## 6. Suara & Bahasa

- Bahasa Indonesia santai-sopan, sapaan "kamu". Konsisten: jangan campur "Home/Add" dengan "Mutasi".
- Singkat dan spesifik: "Sisa jatah makan minggu ini Rp120rb" > "Anda masih memiliki sisa anggaran".
- Format uang: `Rp1.250.000` (tanpa spasi, titik ribuan); ringkas di chart: `Rp1,2 jt`, `Rp350 rb`.
- Pesan error memberi jalan keluar: "Gagal menyimpan. Transaksi disimpan di HP dan akan dikirim saat online."
- Fitur belum jadi: **sembunyikan**, jangan pamerkan dengan toast "sedang dikembangkan".

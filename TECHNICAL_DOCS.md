# 📘 Dokumentasi Teknis Lengkap myAccountant

Dokumen ini ditujukan untuk **developer** (atau Anda di masa depan) untuk memahami **secara mendalam** bagaimana aplikasi ini bekerja "di bawah kap mesin", di mana letak logika-logika vital, dan bagaimana cara memodifikasinya dengan aman.

---

## 🏗️ Arsitektur Aplikasi

Aplikasi ini dibangun dengan **React + TypeScript + Vite**. Data disimpan persisten di **Google Sheets**, namun aplikasi menggunakan **Zustand** sebagai *local store* untuk performa tinggi (UI tidak perlu menunggu Google Sheets setiap kali ada aksi).

### Peta File Penting

```
src/
├── hooks/
│   └── useGoogleSheets.ts       # 📡 JEMBATAN DATA (API Call ke GAS)
├── store/
│   └── useFinanceStore.ts       # 🧠 OTAK APLIKASI (State, Kalkulasi Saldo)
├── components/
│   └── home/
│       ├── QuickActions.tsx     # ⚡ Tombol Cepat (Mapping Kategori)
│       ├── SubscriptionTracker.tsx # 📅 Widget Langganan
│       ├── AccountCards.tsx     # 💳 Tampilan Kartu Saldo
│       ├── AnalyticsView.tsx    # 📊 Grafik & Visualisasi
│       └── TransactionList.tsx  # 📝 List Riwayat & Filter
├── types.ts                     # 📚 KAMUS DATA (Interface TS)
└── App.tsx                      # 🏠 Main Layout & Routing
```

---

## 🧠 Core Systems (Jantung Aplikasi)

### 1. State Management (`store/useFinanceStore.ts`)

File ini mengatur seluruh data yang tampil di layar. Menggunakan library `zustand`.

**Logic Penting: Menghitung Saldo Otomatis**
Saldo tidak disimpan mentah di database, melainkan dihitung *on-the-fly* dari `Initial Balance` + `Total Income` - `Total Expense`.

```typescript
// useFinanceStore.ts
setTransactions: (transactions) => {
    set((state) => {
        // 1. Hitung total pemasukan & pengeluaran dari history transaksi
        const totalIncome = transactions.reduce((acc, curr) => curr.type === 'income' ? acc + curr.amount : acc, 0);
        const totalExpense = transactions.reduce((acc, curr) => curr.type === 'expense' ? acc + curr.amount : acc, 0);

        // 2. Ambil saldo awal semua akun (dari Metadata sheet)
        const totalInitial = state.accounts.reduce((acc, curr) => acc + (curr.initialBalance || 0), 0);

        // 3. Saldo valid saat ini
        const balance = totalInitial + totalIncome - totalExpense;

        return { transactions, balance };
    });
}
```
> **💡 Modifikasi**: Jika Anda ingin mengubah cara hitung saldo (misal tidak memasukkan "Tabungan" ke saldo utama), ubah logika di dalam fungsi `setTransactions` dan `getAccountBalances`.

---

### 2. Koneksi Google Sheets (`hooks/useGoogleSheets.ts`)

Aplikasi tidak punya backend server sendiri. Backend-nya adalah Google App Script (GAS) yang Anda deploy.

**Logic Penting: Fetch Data**
Aplikasi menarik data JSON besar yang berisi semua sheet sekaligus (`transactions`, `metadata`, `goals`) untuk menghemat quota API request.

```typescript
// useGoogleSheets.ts
const fetchTransactions = useCallback(async () => {
    // ...
    const response = await axios.get(GOOGLE_SCRIPT_URL);
    // Response berupa object raksasa: { transactions: [...], metadata: {...}, goals: [...] }
    if (response.data.status === 'success') {
        // Mapping data agar aman dipakai (assign ID jika null, format date, dll)
        const cleanData = response.data.data.map(item => ({
            ...item,
            id: item.id || crypto.randomUUID(), // Fallback ID jika di sheet kosong
            timestamp: item.timestamp || new Date().toISOString()
        }));
        return { transactions: cleanData, ... };
    }
    // ...
}, []);
```

**Logic Penting: Kirim Data (Optimistic Update)**
Saat user input, UI *langsung* update (via store), baru request dikirim ke Google Sheet di background.

---

## 📊 Komponen View & Analitik

Aplikasi ini memiliki beberapa tampilan kunci untuk visualisasi data yang terletak di `src/components/home/`.

### 1. AnalyticsView (`components/home/AnalyticsView.tsx`)

Komponen ini bertanggung jawab menampilkan grafik **Donut** (Proporsi Kategori) dan **Area Chart** (Tren Harian). Menggunakan library `recharts`.

**Logic Penting:**
- **`categoryData`**: Mengelompokkan transaksi pengeluaran berdasarkan kategori, lalu mengurutkan dan mengambil Top 5 + "Lainnya".
- **`trendData`**: Mengelompokkan transaksi berdasarkan tanggal untuk grafik tren.
- **Insight Otomatis**: Menghitung kategori terbesar dan mendeteksi "Anomaly" (pengeluaran harian > 3x rata-rata).

```typescript
// Deteksi Anomali
const total = trendData.reduce((acc, curr) => acc + curr.amount, 0);
const avg = total / (trendData.length || 1);
const anomaly = trendData.find(d => d.amount > avg * 3); // Alert jika ada hari yg boros banget
```

### 2. TransactionList (`components/home/TransactionList.tsx`)

List riwayat transaksi dengan fitur pencarian dan filter yang lengkap.

**Fitur Utama:**
- **Filtering**: Bisa filter by `Search Text`, `Category`, dan `Date Range`.
- **Grouping**: Transaksi dikelompokkan per hari (Hari Ini, Kemarin, 12 Des 2024, dst).
- **Pagination**: Load more manual (limit awal 20 item) untuk performa list panjang.

### 3. FinancialSummary (`components/home/FinancialSummary.tsx`)

Kotak ringkasan di halaman depan yang menampilkan Safe Limit dan Pemasukan/Pengeluaran.

**Logic Penting: Radar Kebocoran**
Fitur unik untuk mendeteksi pengeluaran di kategori "rawan" seperti Jajan atau Admin Bank.

```typescript
// Mencari pengeluaran terbesar di kategori 'Jajan/Hobi' atau 'Admin Bank'
const getTopExpenseCategory = () => {
    // ... logic filter & max ...
    return { category: maxCat, amount: maxAmount };
};
```

---

## 🧩 Komponen Kunci Lain & Kustomisasi

### 1. Quick Actions (`components/home/QuickActions.tsx`)

Tombol warna-warni di halaman depan. Ini cara paling mudah untuk kustomisasi kategori favorit.

**Cara Menambah Tombol Baru:**
Cari array `ACTIONS` di file ini.

```typescript
// QuickActions.tsx
const ACTIONS = [
    { 
        id: 'makan_weekday', 
        label: 'Makan Weekday', 
        icon: Utensils,         // Icon dari lucide-react
        categoryMatch: 'Makan Weekday', // Nama kategori persis di Google Sheet
        color: 'text-orange-500' // Class warna Tailwind
    },
    // 👇 Tambahkan punya Anda di sini
    { 
        id: 'ngopi', 
        label: 'Ngopi', 
        icon: Coffee, 
        categoryMatch: 'Jajan/Hobi', 
        color: 'text-brown-500' 
    },
];
```

**Logic Smart Sort:**
Komponen ini punya fitur pintar `useMemo` yang akan menaruh tombol *paling sering dipakai* di urutan teratas secara otomatis berdasarkan history transaksi Anda.

---

### 2. Subscription Tracker (`components/home/SubscriptionTracker.tsx`)

Widget untuk mencatat tagihan bulanan.

**Logic Penting:**
Data subscription disimpan terpisah di sheet `Metadata` (atau sheet khusus `Subscriptions` jika sudah update script GAS).
Widget ini menghitung otomatis "sisa hari" pembayaran.

---

## 📱 PWA (Progressive Web App)

Aplikasi ini sudah di-upgrade menjadi PWA sehingga bisa di-install di HP/Desktop dan berjalan offline (caching aset statis).

### File Konfigurasi:
- **`vite.config.ts`**: Menggunakan plugin `vite-plugin-pwa` untuk generate manifest dan service worker.
- **`public/pwa-192x192.png` & `pwa-512x512.png`**: Icon aplikasi yang akan muncul di home screen.
- **`index.html`**: Meta tag `theme-color` (orange) dan `apple-touch-icon`.

### Cara Install:
1. Buka aplikasi di Chrome/Safari.
2. Klik tombol "Install myAccountant" di address bar (atau "Add to Home Screen" di menu Share iOS).

---

## 🎨 Theme & Styling (Tailwind CSS)

Semua warna didefinisikan secara *utility-first*.
Jika ingin mengubah tema besar (misal dari Orange BRImo jadi Biru BCA):

1. Buka `tailwind.config.js` (jika ada custom colors) atau `index.css`.
2. Cari warna primary.
3. Replace class di komponen:
   - `bg-brimo-primary` -> Ganti dengan kode hex pilihan Anda.
   - `from-blue-600 to-yellow-500` (di Kartu Saldo) -> Ubah gradien di `getAccountBalances` dalam file `useFinanceStore.ts`.

---

## ⚠️ Checklist Troubleshooting

Jika data tidak tampil atau error:
1. **Cek `.env`**: Pastikan `VITE_GOOGLE_SCRIPT_URL` sudah benar.
2. **Cek Console Browser (F12)**: Lihat apakah ada error CORS atau 404.
3. **Cek Struktur Sheet**: 
   - Tab `Transactions` wajib punya kolom header: `id, timestamp, type, category, amount, description, account, status`.
   - Jika kolom bergeser, mapping di `useGoogleSheets.ts` -> `fetchTransactions` akan kacau.

---

## 📝 Tips Modifikasi

*   **Menambah Tipe Transaksi Baru**: Tambahkan di `types.ts`, lalu update logic `reduce` di `useFinanceStore.ts` untuk menghitung apakah dia menambah/mengurangi saldo.
*   **Merubah Mata Uang**: Aplikasi menggunakan `Intl.NumberFormat('id-ID')`. Cari helper `formatCurrency` di berbagai komponen jika ingin mengubah simbol `Rp`.

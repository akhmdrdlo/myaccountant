// Skrip Autox.js (gratis, open source) untuk meneruskan notifikasi bank/e-wallet ke Rplanner.
// API yang dipakai dicek dari kode sumber Autox (cabang dev-test):
//   events.observeNotification(), events.onNotification(cb)  → autojs/.../runtime/api/Events.java
//   http.postJson(url, data, options, callback)               → autojs/.../modules/__http__.js

/** Nama paket aplikasi bank & e-wallet umum. Notifikasi aplikasi lain (chat, dll) TIDAK dikirim. */
export const AUTOX_DEFAULT_PACKAGES = [
    'com.bca', 'com.bca.mybca.omni.android',          // BCA mobile, myBCA
    'id.co.bri.brimo',                                 // BRImo
    'id.bmri.livin',                                   // Livin' by Mandiri
    'src.com.bni', 'id.bni.wondr',                     // BNI Mobile, wondr
    'id.co.bankbsi.superapp',                          // BSI Mobile
    'com.bankjago.app', 'id.co.bankneocommerce',       // Jago, Neo
    'id.seabank.mobile', 'com.seabank.seabank',        // SeaBank
    'com.btpn.dc', 'com.bcadigital.blu',               // Jenius, blu
    'com.gojek.app', 'com.gojek.gopay',                // Gojek / GoPay
    'ovo.id', 'id.dana', 'com.shopee.id', 'com.telkom.mwallet', // OVO, DANA, Shopee, LinkAja
];

export function buildAutoxScript(webhookUrl: string, token: string): string {
    return `// Rplanner: teruskan notifikasi bank & e-wallet ke Rplanner
// Jalankan di Autox.js. Biarkan skrip tetap berjalan (aktifkan "Foreground service" di pengaturan Autox).

var WEBHOOK = ${JSON.stringify(webhookUrl)};
var TOKEN = ${JSON.stringify(token)};

// Hanya notifikasi dari aplikasi ini yang dikirim. Tambahkan nama paket bank/e-wallet lain di sini.
var APPS = ${JSON.stringify(AUTOX_DEFAULT_PACKAGES, null, 4).replace(/\n/g, '\n')};

// true = tampilkan nama paket SEMUA notifikasi di log (untuk mencari nama paket bankmu), lalu ubah lagi ke false
var CARI_NAMA_PAKET = false;

function ambil(fn) {
    try { var v = fn(); return v == null ? "" : String(v); } catch (e) { return ""; }
}

events.observeNotification();
toast("Rplanner: mendengarkan notifikasi bank");

events.onNotification(function (n) {
    var paket = ambil(function () { return n.getPackageName(); });
    if (CARI_NAMA_PAKET) log("Notifikasi dari: " + paket);
    if (APPS.indexOf(paket) < 0) return;

    var judul = ambil(function () { return n.getTitle(); }) || ambil(function () { return n.extras.getString("android.title"); });
    var isi = ambil(function () { return n.getText(); }) || ambil(function () { return n.extras.getCharSequence("android.text"); });
    if (!isi && !judul) return;

    http.postJson(WEBHOOK, { title: judul, text: isi, app: paket, source: "notification" }, {
        headers: { "x-rplanner-token": TOKEN }
    }, function (res, err) {
        if (err) { log("Rplanner gagal kirim: " + err); return; }
        log("Rplanner " + res.statusCode + ": " + res.body.string());
    });
});
`;
}

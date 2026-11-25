// Rplanner: teruskan notifikasi bank & e-wallet ke Rplanner
// Jalankan di Autox.js. Biarkan skrip tetap berjalan (aktifkan "Foreground service" di pengaturan Autox).

var WEBHOOK = "https://<project-ref>.supabase.co/functions/v1/ingest";
var TOKEN = "rpl_TEMPEL_TOKEN_KAMU_DI_SINI";

// Hanya notifikasi dari aplikasi ini yang dikirim. Tambahkan nama paket bank/e-wallet lain di sini.
var APPS = [
    "com.bca",
    "com.bca.mybca.omni.android",
    "id.co.bri.brimo",
    "id.bmri.livin",
    "src.com.bni",
    "id.bni.wondr",
    "id.co.bankbsi.superapp",
    "com.bankjago.app",
    "id.co.bankneocommerce",
    "id.seabank.mobile",
    "com.seabank.seabank",
    "com.btpn.dc",
    "com.bcadigital.blu",
    "com.gojek.app",
    "com.gojek.gopay",
    "ovo.id",
    "id.dana",
    "com.shopee.id",
    "com.telkom.mwallet"
];

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

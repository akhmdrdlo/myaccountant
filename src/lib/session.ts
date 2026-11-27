// Pembersihan data milik pengguna di perangkat saat logout, supaya akun berikutnya
// di HP yang sama tidak melihat data akun sebelumnya.
import { disablePush } from './push';

/** Data keuangan & preferensi yang terikat ke akun (bukan ke perangkat). */
const USER_KEYS = [
    'rplanner_token', 'rplanner_username', 'rplanner_user_id', 'rplanner_mode',
    'rplanner_snapshot',          // salinan data terakhir (mode offline)
    'rplanner_payday',            // tanggal gajian
    'rplanner_sub_skip',          // langganan yang dilewati
    'rplanner_auto_sub',          // pencatatan langganan otomatis
    'rplanner_push_nudge_dismissed',
    // localDb lama (mode online menyimpan tanpa nama pengguna)
    'rplanner_transactions', 'rplanner_metadata', 'rplanner_budgets', 'rplanner_goals', 'rplanner_subscriptions', 'rplanner_investments',
];

export async function clearLocalUserData() {
    // Lepas langganan push perangkat ini dari akun yang logout, supaya pengingatnya tidak muncul untuk orang lain
    try { await disablePush(); } catch { /* offline: baris server dihapus saat langganan kedaluwarsa */ }
    USER_KEYS.forEach(k => localStorage.removeItem(k));
    Object.keys(sessionStorage).filter(k => k.startsWith('rplanner_')).forEach(k => sessionStorage.removeItem(k));
    // Antrean offline TIDAK dihapus: isinya diberi pemilik dan hanya dikirim saat pemiliknya login lagi (lihat offlineQueue)
}

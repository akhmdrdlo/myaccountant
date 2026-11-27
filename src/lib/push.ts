import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushSupport =
    | 'supported'
    | 'needs-install'     // iOS Safari: harus "Tambah ke Layar Utama" dulu
    | 'unsupported'
    | 'not-configured';   // VITE_VAPID_PUBLIC_KEY belum diisi

export const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function getPushSupport(): PushSupport {
    if (!VAPID_PUBLIC_KEY) return 'not-configured';
    if (isIOS() && !isStandalone()) return 'needs-install';
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
    return 'supported';
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Harus dipanggil dari aksi pengguna (klik tombol) — wajib di iOS. */
export async function enablePush(): Promise<{ ok: true } | { ok: false; reason: string }> {
    const support = getPushSupport();
    if (support !== 'supported') return { ok: false, reason: support };

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'denied' };

    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
    }));

    const reason = await claimSubscription(sub);
    return reason ? { ok: false, reason } : { ok: true };
}

/**
 * Daftarkan perangkat ini ke akun yang sedang login. Lewat RPC claim_push_endpoint supaya
 * endpoint yang masih tercatat atas nama akun lain (mis. logout saat offline) dipindahkan,
 * bukan tetap mengirim pengingat akun lama ke HP ini. Mengembalikan pesan error atau null.
 */
async function claimSubscription(sub: PushSubscription): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'not-signed-in';
    const json = sub.toJSON();
    const row = { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '', user_agent: navigator.userAgent.slice(0, 200) };
    const { error } = await supabase.rpc('claim_push_endpoint', {
        p_endpoint: sub.endpoint, p_p256dh: row.p256dh, p_auth: row.auth, p_user_agent: row.user_agent,
    });
    if (!error) return null;
    // Migrasi 20261127000000 belum dijalankan → cara lama
    const { error: legacy } = await supabase.from('push_subscriptions').upsert({ user_id: user.id, endpoint: sub.endpoint, ...row }, { onConflict: 'endpoint' });
    return legacy?.message ?? null;
}

/** Saat login: kalau HP ini sudah punya izin + langganan push, pindahkan ke akun yang baru login. */
export async function reclaimPushOnLogin(): Promise<void> {
    if (getPushSupport() !== 'supported' || Notification.permission !== 'granted') return;
    const sub = await getCurrentSubscription();
    if (sub) await claimSubscription(sub);
}

export async function disablePush(): Promise<void> {
    const sub = await getCurrentSubscription();
    if (!sub) return;
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
}

export async function sendTestPush(): Promise<number> {
    const { data, error } = await supabase.functions.invoke<{ delivered: number }>('push-test', { body: {} });
    if (error) throw error;
    return data?.delivered ?? 0;
}

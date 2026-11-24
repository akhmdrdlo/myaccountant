// Pengirim Web Push bersama untuk Edge Functions.
import webpush from 'npm:web-push@3.6.7';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export interface PushPayload {
    title: string;
    body: string;
    /** Path di dalam aplikasi yang dibuka saat notifikasi diketuk, mis. "/?view=inbox" */
    url?: string;
    tag?: string;
}

export function adminClient(): SupabaseClient {
    return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
        auth: { persistSession: false },
    });
}

/** Kirim ke semua perangkat milik pengguna; langganan yang sudah kedaluwarsa dihapus. */
export async function sendPushToUser(db: SupabaseClient, userId: string, payload: PushPayload): Promise<number> {
    const { data: subs, error } = await db
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', userId);
    if (error || !subs?.length) return 0;

    let delivered = 0;
    await Promise.all(subs.map(async (s) => {
        try {
            await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                JSON.stringify(payload),
                { TTL: 60 * 60 * 12, urgency: 'normal' },
            );
            delivered++;
        } catch (err) {
            const status = (err as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) {
                await db.from('push_subscriptions').delete().eq('id', s.id);
            } else {
                console.error('push gagal', status, (err as Error).message);
            }
        }
    }));
    return delivered;
}

/** true jika key ini belum pernah dikirim (lalu dicatat); false jika sudah. */
export async function claimOnce(db: SupabaseClient, userId: string, dedupeKey: string): Promise<boolean> {
    const { error } = await db.from('notification_log').insert({ user_id: userId, dedupe_key: dedupeKey });
    return !error;
}

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-rplanner-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

export function formatRupiah(n: number): string {
    return 'Rp' + Math.round(n).toLocaleString('id-ID');
}

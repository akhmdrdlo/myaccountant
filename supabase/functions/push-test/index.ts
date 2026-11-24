// POST /functions/v1/push-test — kirim notifikasi uji ke perangkat milik pengguna yang login.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { adminClient, corsHeaders, json, sendPushToUser } from '../_shared/push.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const delivered = await sendPushToUser(adminClient(), user.id, {
        title: 'Notifikasi Rplanner aktif',
        body: 'Mantap, pengingat tagihan dan transaksi otomatis akan muncul di sini.',
        url: '/?view=notifikasi',
        tag: 'test',
    });

    return json({ ok: true, delivered });
});

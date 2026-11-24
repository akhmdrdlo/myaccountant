// POST /functions/v1/ai — fitur AI untuk pengguna yang login (JWT Supabase wajib).
// Body:
//   { task: 'parse',    text, app? }                     → { parsed }
//   { task: 'receipt',  image (base64), media_type }      → { receipt }
//   { task: 'advisor',  messages: ChatTurn[], summary }   → { reply }
import { createClient } from 'npm:@supabase/supabase-js@2';
import { adminClient, corsHeaders, json } from '../_shared/push.ts';
import { aiAdvisor, aiEnabled, aiParseTransaction, aiReadReceipt, takeAiQuota, type ChatTurn } from '../_shared/ai.ts';

const MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BASE64 = 6_000_000; // ~4.5 MB gambar

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
    if (!aiEnabled()) return json({ error: 'AI belum diaktifkan (ANTHROPIC_API_KEY belum diset).' }, 503);

    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
        auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return json({ error: 'body harus JSON' }, 400);
    }

    if (!(await takeAiQuota(adminClient(), user.id))) {
        return json({ error: 'Batas pemakaian AI hari ini sudah tercapai. Coba lagi besok.' }, 429);
    }

    try {
        switch (body.task) {
            case 'parse': {
                const text = String(body.text ?? '').slice(0, 2000);
                if (!text.trim()) return json({ error: 'text kosong' }, 400);
                const parsed = await aiParseTransaction(text, String(body.app ?? ''), new Date());
                return json({ parsed });
            }
            case 'receipt': {
                const image = String(body.image ?? '');
                const mediaType = String(body.media_type ?? '');
                if (!MEDIA.has(mediaType)) return json({ error: 'format gambar harus JPG, PNG, atau WebP' }, 400);
                if (!image || image.length > MAX_IMAGE_BASE64) return json({ error: 'gambar kosong atau terlalu besar' }, 413);
                const receipt = await aiReadReceipt(image, mediaType as 'image/jpeg');
                return json({ receipt });
            }
            case 'advisor': {
                const raw = Array.isArray(body.messages) ? body.messages : [];
                const history: ChatTurn[] = raw
                    .filter((m): m is ChatTurn => !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
                    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
                if (!history.length || history[history.length - 1].role !== 'user') return json({ error: 'pesan terakhir harus dari user' }, 400);
                const reply = await aiAdvisor(history, String(body.summary ?? '').slice(0, 6000));
                return json({ reply });
            }
            default:
                return json({ error: 'task tidak dikenal' }, 400);
        }
    } catch (err) {
        console.error('ai error', err);
        return json({ error: 'Layanan AI sedang bermasalah. Coba lagi sebentar lagi.' }, 502);
    }
});

// POST /functions/v1/ingest
// Menerima teks notifikasi bank/e-wallet (MacroDroid/Tasker), email yang diteruskan, atau iOS Shortcuts.
//
// Header : x-rplanner-token: rpl_xxx   (atau query ?token=rpl_xxx untuk layanan yang tidak bisa set header)
// Body   : { "text": "...", "title"?: "...", "app"?: "com.bca", "source"?: "notification" | "email" | "shortcut",
//            "received_at"?: ISO string }
//          Juga menerima form-urlencoded / text/plain (isi = text).
import { isNoise, parseBankText, type ParsedBankText } from '../_shared/parseBankText.ts';
import { adminClient, claimOnce, corsHeaders, formatRupiah, json, sendPushToUser } from '../_shared/push.ts';
import { aiEnabled, aiParseTransaction, takeAiQuota } from '../_shared/ai.ts';
import { findRule } from '../_shared/merchant.ts';

const ALLOWED_SOURCES = new Set(['notification', 'email', 'shortcut']);

async function sha256Hex(input: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function readBody(req: Request): Promise<Record<string, string>> {
    const type = req.headers.get('content-type') ?? '';
    if (type.includes('application/json')) return await req.json();
    if (type.includes('form')) {
        const form = await req.formData();
        return Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    }
    return { text: await req.text() };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

    const url = new URL(req.url);
    const token = req.headers.get('x-rplanner-token') ?? url.searchParams.get('token') ?? '';
    if (!/^rpl_[a-f0-9]{48}$/.test(token)) return json({ error: 'token tidak valid' }, 401);

    const db = adminClient();
    const { data: tokenRow } = await db
        .from('ingest_tokens')
        .select('user_id')
        .eq('token_hash', await sha256Hex(token))
        .maybeSingle();
    if (!tokenRow) return json({ error: 'token tidak dikenal' }, 401);
    const userId: string = tokenRow.user_id;

    let body: Record<string, string>;
    try {
        body = await readBody(req);
    } catch {
        return json({ error: 'body tidak bisa dibaca' }, 400);
    }

    const text = [body.title, body.text ?? body.body ?? body.message].filter(Boolean).join(' — ').slice(0, 2000);
    const app = String(body.app ?? body.package ?? body.from ?? '').slice(0, 200);
    const source = ALLOWED_SOURCES.has(body.source) ? body.source : 'notification';
    const receivedAt = body.received_at && !Number.isNaN(Date.parse(body.received_at)) ? new Date(body.received_at) : new Date();

    await db.from('ingest_tokens').update({ last_used_at: new Date().toISOString() }).eq('user_id', userId);

    // Promo, OTP, dan info non-transaksi dibuang sebelum diproses (tanpa biaya AI)
    if (isNoise(text)) return json({ ok: true, captured: false, reason: 'promo/OTP diabaikan' });

    const { data: prefs } = await db
        .from('notification_prefs')
        .select('auto_confirm, notify_on_capture, ai_fallback')
        .eq('user_id', userId)
        .maybeSingle();

    let parsed: ParsedBankText | null = parseBankText(text, app, receivedAt);

    // Regex tidak yakin / tidak kenal format bank ini → minta Claude Haiku membaca
    if ((!parsed || parsed.confidence < 0.7) && aiEnabled() && prefs?.ai_fallback !== false && await takeAiQuota(db, userId)) {
        try {
            const ai = await aiParseTransaction(text, app, receivedAt);
            if (ai) {
                parsed = {
                    amount: ai.amount,
                    type: ai.type,
                    category: ai.category,
                    merchant: ai.merchant || undefined,
                    accountHint: ai.account_hint || parsed?.accountHint,
                    confidence: 0.85,
                };
            } else if (!parsed || parsed.confidence < 0.5) {
                // AI yakin ini bukan transaksi
                parsed = null;
            }
        } catch (err) {
            console.error('AI fallback gagal, pakai hasil regex', err);
        }
    }

    if (!parsed) return json({ ok: true, captured: false, reason: 'bukan notifikasi transaksi' });

    // Kategori/dompet yang pernah dipilih pengguna untuk merchant ini menang atas tebakan
    let ruleAccount: string | undefined;
    if (parsed.merchant) {
        const { data: rules } = await db.from('merchant_rules').select('merchant_key, category, account').eq('user_id', userId);
        const rule = findRule((rules ?? []).map((r) => ({ merchantKey: r.merchant_key, category: r.category, account: r.account ?? undefined })), parsed.merchant);
        if (rule) {
            parsed = { ...parsed, category: rule.category, confidence: Math.max(parsed.confidence, 0.85) };
            ruleAccount = rule.account;
        }
    }

    // Notifikasi yang sama sering terkirim 2x (ringkasan + detail). Kunci per menit menahan duplikat.
    const minute = receivedAt.toISOString().slice(0, 16);
    const externalId = await sha256Hex(`${app}|${parsed.type}|${parsed.amount}|${parsed.merchant ?? ''}|${minute}`);

    const autoConfirm = Boolean(prefs?.auto_confirm) && parsed.confidence >= 0.8;
    const signed = `${parsed.type === 'income' ? '+' : '−'}${formatRupiah(parsed.amount)}`;
    const where = parsed.merchant ?? parsed.accountHint ?? 'transaksi baru';

    if (autoConfirm) {
        // Cari akun pengguna yang namanya cocok dengan sumber; kalau tidak ada, tetap draft.
        const { data: accounts } = await db.from('accounts').select('*').eq('user_id', userId);
        const hint = parsed.accountHint?.toLowerCase();
        const hintId = hint?.replace(/\s+/g, '');
        const account = (ruleAccount && accounts?.some((a) => a.name === ruleAccount) ? ruleAccount : undefined)
            ?? (hint
                ? (accounts?.find((a) => a.institution && a.institution === hintId) ?? accounts?.find((a) => a.name.toLowerCase().includes(hint)))?.name
                : undefined);

        if (account) {
            const { error } = await db.from('transactions').upsert({
                id: crypto.randomUUID(),
                user_id: userId,
                type: parsed.type,
                category: parsed.category,
                amount: parsed.amount,
                description: parsed.merchant ? `${parsed.merchant} (otomatis)` : 'Dicatat otomatis',
                account,
                status: 'completed',
                timestamp: receivedAt.toISOString(),
                source,
                external_id: externalId,
            }, { onConflict: 'user_id,source,external_id', ignoreDuplicates: true });
            if (error) return json({ error: error.message }, 500);

            if (prefs?.notify_on_capture !== false && await claimOnce(db, userId, `cap:${externalId}`)) {
                await sendPushToUser(db, userId, {
                    title: `Tercatat: ${signed}`,
                    body: `${where} · ${parsed.category} · ${account}`,
                    url: '/?tab=mutasi',
                    tag: `cap-${externalId}`,
                });
            }
            return json({ ok: true, captured: true, mode: 'transaction', parsed });
        }
    }

    const { error } = await db.from('transaction_drafts').upsert({
        user_id: userId,
        source,
        external_id: externalId,
        type: parsed.type,
        amount: parsed.amount,
        category: parsed.category,
        account_hint: parsed.accountHint ?? null,
        merchant: parsed.merchant ?? null,
        confidence: parsed.confidence,
        occurred_at: receivedAt.toISOString(),
    }, { onConflict: 'user_id,source,external_id', ignoreDuplicates: true });
    if (error) return json({ error: error.message }, 500);

    if (prefs?.notify_on_capture !== false && await claimOnce(db, userId, `cap:${externalId}`)) {
        await sendPushToUser(db, userId, {
            title: `Transaksi terdeteksi: ${signed}`,
            body: `${where}. Ketuk untuk konfirmasi.`,
            url: '/?view=inbox',
            tag: `cap-${externalId}`,
        });
    }

    return json({ ok: true, captured: true, mode: 'draft', parsed });
});

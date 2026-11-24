// Pemanggil Claude Haiku 5.5 bersama untuk Edge Functions.
// API key hanya ada di secret ANTHROPIC_API_KEY (tidak pernah dikirim ke browser).
import Anthropic from 'npm:@anthropic-ai/sdk';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk/helpers/zod';
import { z } from 'npm:zod';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const AI_MODEL = 'claude-haiku-5-5';
const DAILY_LIMIT = Number(Deno.env.get('AI_DAILY_LIMIT') ?? '150');

export const aiEnabled = () => Boolean(Deno.env.get('ANTHROPIC_API_KEY'));

let client: Anthropic | null = null;
const ai = () => (client ??= new Anthropic());

const EXPENSE = ['Makan Weekday', 'Makan Weekend', 'Transport', 'Jajan/Hobi', 'Utilitas', 'Kos (Tabungan)', 'Transfer / Tarik Tunai', 'Lainnya'] as const;
const INCOME = ['Gaji', 'Bonus', 'Freelance', 'Transfer / Tarik Tunai', 'Lainnya'] as const;

/** Batas pemakaian harian per pengguna. true = boleh lanjut. */
export async function takeAiQuota(db: SupabaseClient, userId: string): Promise<boolean> {
    const { data, error } = await db.rpc('bump_ai_usage', { p_user: userId, p_limit: DAILY_LIMIT });
    if (error) {
        console.error('quota error', error.message);
        return false;
    }
    return data === true;
}

// ── 1. Ekstrak transaksi dari teks notifikasi/email ─────────────

const ParsedSchema = z.object({
    is_transaction: z.boolean().describe('false untuk promo, OTP, info saldo tanpa transaksi, atau pesan lain'),
    type: z.enum(['income', 'expense']),
    amount: z.number().int().describe('nominal rupiah, bilangan bulat tanpa desimal'),
    merchant: z.string().describe('nama toko / pengirim / penerima; kosong jika tidak ada'),
    account_hint: z.string().describe('nama bank atau e-wallet sumber notifikasi; kosong jika tidak jelas'),
    category: z.enum([...new Set([...EXPENSE, ...INCOME])] as [string, ...string[]]),
});

export type AiParsed = z.infer<typeof ParsedSchema>;

export async function aiParseTransaction(text: string, app: string, when: Date): Promise<AiParsed | null> {
    const day = when.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
    const res = await ai().messages.parse({
        model: AI_MODEL,
        max_tokens: 2048,
        output_config: { effort: 'low', format: zodOutputFormat(ParsedSchema) },
        system: [
            'Kamu mengekstrak satu transaksi keuangan dari notifikasi bank / e-wallet / email Indonesia.',
            'Format angka Indonesia: titik = ribuan, koma = desimal (Rp 25.000,00 = 25000). "rb" = ribu, "jt" = juta.',
            'Abaikan angka saldo akhir; ambil nominal transaksinya.',
            `Kategori pengeluaran: ${EXPENSE.join(', ')}. Kategori pemasukan: ${INCOME.join(', ')}.`,
            'Makan di hari Sabtu/Minggu = Makan Weekend, selain itu Makan Weekday. Belanja minimarket/online/hiburan = Jajan/Hobi.',
            'Listrik, pulsa, internet, air, BPJS = Utilitas. Ojek, bensin, parkir, tol, KRL = Transport.',
        ].join('\n'),
        messages: [{
            role: 'user',
            content: `Aplikasi/pengirim: ${app || '-'}\nHari: ${day}\n\n<notifikasi>\n${text}\n</notifikasi>`,
        }],
    });

    if (res.stop_reason === 'refusal' || !res.parsed_output) return null;
    const out = res.parsed_output;
    if (!out.is_transaction || out.amount <= 0) return null;
    return out;
}

// ── 2. Baca struk dari foto ─────────────────────────────────────

const ReceiptSchema = z.object({
    is_receipt: z.boolean(),
    total: z.number().int().describe('total yang dibayar dalam rupiah'),
    merchant: z.string(),
    category: z.enum(EXPENSE as unknown as [string, ...string[]]),
    date: z.string().describe('tanggal di struk format YYYY-MM-DD, kosong jika tidak terbaca'),
    items: z.array(z.object({ name: z.string(), price: z.number().int() })).describe('maksimal 10 item utama'),
});

export type AiReceipt = z.infer<typeof ReceiptSchema>;

export async function aiReadReceipt(base64: string, mediaType: 'image/jpeg' | 'image/png' | 'image/webp'): Promise<AiReceipt | null> {
    const res = await ai().messages.parse({
        model: AI_MODEL,
        max_tokens: 4096,
        output_config: { effort: 'low', format: zodOutputFormat(ReceiptSchema) },
        system: [
            'Kamu membaca foto struk belanja Indonesia dan mengisi data pengeluaran.',
            'Total = jumlah akhir yang dibayar (setelah diskon & pajak), bukan subtotal.',
            `Pilih kategori dari: ${EXPENSE.join(', ')}.`,
            'Jika gambar bukan struk, set is_receipt false.',
        ].join('\n'),
        messages: [{
            role: 'user',
            content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                { type: 'text', text: 'Baca struk ini.' },
            ],
        }],
    });
    if (res.stop_reason === 'refusal' || !res.parsed_output?.is_receipt) return null;
    return res.parsed_output;
}

// ── 3. Penasihat keuangan (chat) ────────────────────────────────

export interface ChatTurn {
    role: 'user' | 'assistant';
    content: string;
}

const ADVISOR_SYSTEM = [
    'Kamu adalah asisten pencatat keuangan pribadi di aplikasi Rplanner. Bahasa Indonesia santai-sopan, sapaan "kamu".',
    'Jawab berdasarkan RINGKASAN DATA yang diberikan. Jangan mengarang angka yang tidak ada di data; kalau datanya kurang, bilang saja.',
    'Jawaban singkat (maks ~150 kata), langsung ke poin, pakai angka rupiah format Rp1.250.000. Boleh pakai daftar pendek.',
    'Beri saran praktis soal budget, kebiasaan belanja, dan tabungan.',
    'Untuk pertanyaan investasi spesifik (saham, kripto, reksa dana tertentu), jelaskan konsep umum saja dan ingatkan bahwa kamu bukan penasihat keuangan berlisensi.',
].join('\n');

export async function aiAdvisor(history: ChatTurn[], dataSummary: string): Promise<string | null> {
    const res = await ai().messages.create({
        model: AI_MODEL,
        max_tokens: 4096,
        output_config: { effort: 'medium' },
        system: [
            { type: 'text', text: ADVISOR_SYSTEM, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: `RINGKASAN DATA KEUANGAN PENGGUNA:\n${dataSummary}` },
        ],
        messages: history.slice(-12),
    });
    if (res.stop_reason === 'refusal') return 'Maaf, aku tidak bisa membantu pertanyaan itu.';
    const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('\n').trim();
    return text || null;
}

// ── 4. Ringkasan mingguan (1–2 kalimat untuk notifikasi) ────────

export async function aiWeeklyLine(dataSummary: string): Promise<string | null> {
    const res = await ai().messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        output_config: { effort: 'low' },
        system: 'Tulis SATU kalimat (maks 140 karakter) bahasa Indonesia santai untuk notifikasi ringkasan keuangan mingguan. Sebut total pengeluaran dan satu hal paling menonjol (naik/turun). Tanpa emoji, tanpa salam.',
        messages: [{ role: 'user', content: dataSummary }],
    });
    if (res.stop_reason === 'refusal') return null;
    const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join(' ').trim();
    return text ? text.slice(0, 180) : null;
}

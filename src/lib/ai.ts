// Pemanggil Edge Function `ai` (Claude Haiku 5.5). API key tidak pernah ada di browser.
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Transaction, Budget } from '../types';
import { formatRupiah } from './utils';

export interface AiParsed {
    type: 'income' | 'expense';
    amount: number;
    merchant: string;
    account_hint: string;
    category: string;
}

export interface AiReceipt {
    total: number;
    merchant: string;
    category: string;
    date: string;
    items: { name: string; price: number }[];
}

export interface ChatTurn {
    role: 'user' | 'assistant';
    content: string;
}

export class AiError extends Error {}

/** Fitur AI tampil hanya jika diaktifkan (butuh ANTHROPIC_API_KEY di Supabase + fungsi ai ter-deploy). */
export const AI_ENABLED = import.meta.env.VITE_AI_ENABLED === 'true';

async function call<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase.functions.invoke<T>('ai', { body });
    if (error) {
        let message = 'Layanan AI tidak bisa dihubungi. Cek koneksi atau pastikan fungsi `ai` sudah di-deploy.';
        if (error instanceof FunctionsHttpError) {
            try {
                const detail = await error.context.json();
                if (detail?.error) message = detail.error;
            } catch { /* abaikan */ }
        }
        throw new AiError(message);
    }
    return data as T;
}

export const aiParse = async (text: string) =>
    (await call<{ parsed: AiParsed | null }>({ task: 'parse', text })).parsed;

/** memoryCount: jumlah catatan memori yang dipakai server (null = gagal dibaca, undefined = server versi lama). */
export const aiAdvisor = async (messages: ChatTurn[], summary: string) => {
    const res = await call<{ reply: string | null; memory_count?: number | null }>({ task: 'advisor', messages, summary });
    return { reply: res.reply, memoryCount: res.memory_count };
};

/** Kecilkan foto (maks 1600px, JPEG) sebelum dikirim supaya cepat & hemat kuota. */
async function shrinkImage(file: File): Promise<{ base64: string; mediaType: 'image/jpeg' }> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return { base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' };
}

export async function aiReadReceipt(file: File): Promise<AiReceipt | null> {
    const { base64, mediaType } = await shrinkImage(file);
    return (await call<{ receipt: AiReceipt | null }>({ task: 'receipt', image: base64, media_type: mediaType })).receipt;
}

/**
 * Ringkasan data untuk AI Advisor. Hanya angka agregat + 15 transaksi terakhir,
 * bukan seluruh riwayat — lebih hemat dan lebih privat.
 */
export function buildFinanceSummary(input: {
    transactions: Transaction[];
    budgets: Budget[];
    accounts: { name: string; balance: number }[];
    goals: { name: string; targetAmount: number; current: number }[];
}): string {
    const now = new Date();
    const isReal = (c: string) => !/^(transfer \/ tarik tunai|penyesuaian saldo)$/i.test(c);
    const inMonth = (t: Transaction, offset: number) => {
        const d = new Date(t.timestamp);
        const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
    };
    const totals = (offset: number) => {
        const tx = input.transactions.filter(t => inMonth(t, offset) && isReal(t.category) && t.status !== 'failed');
        const byCat = new Map<string, number>();
        let income = 0;
        let expense = 0;
        for (const t of tx) {
            if (t.type === 'income') income += t.amount;
            if (t.type === 'expense') {
                expense += t.amount;
                byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
            }
        }
        return { income, expense, byCat };
    };
    const cur = totals(0);
    const prev = totals(1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const lines = [
        `Tanggal hari ini: ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} (hari ke-${now.getDate()} dari ${daysInMonth}).`,
        `Saldo per dompet: ${input.accounts.map(a => `${a.name} ${formatRupiah(a.balance)}`).join('; ') || '-'}.`,
        `Bulan ini: pemasukan ${formatRupiah(cur.income)}, pengeluaran ${formatRupiah(cur.expense)}.`,
        `Bulan lalu: pemasukan ${formatRupiah(prev.income)}, pengeluaran ${formatRupiah(prev.expense)}.`,
        'Pengeluaran per kategori bulan ini (bulan lalu):',
        ...[...new Set([...cur.byCat.keys(), ...prev.byCat.keys()])].map(c =>
            `- ${c}: ${formatRupiah(cur.byCat.get(c) ?? 0)} (${formatRupiah(prev.byCat.get(c) ?? 0)})`),
        'Budget bulanan:',
        ...(input.budgets.length
            ? input.budgets.map(b => `- ${b.category}: batas ${formatRupiah(b.limit)}, terpakai ${formatRupiah(cur.byCat.get(b.category) ?? 0)}`)
            : ['- belum diatur']),
        'Wishlist:',
        ...(input.goals.length
            ? input.goals.map(g => `- ${g.name}: ${formatRupiah(g.current)} dari ${formatRupiah(g.targetAmount)}`)
            : ['- belum ada']),
        '15 transaksi terakhir:',
        ...input.transactions.slice(0, 15).map(t =>
            `- ${new Date(t.timestamp).toLocaleDateString('id-ID')} ${t.type === 'income' ? '+' : '-'}${formatRupiah(t.amount)} ${t.category}${t.description ? ` (${t.description.slice(0, 40)})` : ''} [${t.account}]`),
    ];
    return lines.join('\n');
}

// Aturan bersama untuk langganan: kapan jatuh tempo, sudah dibayar atau belum, dan cara mencatatnya.
import type { Subscription, Transaction, TransactionInput } from '../types';

const SKIP_KEY = 'rplanner_sub_skip';
const AUTO_KEY = 'rplanner_auto_sub';

export const SUB_CATEGORY: Record<string, string> = {
    Internet: 'Utilitas',
    Hiburan: 'Jajan/Hobi',
    Produktivitas: 'Jajan/Hobi',
    'Rumah Tangga': 'Jajan/Hobi',
    Lainnya: 'Lainnya',
};

export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const subKey = (sub: Subscription, d = new Date()) => `sub:${sub.id}:${monthKey(d)}`;

/** Tanggal tagih bulan ini (tanggal 31 di bulan pendek jatuh di hari terakhir). */
export function dueDateThisMonth(sub: Subscription, now = new Date()): Date {
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return new Date(now.getFullYear(), now.getMonth(), Math.min(sub.billingDate, last));
}

/** Sudah tercatat bulan ini: otomatis ("Auto Sub: X") atau dicatat sendiri dengan nama langganan & nominal sama. */
export function isPaidThisMonth(sub: Subscription, transactions: Transaction[], now = new Date()): boolean {
    const name = sub.name.toLowerCase();
    return transactions.some(t => {
        if (t.type !== 'expense' || t.status === 'failed') return false;
        const d = new Date(t.timestamp);
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        const desc = (t.description || '').toLowerCase();
        return desc === `auto sub: ${name}` || (desc.includes(name) && t.amount === sub.amount);
    });
}

const readSkips = (): string[] => {
    try { return JSON.parse(localStorage.getItem(SKIP_KEY) ?? '[]'); } catch { return []; }
};

export function skipThisMonth(sub: Subscription) {
    const keep = readSkips().filter(k => k.endsWith(monthKey())); // buang catatan bulan lalu
    localStorage.setItem(SKIP_KEY, JSON.stringify([...new Set([...keep, subKey(sub)])]));
}

/** Langganan yang tanggalnya sudah lewat bulan ini, belum tercatat, dan tidak dilewati. */
export function dueUnpaid(subs: Subscription[], transactions: Transaction[], now = new Date()): Subscription[] {
    const skips = new Set(readSkips());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return subs.filter(s => dueDateThisMonth(s, now) <= today && !skips.has(subKey(s, now)) && !isPaidThisMonth(s, transactions, now));
}

export const isAutoSubEnabled = () => localStorage.getItem(AUTO_KEY) === '1';
export const setAutoSub = (on: boolean) => localStorage.setItem(AUTO_KEY, on ? '1' : '0');

/** Transaksi untuk satu langganan bulan ini; external_id membuatnya tidak bisa tercatat dua kali. */
export const subscriptionTransaction = (sub: Subscription, account: string): TransactionInput & { source: string; externalId: string } => ({
    type: 'expense',
    amount: sub.amount,
    category: SUB_CATEGORY[sub.category] || 'Lainnya',
    description: `Auto Sub: ${sub.name}`,
    account,
    source: 'subscription',
    externalId: subKey(sub),
});

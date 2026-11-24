// "Aman dibelanjakan": uang yang benar-benar bebas sampai gajian berikutnya.
import type { Debt, Installment, Subscription, Transaction, Budget } from '../types';
import { institutionForAccount, isDebtKind } from './institutions';
import { inPeriod, isNeutralCategory, type Period } from './period';

export interface UpcomingItem {
    label: string;
    amount: number;
    date: Date;
    kind: 'subscription' | 'installment' | 'debt';
}

export interface SafeToSpend {
    cash: number;
    upcoming: UpcomingItem[];
    upcomingTotal: number;
    buffer: number;
    free: number;
    perDay: number;
    spentToday: number;
    leftToday: number;
    spentPeriod: number;
}

/** Tanggal "hari ke-N" berikutnya di dalam periode, atau null bila tidak jatuh di sisa periode. */
function nextDueInPeriod(day: number, period: Period, today: Date): Date | null {
    for (let offset = 0; offset < 2; offset++) {
        const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
        const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
        const d = new Date(base.getFullYear(), base.getMonth(), Math.min(day, last));
        if (d >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && d < period.end) return d;
    }
    return null;
}

export function computeSafeToSpend(input: {
    accounts: { name: string; balance: number; institution?: string }[];
    transactions: Transaction[];
    subscriptions: Subscription[];
    installments: Installment[];
    debts: Debt[];
    budgets: Budget[];
    period: Period;
    now?: Date;
}): SafeToSpend {
    const now = input.now ?? new Date();
    const cash = input.accounts
        .filter(a => !isDebtKind(institutionForAccount(a).kind))
        .reduce((s, a) => s + a.balance, 0);

    const periodTx = input.transactions.filter(t => inPeriod(t.timestamp, input.period) && t.status !== 'failed');
    const paidInPeriod = (prefix: string) => periodTx.some(t => t.description.startsWith(prefix));

    const upcoming: UpcomingItem[] = [];
    for (const s of input.subscriptions) {
        if (paidInPeriod(`Auto Sub: ${s.name}`)) continue;
        const date = nextDueInPeriod(s.billingDate, input.period, now);
        if (date) upcoming.push({ label: s.name, amount: s.amount, date, kind: 'subscription' });
    }
    for (const i of input.installments) {
        if (i.paidMonths >= i.totalMonths || paidInPeriod(`Cicilan ${i.name}`)) continue;
        const date = nextDueInPeriod(i.dueDay, input.period, now);
        if (date) upcoming.push({ label: i.name, amount: i.monthlyAmount, date, kind: 'installment' });
    }
    for (const d of input.debts) {
        if (d.direction !== 'owe' || d.settledAt || !d.dueDate) continue;
        const date = new Date(`${d.dueDate}T00:00`);
        if (date < input.period.end) upcoming.push({ label: `Utang ke ${d.person}`, amount: d.amount, date, kind: 'debt' });
    }
    upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());

    const upcomingTotal = upcoming.reduce((s, u) => s + u.amount, 0);
    const buffer = input.budgets.find(b => b.category === 'Dana Darurat (Safety Buffer)')?.limit ?? 0;
    const free = Math.max(0, cash - upcomingTotal - buffer);

    const isSpend = (t: Transaction) => t.type === 'expense' && !isNeutralCategory(t.category);
    const todayKey = now.toDateString();
    const spentToday = periodTx.filter(t => isSpend(t) && new Date(t.timestamp).toDateString() === todayKey).reduce((s, t) => s + t.amount, 0);
    const spentPeriod = periodTx.filter(isSpend).reduce((s, t) => s + t.amount, 0);

    // Jatah harian dihitung dari uang bebas DITAMBAH yang sudah dibelanjakan hari ini,
    // supaya angka "per hari" tidak turun setiap kali kamu jajan.
    const perDay = Math.floor((free + spentToday) / input.period.daysLeft);
    return { cash, upcoming, upcomingTotal, buffer, free, perDay, spentToday, leftToday: perDay - spentToday, spentPeriod };
}

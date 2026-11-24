// Periode anggaran berdasarkan tanggal gajian.
// payday = 1 → bulan kalender biasa. payday = 25 → 25 Nov s.d. 24 Des.

export interface Period {
    start: Date;
    /** eksklusif */
    end: Date;
    /** sisa hari termasuk hari ini */
    daysLeft: number;
    totalDays: number;
    /** hari ke-berapa dalam periode (mulai 1) */
    dayIndex: number;
    label: string;
}

const clampDay = (year: number, month: number, day: number) =>
    new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()));

export function getPeriod(payday = 1, now: Date = new Date(), offset = 0): Period {
    const day = Math.min(Math.max(Math.round(payday) || 1, 1), 31);
    let start = clampDay(now.getFullYear(), now.getMonth(), day);
    if (now < start) start = clampDay(now.getFullYear(), now.getMonth() - 1, day);
    if (offset) start = clampDay(start.getFullYear(), start.getMonth() + offset, day);
    const end = clampDay(start.getFullYear(), start.getMonth() + 1, day);

    const msDay = 86_400_000;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const totalDays = Math.round((end.getTime() - start.getTime()) / msDay);
    const dayIndex = Math.min(totalDays, Math.max(1, Math.floor((today.getTime() - start.getTime()) / msDay) + 1));
    const daysLeft = offset ? 0 : Math.max(1, totalDays - dayIndex + 1);

    const fmt = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    const lastDay = new Date(end.getTime() - msDay);
    const label = day === 1
        ? start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
        : `${fmt(start)} – ${fmt(lastDay)}`;

    return { start, end, daysLeft, totalDays, dayIndex, label };
}

export const inPeriod = (iso: string, p: Period) => {
    const t = new Date(iso).getTime();
    return t >= p.start.getTime() && t < p.end.getTime();
};

/** Kategori yang bukan pemasukan/pengeluaran sungguhan */
export const isNeutralCategory = (category: string) =>
    /^(transfer \/ tarik tunai|transfer|penyesuaian saldo|utang-piutang)$/i.test(category.trim());

import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CalendarClock, ChevronDown } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { computeSafeToSpend } from '../../lib/safeToSpend';
import { cn, formatRupiah, formatRupiahShort } from '../../lib/utils';

interface FinancialSummaryProps {
    /** Buka pengaturan tanggal gajian */
    onSetPayday?: () => void;
}

/** Kartu utama beranda: berapa yang aman dibelanjakan hari ini sampai gajian berikutnya. */
export const FinancialSummary = ({ onSetPayday }: FinancialSummaryProps) => {
    const {
        transactions, subscriptions, installments, debts, budgets, period, payday,
        monthlyIncome, monthlyExpense, getAccountBalances,
    } = useFinanceStore();
    const [showDetail, setShowDetail] = useState(false);

    const s = useMemo(() => computeSafeToSpend({
        accounts: getAccountBalances(),
        transactions, subscriptions, installments, debts, budgets, period,
    }), [getAccountBalances, transactions, subscriptions, installments, debts, budgets, period]);

    const over = s.leftToday < 0;
    const usedPct = s.perDay > 0 ? Math.min(100, (s.spentToday / s.perDay) * 100) : s.spentToday > 0 ? 100 : 0;
    const periodPct = (period.dayIndex / period.totalDays) * 100;

    return (
        <section aria-labelledby="safe-title" className="mb-6 space-y-3">
            <div className="rp-card p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 id="safe-title" className="text-sm font-medium text-rp-ink-2">
                            {over ? 'Lewat jatah hari ini' : 'Aman dibelanjakan hari ini'}
                        </h2>
                        <p className={cn('mt-1 text-[32px] leading-tight font-bold rp-num', over ? 'text-rp-out' : 'text-rp-ink')}>
                            {over ? '−' : ''}{formatRupiah(Math.abs(s.leftToday))}
                        </p>
                    </div>
                    <button
                        onClick={onSetPayday}
                        className="shrink-0 text-right rounded-xl px-2 py-1 -mr-2 hover:bg-rp-surface-2"
                        aria-label={`Periode ${period.label}, ${period.daysLeft} hari lagi. Ketuk untuk atur tanggal gajian`}
                    >
                        <span className="block text-xs text-rp-ink-2">{payday === 1 ? 'Akhir bulan' : 'Gajian'}</span>
                        <span className="block text-sm font-semibold text-rp-ink rp-num">{period.daysLeft} hari lagi</span>
                    </button>
                </div>

                <div className="mt-4">
                    <div className="h-2 rounded-full bg-rp-surface-2 overflow-hidden" role="progressbar" aria-valuenow={Math.round(usedPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Pemakaian jatah hari ini">
                        <div className={cn('h-full rounded-full transition-all', over ? 'bg-rp-out' : usedPct > 80 ? 'bg-rp-warn' : 'bg-rp-royal')} style={{ width: `${usedPct}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs text-rp-ink-2 rp-num">
                        <span>Terpakai {formatRupiah(s.spentToday)}</span>
                        <span>Jatah {formatRupiah(s.perDay)}/hari</span>
                    </div>
                </div>

                <button
                    onClick={() => setShowDetail(v => !v)}
                    aria-expanded={showDetail}
                    className="mt-3 w-full flex items-center justify-between min-h-[44px] text-sm text-rp-royal font-semibold"
                >
                    Dari mana angka ini?
                    <ChevronDown className={cn('w-4 h-4 transition-transform', showDetail && 'rotate-180')} />
                </button>

                {showDetail && (
                    <dl className="mt-1 space-y-2 text-sm border-t border-dashed border-rp-line pt-3">
                        <Row label="Saldo semua dompet" value={formatRupiah(s.cash)} />
                        <Row label={`Tagihan sampai ${new Date(period.end.getTime() - 86_400_000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`} value={`−${formatRupiah(s.upcomingTotal)}`} />
                        {s.upcoming.slice(0, 5).map(u => (
                            <div key={u.label + u.date.toISOString()} className="flex justify-between pl-3 text-xs text-rp-ink-2">
                                <span className="flex items-center gap-1.5 truncate"><CalendarClock className="w-3.5 h-3.5 shrink-0" />{u.label} · {u.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                <span className="rp-num shrink-0">{formatRupiah(u.amount)}</span>
                            </div>
                        ))}
                        {s.buffer > 0 && <Row label="Dana darurat (tidak diganggu)" value={`−${formatRupiah(s.buffer)}`} />}
                        <Row label="Bebas dipakai" value={formatRupiah(s.free)} strong />
                        <p className="text-xs text-rp-ink-2">Dibagi {period.daysLeft} hari tersisa sampai {payday === 1 ? 'akhir bulan' : 'gajian'}.</p>
                    </dl>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Stat icon={ArrowUpRight} tone="out" label="Keluar periode ini" value={formatRupiahShort(monthlyExpense)} sub={`hari ${period.dayIndex}/${period.totalDays}`} pct={periodPct} />
                <Stat icon={ArrowDownLeft} tone="in" label="Masuk periode ini" value={formatRupiahShort(monthlyIncome)} sub={period.label} />
            </div>
        </section>
    );
};

const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <div className={cn('flex justify-between gap-3', strong ? 'font-semibold text-rp-ink' : 'text-rp-ink-2')}>
        <dt>{label}</dt>
        <dd className="rp-num">{value}</dd>
    </div>
);

const Stat = ({ icon: Icon, tone, label, value, sub, pct }: {
    icon: typeof ArrowUpRight;
    tone: 'in' | 'out';
    label: string;
    value: string;
    sub: string;
    pct?: number;
}) => (
    <div className="rp-card p-4">
        <div className="flex items-center gap-2">
            <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', tone === 'in' ? 'bg-rp-in-soft text-rp-in' : 'bg-rp-out-soft text-rp-out')}>
                <Icon className="w-4 h-4" />
            </span>
            <span className="text-xs text-rp-ink-2">{label}</span>
        </div>
        <p className="mt-2 text-lg font-bold text-rp-ink rp-num">{value}</p>
        <p className="text-xs text-rp-ink-2 truncate">{sub}</p>
        {pct !== undefined && (
            <div className="mt-2 h-1 rounded-full bg-rp-surface-2 overflow-hidden" aria-hidden>
                <div className="h-full bg-rp-line" style={{ width: `${pct}%` }} />
            </div>
        )}
    </div>
);

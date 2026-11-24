import { useMemo } from 'react';
import { inPeriod, isNeutralCategory } from '../../lib/period';
import { useFinanceStore } from '../../store/useFinanceStore';
import { cn, formatRupiahShort } from '../../lib/utils';

/** Kategori yang dianggap "keinginan"; sisanya kebutuhan. */
const WANTS = /jajan|hobi|hiburan|belanja|makan weekend/i;

/** Rasio 50/30/20 periode berjalan, dibandingkan dengan pemasukan periode yang sama. */
export const SpendingProgress = () => {
    const { transactions, monthlyIncome, period } = useFinanceStore();

    const rows = useMemo(() => {
        let needs = 0;
        let wants = 0;
        for (const t of transactions) {
            if (t.type !== 'expense' || isNeutralCategory(t.category) || !inPeriod(t.timestamp, period)) continue;
            if (WANTS.test(t.category)) wants += t.amount;
            else needs += t.amount;
        }
        const saved = Math.max(0, monthlyIncome - needs - wants);
        return [
            { label: 'Kebutuhan', target: 50, value: needs, over: (v: number) => v > 50 },
            { label: 'Keinginan', target: 30, value: wants, over: (v: number) => v > 30 },
            { label: 'Tabungan', target: 20, value: saved, over: (v: number) => v < 20 },
        ].map(r => ({ ...r, pct: monthlyIncome > 0 ? Math.round((r.value / monthlyIncome) * 100) : 0 }));
    }, [transactions, monthlyIncome, period]);

    return (
        <section aria-labelledby="ratio-title">
            <h2 id="ratio-title" className="rp-section-title mb-2">Rasio 50/30/20</h2>
            <div className="rp-card p-4">
                {monthlyIncome === 0 ? (
                    <p className="text-sm text-rp-ink-2">Catat pemasukan periode ini dulu supaya rasionya bisa dihitung.</p>
                ) : (
                    <ul className="space-y-3">
                        {rows.map(r => {
                            const bad = r.over(r.pct);
                            return (
                                <li key={r.label}>
                                    <div className="flex items-baseline justify-between text-sm">
                                        <span className="text-rp-ink">{r.label} <span className="text-xs text-rp-ink-2">target {r.target}%</span></span>
                                        <span className={cn('font-semibold rp-num', bad ? 'text-rp-warn' : 'text-rp-ink')}>
                                            {r.pct}% <span className="text-xs font-normal text-rp-ink-2">· {formatRupiahShort(r.value)}</span>
                                        </span>
                                    </div>
                                    <div className="relative mt-1 h-1.5 rounded-full bg-rp-surface-2">
                                        <div className={cn('h-full rounded-full', bad ? 'bg-rp-warn' : 'bg-rp-royal')} style={{ width: `${Math.min(100, r.pct)}%` }} />
                                        <span className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-rp-ink-2" style={{ left: `${r.target}%` }} aria-hidden />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
};

import { useMemo } from 'react';
import { Pencil, ShieldCheck, Sliders } from 'lucide-react';
import { inPeriod, isNeutralCategory } from '../../lib/period';
import { useFinanceStore } from '../../store/useFinanceStore';
import { categoryIcon } from '../../lib/categoryIcons';
import { SubviewHeader } from '../layout/SubviewHeader';
import { cn, formatRupiah, formatRupiahShort } from '../../lib/utils';
import type { Transaction, Budget } from '../../types';

interface KebutuhanViewProps {
    transactions: Transaction[];
    budgets: Budget[];
    onOpenSettings: () => void;
    onBack: () => void;
}

const BUFFER = 'Dana Darurat (Safety Buffer)';

const barTone = (pct: number) => (pct > 100 ? 'bg-rp-out' : pct >= 80 ? 'bg-rp-warn' : 'bg-rp-royal');

export const KebutuhanView = ({ transactions, budgets, onOpenSettings, onBack }: KebutuhanViewProps) => {
    const period = useFinanceStore(s => s.period);

    const { items, total, buffer } = useMemo(() => {
        const spent = new Map<string, number>();
        for (const t of transactions) {
            if (t.type !== 'expense' || isNeutralCategory(t.category) || !inPeriod(t.timestamp, period)) continue;
            spent.set(t.category, (spent.get(t.category) ?? 0) + t.amount);
        }
        const items = budgets
            .filter(b => b.category !== BUFFER && b.limit > 0)
            .map(b => {
                const used = spent.get(b.category) ?? 0;
                return { category: b.category, limit: b.limit, used, pct: (used / b.limit) * 100 };
            })
            .sort((a, b) => b.pct - a.pct);
        const total = items.reduce((acc, i) => ({ used: acc.used + i.used, limit: acc.limit + i.limit }), { used: 0, limit: 0 });
        return { items, total, buffer: budgets.find(b => b.category === BUFFER)?.limit ?? 0 };
    }, [transactions, budgets, period]);

    const totalPct = total.limit > 0 ? (total.used / total.limit) * 100 : 0;

    return (
        <div>
            <SubviewHeader
                title="Budget"
                subtitle={`Periode ${period.label} · sisa ${period.daysLeft} hari`}
                onBack={onBack}
                action={
                    <button onClick={onOpenSettings} className="h-11 px-4 rounded-xl bg-rp-surface-2 text-rp-royal text-sm font-semibold flex items-center gap-1.5">
                        <Pencil className="w-4 h-4" /> Atur
                    </button>
                }
            />

            {items.length === 0 ? (
                <div className="rp-card p-6 text-center">
                    <Sliders className="w-8 h-8 mx-auto text-rp-ink-2" />
                    <p className="mt-3 font-semibold text-rp-ink">Belum ada budget</p>
                    <p className="mt-1 text-sm text-rp-ink-2">Tentukan batas belanja per kategori, nanti Rplanner mengingatkan saat hampir habis.</p>
                    <button onClick={onOpenSettings} className="mt-4 h-11 px-4 rounded-xl bg-rp-action text-white text-sm font-semibold">Atur budget</button>
                </div>
            ) : (
                <>
                    <section className="rp-card p-4 mb-4">
                        <div className="flex items-baseline justify-between">
                            <p className="text-sm text-rp-ink-2">Terpakai</p>
                            <p className="text-sm font-semibold text-rp-ink rp-num">{Math.round(totalPct)}%</p>
                        </div>
                        <p className="text-2xl font-bold text-rp-ink rp-num">
                            {formatRupiah(total.used)} <span className="text-sm font-medium text-rp-ink-2">/ {formatRupiahShort(total.limit)}</span>
                        </p>
                        <div className="mt-3 h-2 rounded-full bg-rp-surface-2 overflow-hidden">
                            <div className={cn('h-full rounded-full', barTone(totalPct))} style={{ width: `${Math.min(100, totalPct)}%` }} />
                        </div>
                    </section>

                    <ul className="rp-card divide-y divide-rp-line overflow-hidden">
                        {items.map(i => {
                            const Icon = categoryIcon(i.category);
                            const left = i.limit - i.used;
                            return (
                                <li key={i.category} className="p-4">
                                    <div className="flex items-center gap-3">
                                        <span className="w-9 h-9 shrink-0 rounded-xl bg-rp-surface-2 text-rp-royal flex items-center justify-center"><Icon className="w-[18px] h-[18px]" /></span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-semibold text-rp-ink truncate">{i.category}</span>
                                            <span className={cn('block text-xs rp-num', left < 0 ? 'text-rp-out' : 'text-rp-ink-2')}>
                                                {left < 0
                                                    ? `Lewat ${formatRupiah(-left)}`
                                                    : `Sisa ${formatRupiah(left)} · ${formatRupiahShort(Math.floor(left / period.daysLeft))}/hari`}
                                            </span>
                                        </span>
                                        <span className="text-right text-xs text-rp-ink-2 rp-num">
                                            <span className="block font-semibold text-rp-ink">{formatRupiahShort(i.used)}</span>
                                            dari {formatRupiahShort(i.limit)}
                                        </span>
                                    </div>
                                    <div className="mt-2.5 h-1.5 rounded-full bg-rp-surface-2 overflow-hidden">
                                        <div className={cn('h-full rounded-full', barTone(i.pct))} style={{ width: `${Math.min(100, i.pct)}%` }} />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}

            {buffer > 0 && (
                <p className="mt-4 flex items-center gap-2 text-sm text-rp-ink-2">
                    <ShieldCheck className="w-4 h-4 text-rp-in shrink-0" />
                    Dana darurat {formatRupiah(buffer)} tidak dihitung sebagai jatah belanja.
                </p>
            )}
        </div>
    );
};

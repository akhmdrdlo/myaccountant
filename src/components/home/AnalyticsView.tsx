import { useMemo, type ReactNode } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, Lightbulb } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { inPeriod, isNeutralCategory } from '../../lib/period';
import { categoryIcon } from '../../lib/categoryIcons';
import { cn, formatRupiah, formatRupiahShort } from '../../lib/utils';
import type { Transaction } from '../../types';

interface AnalyticsViewProps {
    transactions: Transaction[];
    children?: ReactNode;
}

/** Analisis periode gajian berjalan: skor, insight, kategori terbesar, dan tren harian. */
export const AnalyticsView = ({ transactions, children }: AnalyticsViewProps) => {
    const { monthlyIncome, monthlyExpense, period } = useFinanceStore();

    const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpense) / monthlyIncome : null;
    const score = savingsRate === null ? null : Math.round(Math.min(100, Math.max(0, 60 + savingsRate * 100)));
    const status = score === null ? null
        : score >= 80 ? { label: 'Sangat sehat', tone: 'text-rp-in' }
        : score >= 60 ? { label: 'Sehat', tone: 'text-rp-royal' }
        : score >= 40 ? { label: 'Waspada', tone: 'text-rp-warn' }
        : { label: 'Bahaya', tone: 'text-rp-out' };

    const { categories, trend, spike } = useMemo(() => {
        const expenses = transactions.filter(t => t.type === 'expense' && !isNeutralCategory(t.category) && inPeriod(t.timestamp, period));
        const byCat = new Map<string, number>();
        for (const t of expenses) byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
        const categories = [...byCat].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        // Satu titik per hari dari awal periode sampai hari ini (hari kosong = 0)
        const days = period.dayIndex;
        const trend = Array.from({ length: days }, (_, i) => {
            const d = new Date(period.start.getFullYear(), period.start.getMonth(), period.start.getDate() + i);
            const key = d.toDateString();
            return {
                name: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                amount: expenses.filter(t => new Date(t.timestamp).toDateString() === key).reduce((s, t) => s + t.amount, 0),
            };
        });
        const avg = trend.reduce((s, d) => s + d.amount, 0) / (trend.filter(d => d.amount > 0).length || 1);
        const spike = trend.length > 3 ? trend.filter(d => d.amount > avg * 3).sort((a, b) => b.amount - a.amount)[0] : undefined;
        return { categories, trend, spike };
    }, [transactions, period]);

    const top = categories[0];
    const max = top?.value ?? 1;

    return (
        <div className="space-y-6 pb-4">
            {/* Skor & insight dalam satu kartu */}
            <section className="rp-card p-4">
                <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 shrink-0" aria-hidden>
                        <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                            <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" className="stroke-rp-surface-2" />
                            {score !== null && (
                                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" strokeLinecap="round"
                                    className={cn('stroke-current', status?.tone)} strokeDasharray={`${(score / 100) * 97.4} 97.4`} />
                            )}
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-rp-ink rp-num">{score ?? '–'}</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-rp-ink-2">Skor periode {period.label}</p>
                        <p className={cn('text-base font-bold', status?.tone ?? 'text-rp-ink')}>{status?.label ?? 'Belum ada pemasukan'}</p>
                        <p className="text-xs text-rp-ink-2 rp-num">
                            {savingsRate === null ? 'Skor dihitung dari pemasukan dan pengeluaran periode ini.' : `Tersisihkan ${Math.round(savingsRate * 100)}% dari pemasukan.`}
                        </p>
                    </div>
                </div>
                {(top || spike) && (
                    <div className="mt-4 pt-3 border-t border-dashed border-rp-line space-y-2 text-sm">
                        {top && (
                            <p className="flex gap-2 text-rp-ink">
                                <Lightbulb className="w-4 h-4 mt-0.5 text-rp-royal shrink-0" />
                                <span>Paling banyak ke <b>{top.name}</b>: {formatRupiah(top.value)} ({Math.round((top.value / (monthlyExpense || 1)) * 100)}% pengeluaran).</span>
                            </p>
                        )}
                        {spike && (
                            <p className="flex gap-2 text-rp-ink">
                                <AlertCircle className="w-4 h-4 mt-0.5 text-rp-warn shrink-0" />
                                <span>Belanja tinggi pada {spike.name}: {formatRupiah(spike.amount)}.</span>
                            </p>
                        )}
                    </div>
                )}
            </section>

            {/* Kategori: batang horizontal lebih mudah dibaca daripada donat */}
            <section aria-labelledby="cat-title">
                <h2 id="cat-title" className="rp-section-title mb-2">Ke mana uangnya</h2>
                {categories.length === 0 ? (
                    <p className="rp-card p-5 text-sm text-rp-ink-2 text-center">Belum ada pengeluaran di periode ini.</p>
                ) : (
                    <ul className="rp-card p-4 space-y-3">
                        {categories.slice(0, 6).map((c, i) => {
                            const Icon = categoryIcon(c.name);
                            return (
                                <li key={c.name} className="flex items-center gap-3">
                                    <span className="w-8 h-8 shrink-0 rounded-lg bg-rp-surface-2 text-rp-royal flex items-center justify-center"><Icon className="w-4 h-4" /></span>
                                    <span className="flex-1 min-w-0">
                                        <span className="flex justify-between text-sm">
                                            <span className="text-rp-ink truncate">{c.name}</span>
                                            <span className="font-semibold text-rp-ink rp-num">{formatRupiahShort(c.value)}</span>
                                        </span>
                                        <span className="mt-1 block h-1.5 rounded-full bg-rp-surface-2 overflow-hidden">
                                            <span className={cn('block h-full rounded-full', i === 0 ? 'bg-rp-navy' : 'bg-rp-sky')} style={{ width: `${(c.value / max) * 100}%` }} />
                                        </span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {trend.length > 1 && (
                <section aria-labelledby="trend-title">
                    <h2 id="trend-title" className="rp-section-title mb-2">Pengeluaran harian</h2>
                    <div className="rp-card p-3 h-48" aria-hidden>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#1F5FDB" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#1F5FDB" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5E6F87' }} tickLine={false} axisLine={false} minTickGap={24} />
                                <YAxis tick={{ fontSize: 11, fill: '#5E6F87' }} tickLine={false} axisLine={false} width={44}
                                    tickFormatter={v => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}jt` : v >= 1000 ? `${Math.round(v / 1000)}rb` : String(v))} />
                                <Tooltip formatter={v => [formatRupiah(Number(v ?? 0)), 'Keluar']} contentStyle={{ borderRadius: 12, border: '1px solid #DCE5F0', fontSize: 12 }} />
                                <Area type="monotone" dataKey="amount" stroke="#1F5FDB" strokeWidth={2} fill="url(#trendFill)" isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            )}

            {children}
        </div>
    );
};

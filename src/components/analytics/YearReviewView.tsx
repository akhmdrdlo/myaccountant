import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis } from 'recharts';
import { useFinanceStore } from '../../store/useFinanceStore';
import { SubviewHeader } from '../layout/SubviewHeader';
import { isNeutralCategory } from '../../lib/period';
import { merchantKey } from '../../lib/merchantRules';
import { cn, formatRupiah, formatRupiahShort } from '../../lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const YearReviewView = ({ onBack }: { onBack: () => void }) => {
    const transactions = useFinanceStore(s => s.transactions);
    const years = useMemo(() => {
        const set = new Set(transactions.map(t => new Date(t.timestamp).getFullYear()));
        set.add(new Date().getFullYear());
        return [...set].sort((a, b) => b - a);
    }, [transactions]);
    const [year, setYear] = useState(years[0]);

    const r = useMemo(() => {
        const tx = transactions.filter(t => new Date(t.timestamp).getFullYear() === year && t.status !== 'failed' && !isNeutralCategory(t.category));
        const exp = tx.filter(t => t.type === 'expense');
        const inc = tx.filter(t => t.type === 'income');
        const income = inc.reduce((s, t) => s + t.amount, 0);
        const expense = exp.reduce((s, t) => s + t.amount, 0);

        const monthly = MONTHS.map((label, m) => ({
            label,
            value: exp.filter(t => new Date(t.timestamp).getMonth() === m).reduce((s, t) => s + t.amount, 0),
        }));
        const busiest = monthly.reduce((a, b) => (b.value > a.value ? b : a), monthly[0]);

        const byCat = new Map<string, number>();
        for (const t of exp) byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
        const categories = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

        const byMerchant = new Map<string, { name: string; count: number; total: number }>();
        for (const t of exp) {
            const key = merchantKey(t.description);
            if (!key || key.length < 3) continue;
            const cur = byMerchant.get(key) ?? { name: t.description.slice(0, 32), count: 0, total: 0 };
            cur.count++;
            cur.total += t.amount;
            byMerchant.set(key, cur);
        }
        const topMerchant = [...byMerchant.values()].sort((a, b) => b.count - a.count)[0];
        const biggest = exp.reduce<typeof exp[number] | undefined>((a, b) => (!a || b.amount > a.amount ? b : a), undefined);

        // Hari tanpa belanja sejak hari pertama ada catatan di tahun itu
        const spendDays = new Set(exp.map(t => new Date(t.timestamp).toDateString()));
        const first = tx.length ? new Date(Math.min(...tx.map(t => +new Date(t.timestamp)))) : null;
        const last = year === new Date().getFullYear() ? new Date() : new Date(year, 11, 31);
        const span = first ? Math.max(1, Math.round((last.getTime() - first.getTime()) / 86_400_000) + 1) : 0;
        const noSpendDays = Math.max(0, span - spendDays.size);

        return {
            count: tx.length, income, expense, saved: income - expense,
            rate: income > 0 ? Math.round(((income - expense) / income) * 100) : null,
            monthly, busiest, categories, topMerchant, biggest, noSpendDays,
        };
    }, [transactions, year]);

    return (
        <div className="space-y-4">
            <SubviewHeader title={`Rekap ${year}`} subtitle="Setahun uangmu dalam satu layar" onBack={onBack}
                action={years.length > 1 ? (
                    <select value={year} onChange={e => setYear(Number(e.target.value))} aria-label="Pilih tahun"
                        className="h-11 px-3 rounded-xl bg-rp-surface border border-rp-line text-sm text-rp-ink rp-num">
                        {years.map(y => <option key={y}>{y}</option>)}
                    </select>
                ) : undefined}
            />

            {r.count === 0 ? (
                <div className="rp-card p-6 text-center text-sm text-rp-ink-2">Belum ada catatan di {year}.</div>
            ) : (
                <>
                    <section className="rounded-2xl bg-[#0B3C7A] text-white p-5 relative overflow-hidden">
                        <div aria-hidden className="absolute -top-px right-0 w-36 h-full bg-[#1F5FDB]/40" style={{ clipPath: 'polygon(55% 0, 100% 0, 100% 70%, 20% 100%, 0 100%)' }} />
                        <div className="relative">
                            <p className="text-sm text-white/80">{r.saved >= 0 ? 'Berhasil disisihkan' : 'Lebih besar pasak daripada tiang'}</p>
                            <p className="text-[32px] leading-tight font-bold rp-num">{r.saved < 0 ? '−' : ''}{formatRupiah(Math.abs(r.saved))}</p>
                            {r.rate !== null && <p className="text-sm text-white/80 rp-num">{r.rate}% dari pemasukan</p>}
                            <dl className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-dashed border-white/25 text-sm">
                                <div><dt className="text-white/70 text-xs">Masuk</dt><dd className="font-semibold rp-num">{formatRupiahShort(r.income)}</dd></div>
                                <div><dt className="text-white/70 text-xs">Keluar</dt><dd className="font-semibold rp-num">{formatRupiahShort(r.expense)}</dd></div>
                            </dl>
                        </div>
                    </section>

                    <section className="rp-card p-4">
                        <h2 className="rp-section-title">Pengeluaran per bulan</h2>
                        <p className="text-xs text-rp-ink-2">Paling boros: {r.busiest.label} ({formatRupiahShort(r.busiest.value)})</p>
                        <div className="h-36 mt-3" aria-hidden>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={r.monthly} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11, fill: '#5E6F87' }} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                                        {r.monthly.map(m => <Cell key={m.label} fill={m.label === r.busiest.label ? '#F26A1B' : '#5AB0E4'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <section className="rp-card p-4">
                        <h2 className="rp-section-title mb-3">Uang paling banyak lari ke</h2>
                        <ol className="space-y-3">
                            {r.categories.map(([cat, val], i) => (
                                <li key={cat}>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-rp-ink"><span className="text-rp-ink-2 rp-num mr-2">{i + 1}</span>{cat}</span>
                                        <span className="font-semibold text-rp-ink rp-num">{formatRupiahShort(val)}</span>
                                    </div>
                                    <div className="mt-1 h-1.5 rounded-full bg-rp-surface-2 overflow-hidden">
                                        <div className={cn('h-full rounded-full', i === 0 ? 'bg-rp-navy' : 'bg-rp-sky')} style={{ width: `${(val / r.categories[0][1]) * 100}%` }} />
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <div className="grid grid-cols-2 gap-3">
                        {r.topMerchant && (
                            <Fact label="Langganan setia" value={r.topMerchant.name} sub={`${r.topMerchant.count}× · ${formatRupiahShort(r.topMerchant.total)}`} />
                        )}
                        {r.biggest && (
                            <Fact label="Belanja terbesar" value={formatRupiahShort(r.biggest.amount)} sub={r.biggest.description || r.biggest.category} />
                        )}
                        <Fact label="Hari tanpa belanja" value={`${r.noSpendDays} hari`} sub="sejak catatan pertama" />
                        <Fact label="Transaksi dicatat" value={r.count.toLocaleString('id-ID')} sub="tidak termasuk transfer" />
                    </div>
                </>
            )}
        </div>
    );
};

const Fact = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
    <div className="rp-card p-4 min-w-0">
        <p className="text-xs text-rp-ink-2">{label}</p>
        <p className="mt-1 text-base font-bold text-rp-ink truncate rp-num">{value}</p>
        <p className="text-xs text-rp-ink-2 truncate">{sub}</p>
    </div>
);

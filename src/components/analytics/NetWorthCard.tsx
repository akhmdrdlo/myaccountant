import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useFinanceStore } from '../../store/useFinanceStore';
import { cn, formatRupiah, formatRupiahShort } from '../../lib/utils';

/**
 * Kekayaan bersih = saldo dompet + investasi + piutang − utang − sisa cicilan.
 * Riwayat bulanan dihitung dari saldo dompet di akhir tiap bulan (investasi & utang hanya diketahui nilainya sekarang).
 */
export const NetWorthCard = () => {
    const { transactions, accounts, investments, debts, installments, getAccountBalances } = useFinanceStore();

    const data = useMemo(() => {
        const cash = getAccountBalances().reduce((s, a) => s + a.balance, 0);
        const invest = investments.reduce((s, i) => s + i.currentPrice * i.totalUnits, 0);
        const open = debts.filter(d => !d.settledAt);
        const receivable = open.filter(d => d.direction === 'owed').reduce((s, d) => s + d.amount, 0);
        const payable = open.filter(d => d.direction === 'owe').reduce((s, d) => s + d.amount, 0);
        const instLeft = installments.reduce((s, i) => s + i.monthlyAmount * Math.max(0, i.totalMonths - i.paidMonths), 0);
        const now = cash + invest + receivable - payable - instLeft;
        const nonCashNow = invest + receivable - payable - instLeft;

        // Saldo dompet di akhir 12 bulan terakhir
        const initial = accounts.reduce((s, a) => s + (a.initialBalance || 0), 0);
        const sorted = [...transactions].filter(t => t.status !== 'failed').sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        const today = new Date();
        const points: { label: string; value: number }[] = [];
        let idx = 0;
        let running = initial;
        for (let k = 11; k >= 0; k--) {
            const end = new Date(today.getFullYear(), today.getMonth() - k + 1, 1);
            while (idx < sorted.length && new Date(sorted[idx].timestamp) < end) {
                const t = sorted[idx++];
                if (t.type === 'income') running += t.amount;
                else if (t.type === 'expense') running -= t.amount;
            }
            const isLast = k === 0;
            points.push({
                label: new Date(end.getFullYear(), end.getMonth() - 1, 1).toLocaleDateString('id-ID', { month: 'short' }),
                // Bulan berjalan memakai nilai lengkap; bulan lalu hanya saldo dompet + komponen non-tunai saat ini
                value: isLast ? now : running + nonCashNow,
            });
        }
        const firstWithData = points.findIndex(p => p.value !== points[0].value);
        const trimmed = firstWithData > 0 ? points.slice(Math.max(0, firstWithData - 1)) : points;
        const prev = trimmed.length > 1 ? trimmed[trimmed.length - 2].value : now;
        return { now, cash, invest, receivable, payable, instLeft, points: trimmed, change: now - prev };
    }, [transactions, accounts, investments, debts, installments, getAccountBalances]);

    const up = data.change >= 0;

    return (
        <section className="rp-card p-5 mb-6" aria-labelledby="nw-title">
            <h2 id="nw-title" className="text-sm font-medium text-rp-ink-2">Kekayaan bersih</h2>
            <p className="mt-1 text-[28px] leading-tight font-bold text-rp-ink rp-num">{formatRupiah(data.now)}</p>
            {data.points.length > 1 && (
                <p className={cn('text-sm font-medium rp-num', up ? 'text-rp-in' : 'text-rp-out')}>
                    {up ? '+' : '−'}{formatRupiah(Math.abs(data.change))} dari bulan lalu
                </p>
            )}

            {data.points.length > 1 && (
                <div className="h-40 mt-4 -mx-2" aria-hidden>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.points} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                            <defs>
                                <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#1F5FDB" stopOpacity={0.25} />
                                    <stop offset="100%" stopColor="#1F5FDB" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#5E6F87' }} />
                            <YAxis hide domain={['dataMin', 'dataMax']} />
                            <Tooltip
                                formatter={(v) => [formatRupiah(Number(v ?? 0)), 'Kekayaan']}
                                contentStyle={{ borderRadius: 12, border: '1px solid #DCE5F0', fontSize: 12 }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#1F5FDB" strokeWidth={2} fill="url(#nwFill)" isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-dashed border-rp-line pt-3">
                <Item label="Dompet" value={data.cash} />
                <Item label="Investasi" value={data.invest} />
                <Item label="Piutang" value={data.receivable} />
                <Item label="Utang & cicilan" value={-(data.payable + data.instLeft)} />
            </dl>
        </section>
    );
};

const Item = ({ label, value }: { label: string; value: number }) => (
    <div className="flex justify-between gap-2">
        <dt className="text-rp-ink-2">{label}</dt>
        <dd className={cn('font-semibold rp-num', value < 0 ? 'text-rp-out' : 'text-rp-ink')}>{formatRupiahShort(value)}</dd>
    </div>
);

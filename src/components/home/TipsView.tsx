import { useMemo } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { SubviewHeader } from '../layout/SubviewHeader';
import { isNeutralCategory } from '../../lib/period';
import { cn, formatRupiah } from '../../lib/utils';

interface TipsViewProps {
    onBack: () => void;
}

type Status = { text: string; tone: 'in' | 'warn' | 'out' | 'ink' } | null;

/** Lima kebiasaan dasar, masing-masing dengan kondisi keuanganmu saat ini. */
export const TipsView = ({ onBack }: TipsViewProps) => {
    const { transactions, budgets, installments, subscriptions, monthlyIncome } = useFinanceStore();

    const tips = useMemo(() => {
        const since = Date.now() - 90 * 86_400_000;
        const spend3m = transactions
            .filter(t => t.type === 'expense' && !isNeutralCategory(t.category) && +new Date(t.timestamp) >= since)
            .reduce((s, t) => s + t.amount, 0);
        const avgMonthly = spend3m / 3;
        const buffer = budgets.find(b => b.category === 'Dana Darurat (Safety Buffer)')?.limit ?? 0;
        const instPerMonth = installments.filter(i => i.paidMonths < i.totalMonths).reduce((s, i) => s + i.monthlyAmount, 0);
        const subsPerMonth = subscriptions.reduce((s, x) => s + x.amount, 0);

        const bufferStatus: Status = avgMonthly > 0
            ? { text: `Dana daruratmu ${(buffer / avgMonthly).toFixed(1).replace('.', ',')} bulan pengeluaran.`, tone: buffer / avgMonthly >= 3 ? 'in' : 'warn' }
            : null;
        const instStatus: Status = monthlyIncome > 0 && instPerMonth > 0
            ? { text: `Cicilanmu ${Math.round((instPerMonth / monthlyIncome) * 100)}% dari pemasukan periode ini.`, tone: instPerMonth / monthlyIncome <= 0.3 ? 'in' : 'out' }
            : instPerMonth === 0 ? { text: 'Kamu tidak punya cicilan berjalan.', tone: 'in' } : null;
        const subsStatus: Status = subsPerMonth > 0
            ? { text: `Langgananmu ${formatRupiah(subsPerMonth)}/bulan dari ${subscriptions.length} layanan.`, tone: 'ink' }
            : null;

        return [
            { title: 'Bagi penghasilan 50/30/20', desc: '50% kebutuhan pokok (kos, makan, utilitas), 30% keinginan, 20% tabungan atau investasi. Pantau rasionya di tab Analisis.', status: null as Status },
            { title: 'Punya dana darurat 3–6 bulan', desc: 'Simpan di dompet terpisah untuk kejadian tak terduga seperti sakit atau HP rusak. Atur nominalnya di Budget.', status: bufferStatus },
            { title: 'Cicilan maksimal 30% penghasilan', desc: 'Termasuk paylater, kredit HP, dan kendaraan. Lebih dari itu, arus kas mudah seret.', status: instStatus },
            { title: 'Sisihkan di awal, bukan sisa di akhir', desc: 'Begitu gajian masuk, langsung pindahkan jatah tabungan ke dompet lain sebelum dibelanjakan.', status: null as Status },
            { title: 'Cek langganan tiap bulan', desc: 'Matikan layanan yang tidak dipakai lebih dari sebulan. Biayanya kecil, tapi menumpuk.', status: subsStatus },
        ];
    }, [transactions, budgets, installments, subscriptions, monthlyIncome]);

    return (
        <div>
            <SubviewHeader title="Tips keuangan" subtitle="Lima kebiasaan dasar, dicek dengan datamu" onBack={onBack} />
            <ol className="rp-card divide-y divide-rp-line overflow-hidden">
                {tips.map((tip, i) => (
                    <li key={tip.title} className="flex gap-3 p-4">
                        <span className="w-7 h-7 shrink-0 rounded-lg bg-rp-surface-2 text-rp-royal text-sm font-bold flex items-center justify-center rp-num">{i + 1}</span>
                        <div className="min-w-0">
                            <h2 className="text-sm font-semibold text-rp-ink">{tip.title}</h2>
                            <p className="mt-0.5 text-sm text-rp-ink-2 leading-relaxed">{tip.desc}</p>
                            {tip.status && (
                                <p className={cn('mt-2 text-xs font-semibold',
                                    tip.status.tone === 'in' ? 'text-rp-in' : tip.status.tone === 'warn' ? 'text-rp-warn' : tip.status.tone === 'out' ? 'text-rp-out' : 'text-rp-royal')}>
                                    {tip.status.text}
                                </p>
                            )}
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    );
};

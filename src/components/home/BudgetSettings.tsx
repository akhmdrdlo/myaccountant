import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { Budget } from '../../types';
import { useFinanceStore } from '../../store/useFinanceStore';
import { categoryIcon } from '../../lib/categoryIcons';
import { isNeutralCategory } from '../../lib/period';
import { formatRupiahShort } from '../../lib/utils';
import { MoneyInput, PrimaryButton, Sheet } from '../common/Sheet';

interface BudgetSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    budgets: Budget[];
    categories: string[];
    onSave: (budgets: Budget[]) => void;
}

const BUFFER = 'Dana Darurat (Safety Buffer)';

export const BudgetSettings = ({ isOpen, onClose, budgets, categories, onSave }: BudgetSettingsProps) => {
    const transactions = useFinanceStore(s => s.transactions);
    const [limits, setLimits] = useState<Record<string, number | ''>>({});

    const list = useMemo(
        () => [...new Set(categories)].filter(c => c !== BUFFER && !isNeutralCategory(c) && !/^(gaji|bonus|freelance)$/i.test(c)),
        [categories],
    );

    // Rata-rata pengeluaran per bulan (3 bulan terakhir) sebagai patokan
    const avg = useMemo(() => {
        const since = Date.now() - 90 * 86_400_000;
        const sum = new Map<string, number>();
        for (const t of transactions) {
            if (t.type === 'expense' && +new Date(t.timestamp) >= since) sum.set(t.category, (sum.get(t.category) ?? 0) + t.amount);
        }
        return new Map([...sum].map(([k, v]) => [k, Math.round(v / 3)]));
    }, [transactions]);

    useEffect(() => {
        if (!isOpen) return;
        setLimits(Object.fromEntries([BUFFER, ...list].map(c => [c, budgets.find(b => b.category === c)?.limit || ''])));
    }, [isOpen, budgets, list]);

    if (!isOpen) return null;

    const save = () => {
        onSave(Object.entries(limits)
            .filter(([, v]) => Number(v) > 0)
            .map(([category, limit]) => ({ category, limit: Number(limit) })));
        onClose();
    };

    return (
        <Sheet title="Atur budget" onClose={onClose} footer={<PrimaryButton onClick={save}>Simpan budget</PrimaryButton>}>
            <div className="rounded-xl bg-rp-in-soft p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-rp-ink"><ShieldCheck className="w-4 h-4 text-rp-in" /> Dana darurat</p>
                <p className="text-xs text-rp-ink-2 mb-1">Uang yang tidak boleh dipakai belanja. Dikurangkan dari jatah harian.</p>
                <MoneyInput value={limits[BUFFER] ?? ''} onChange={v => setLimits(l => ({ ...l, [BUFFER]: v }))} />
            </div>

            <p className="text-xs text-rp-ink-2 pt-1">Batas per periode gajian. Kosongkan kategori yang tidak perlu dibatasi.</p>

            <ul className="divide-y divide-rp-line">
                {list.map(c => {
                    const Icon = categoryIcon(c);
                    const a = avg.get(c);
                    return (
                        <li key={c} className="flex items-center gap-3 py-2.5">
                            <span className="w-9 h-9 shrink-0 rounded-xl bg-rp-surface-2 text-rp-royal flex items-center justify-center"><Icon className="w-[18px] h-[18px]" /></span>
                            <span className="flex-1 min-w-0">
                                <span className="block text-sm font-medium text-rp-ink truncate">{c}</span>
                                {a ? <span className="block text-xs text-rp-ink-2 rp-num">Rata-rata {formatRupiahShort(a)}/bln</span> : null}
                            </span>
                            <span className="w-36 shrink-0 [&>div]:mt-0">
                                <MoneyInput value={limits[c] ?? ''} onChange={v => setLimits(l => ({ ...l, [c]: v }))} />
                            </span>
                        </li>
                    );
                })}
            </ul>
        </Sheet>
    );
};

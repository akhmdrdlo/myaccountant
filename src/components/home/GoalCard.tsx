import { Link2, Target } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn, formatRupiah, formatRupiahShort } from '../../lib/utils';

interface GoalCardProps {
    title: string;
    currentAmount: number | string;
    targetAmount: number;
    color?: string;
    deadline?: string;
    onEdit?: () => void;
    safetyBuffer?: number;
    linkedAccount?: string;
}

/** Kartu wishlist ringkas: progres, sisa, dan satu saran yang paling berguna. */
export const GoalCard = ({ title, currentAmount, targetAmount, deadline, onEdit, safetyBuffer = 0, linkedAccount }: GoalCardProps) => {
    const current = Number(currentAmount) || 0;
    const pct = targetAmount > 0 ? Math.min(100, Math.max(0, (current / targetAmount) * 100)) : 0;
    const remaining = Math.max(0, targetAmount - current);
    const reached = remaining === 0 && targetAmount > 0;

    const due = deadline ? new Date(deadline) : null;
    const daysLeft = due && !isNaN(due.getTime()) ? differenceInDays(due, new Date()) : null;

    // Satu baris saran, dipilih dari yang paling relevan
    let hint: { text: string; tone: 'in' | 'warn' | 'ink' } | null = null;
    if (reached) {
        hint = linkedAccount && current - targetAmount < safetyBuffer
            ? { text: `Sudah cukup, tapi sisa saldo jadi di bawah dana darurat ${formatRupiahShort(safetyBuffer)}.`, tone: 'warn' }
            : { text: 'Uangnya sudah cukup.', tone: 'in' };
    } else if (daysLeft !== null && daysLeft > 0) {
        hint = daysLeft > 45
            ? { text: `Sisihkan ${formatRupiah(Math.ceil(remaining / (daysLeft / 30.44)))}/bulan supaya tepat waktu.`, tone: 'ink' }
            : { text: `Sisihkan ${formatRupiah(Math.ceil(remaining / daysLeft))}/hari supaya tepat waktu.`, tone: 'ink' };
    } else if (daysLeft !== null && daysLeft <= 0) {
        hint = { text: 'Target waktunya sudah lewat. Atur ulang tanggalnya?', tone: 'warn' };
    }

    return (
        <button onClick={onEdit} className="w-full rp-card p-4 text-left hover:bg-rp-surface-2 transition">
            <div className="flex items-center gap-3">
                {/* Cincin progres */}
                <span className="relative w-12 h-12 shrink-0" aria-hidden>
                    <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" className="stroke-rp-surface-2" />
                        <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" strokeLinecap="round"
                            className={reached ? 'stroke-rp-in' : 'stroke-rp-royal'}
                            strokeDasharray={`${(pct / 100) * 97.4} 97.4`} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center">
                        {reached ? <Target className="w-4 h-4 text-rp-in" /> : <span className="text-[11px] font-bold text-rp-ink rp-num">{Math.round(pct)}%</span>}
                    </span>
                </span>

                <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-rp-ink truncate">{title}</span>
                    <span className="block text-xs text-rp-ink-2 rp-num">
                        {formatRupiahShort(current)} dari {formatRupiahShort(targetAmount)}
                        {due && !isNaN(due.getTime()) ? ` · ${format(due, 'd MMM yyyy', { locale: localeId })}` : ''}
                    </span>
                    {linkedAccount && (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-rp-royal"><Link2 className="w-3 h-3" />{linkedAccount}</span>
                    )}
                </span>
            </div>

            {hint && (
                <p className={cn('mt-3 pt-3 border-t border-dashed border-rp-line text-xs',
                    hint.tone === 'in' ? 'text-rp-in' : hint.tone === 'warn' ? 'text-rp-warn' : 'text-rp-ink-2')}>
                    {hint.text}
                </p>
            )}
        </button>
    );
};

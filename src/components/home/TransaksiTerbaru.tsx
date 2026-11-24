import { ChevronRight, ReceiptText } from 'lucide-react';
import type { Transaction } from '../../types';
import { categoryIcon } from '../../lib/categoryIcons';
import { isNeutralCategory } from '../../lib/period';
import { cn, formatRupiah } from '../../lib/utils';

interface TransaksiTerbaruProps {
    transactions: Transaction[];
    onSelect?: (t: Transaction) => void;
    onSeeAll?: () => void;
}

const when = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(Date.now() - 86_400_000);
    if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

/** Lima transaksi terakhir di beranda; ketuk untuk ubah. */
export const TransaksiTerbaru = ({ transactions, onSelect, onSeeAll }: TransaksiTerbaruProps) => {
    const recent = [...transactions].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5);

    return (
        <section aria-labelledby="recent-title" className="mb-6">
            <div className="flex items-center justify-between mb-2">
                <h2 id="recent-title" className="rp-section-title">Terakhir dicatat</h2>
                {transactions.length > 5 && (
                    <button onClick={onSeeAll} className="h-9 -mr-2 px-2 text-sm font-semibold text-rp-royal flex items-center">
                        Semua <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>

            {recent.length === 0 ? (
                <div className="rp-card p-6 text-center">
                    <ReceiptText className="w-7 h-7 mx-auto text-rp-ink-2" />
                    <p className="mt-2 text-sm text-rp-ink-2">Belum ada catatan. Ketuk tombol Catat di bawah untuk mulai.</p>
                </div>
            ) : (
                <ul className="rp-card divide-y divide-rp-line overflow-hidden">
                    {recent.map(t => {
                        const Icon = categoryIcon(t.category);
                        const income = t.type === 'income';
                        const neutral = isNeutralCategory(t.category);
                        return (
                            <li key={t.id}>
                                <button onClick={() => onSelect?.(t)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-rp-surface-2 transition">
                                    <span className={cn('w-9 h-9 shrink-0 rounded-xl flex items-center justify-center',
                                        neutral ? 'bg-rp-surface-2 text-rp-ink-2' : income ? 'bg-rp-in-soft text-rp-in' : 'bg-rp-out-soft text-rp-out')}>
                                        <Icon className="w-[18px] h-[18px]" />
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-medium text-rp-ink truncate">{t.description || t.category}</span>
                                        <span className="block text-xs text-rp-ink-2 truncate">{t.category} · {t.account} · {when(t.timestamp)}</span>
                                    </span>
                                    <span className={cn('text-sm font-semibold rp-num shrink-0', neutral ? 'text-rp-ink-2' : income ? 'text-rp-in' : 'text-rp-ink')}>
                                        {income ? '+' : '−'}{formatRupiah(t.amount)}
                                    </span>
                                    {t.status === 'pending' && <span className="sr-only">menunggu terkirim</span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
};

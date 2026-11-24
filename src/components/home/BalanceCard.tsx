import { useState } from 'react';
import { Eye, EyeOff, RefreshCw, Coffee, ShoppingBag, Zap, ArrowLeftRight, type LucideIcon } from 'lucide-react';
import { formatRupiah } from '../../lib/utils';

interface BalanceCardProps {
    name?: string;
    balance: number;
    color?: string;
    loading?: boolean;
    breakdown?: {
        cash: number;
        bank: number;
    };
    onTransfer?: () => void;
    onQuickPay?: (category: string, type: 'expense' | 'transfer') => void;
}

const VISIBILITY_KEY = 'rplanner_balance_visible';

export const BalanceCard = ({ name = 'Total Saldo', balance, loading, breakdown, onTransfer, onQuickPay }: BalanceCardProps) => {
    const [visible, setVisible] = useState(() => localStorage.getItem(VISIBILITY_KEY) === '1');

    const toggleVisible = () => {
        setVisible(v => {
            localStorage.setItem(VISIBILITY_KEY, v ? '0' : '1');
            return !v;
        });
    };

    const isTotal = name === 'Total Saldo';

    return (
        <section aria-label={`Saldo ${name}`} className="relative overflow-hidden rounded-2xl bg-[#0B3C7A] text-white shadow-rp-2 mb-6">
            {/* Potongan diagonal — mengulang bentuk logo */}
            <div
                aria-hidden
                className="absolute -top-px right-0 w-40 h-full bg-[#1F5FDB]/40"
                style={{ clipPath: 'polygon(55% 0, 100% 0, 100% 70%, 20% 100%, 0 100%)' }}
            />

            <div className="relative p-5">
                <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-white/80">{name}</p>
                    <button
                        onClick={toggleVisible}
                        aria-label={visible ? 'Sembunyikan saldo' : 'Tampilkan saldo'}
                        aria-pressed={visible}
                        className="-mt-2 -mr-2 w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white/10 transition"
                    >
                        {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>

                <div className="flex items-center gap-2 mt-1">
                    <p className="text-[32px] leading-tight font-bold rp-num">
                        {loading ? (
                            <span className="inline-block w-44 h-8 rounded-lg bg-white/15 animate-pulse align-middle" />
                        ) : visible ? (
                            formatRupiah(balance)
                        ) : (
                            'Rp••••••'
                        )}
                    </p>
                    {loading && <RefreshCw className="w-4 h-4 animate-spin text-white/70" aria-label="Memuat" />}
                </div>

                {breakdown && visible && !loading && (
                    <dl className="flex gap-8 mt-4 pt-3 border-t border-dashed border-white/25">
                        <div>
                            <dt className="text-xs text-white/70">Tunai</dt>
                            <dd className="text-sm font-semibold rp-num">{formatRupiah(breakdown.cash)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-white/70">Bank & e-wallet</dt>
                            <dd className="text-sm font-semibold rp-num">{formatRupiah(breakdown.bank)}</dd>
                        </div>
                    </dl>
                )}
            </div>

            {isTotal && (
                <div className="relative grid grid-cols-4 bg-black/15 px-2 py-2">
                    <QuickButton icon={ArrowLeftRight} label="Transfer" onClick={() => onTransfer?.()} />
                    <QuickButton icon={Coffee} label="Makan" onClick={() => onQuickPay?.('Makan Weekday', 'expense')} />
                    <QuickButton icon={ShoppingBag} label="Jajan" onClick={() => onQuickPay?.('Jajan/Hobi', 'expense')} />
                    <QuickButton icon={Zap} label="Utilitas" onClick={() => onQuickPay?.('Utilitas', 'expense')} />
                </div>
            )}
        </section>
    );
};

const QuickButton = ({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition">
        <Icon className="w-5 h-5" />
        <span className="text-xs font-medium text-white/90">{label}</span>
    </button>
);

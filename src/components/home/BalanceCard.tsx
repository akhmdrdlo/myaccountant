import { useState } from 'react';
import { Eye, EyeOff, Wallet, RefreshCw, Coffee, ShoppingBag, Zap, ArrowLeftRight } from 'lucide-react';
import { cn } from '../../lib/utils';

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

export const BalanceCard = ({ name = "Total Saldo", balance, color = "from-brimo-primary to-brimo-secondary", loading, breakdown, onTransfer, onQuickPay }: BalanceCardProps) => {
    const [visible, setVisible] = useState(false);

    // Format currency: IDR
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className={cn("w-full rounded-2xl p-5 text-white shadow-lg shadow-blue-200 mb-6 relative overflow-hidden bg-gradient-to-r shrink-0 snap-center", color)}>
            {/* Decorative Circles */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header: Account Info */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-full">
                        <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-white/90 font-medium tracking-wide">{name}</p>
                        {/* <div className="flex items-center gap-1 group cursor-pointer" onClick={() => alert("Copied!")}>
                            <p className="text-[10px] text-blue-200 font-mono">1234 **** 5678</p>
                            <Copy className="w-3 h-3 text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div> */}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setVisible(!visible)}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    >
                        {visible ? <EyeOff className="w-5 h-5 text-blue-100" /> : <Eye className="w-5 h-5 text-blue-100" />}
                    </button>
                </div>
            </div>

            {/* Balance */}
            <div className="mb-4">
                <p className="text-xs text-blue-200 mb-1">Saldo Rekening</p>
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold tracking-tight">
                        {loading ? (
                            <span className="animate-pulse">Loading...</span>
                        ) : visible ? (
                            formatCurrency(balance)
                        ) : (
                            "Rp •••••••••"
                        )}
                    </h2>
                    {loading && <RefreshCw className="w-4 h-4 animate-spin text-blue-200" />}
                </div>

                {/* Breakdown (Only if provided) */}
                {breakdown && visible && (
                    <div className="flex gap-6 mt-3 pt-3 border-t border-white/10">
                        <div>
                            <p className="text-[10px] text-blue-200 uppercase tracking-wider">Cash</p>
                            <p className="text-sm font-semibold">{formatCurrency(breakdown.cash)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-blue-200 uppercase tracking-wider">Bank</p>
                            <p className="text-sm font-semibold">{formatCurrency(breakdown.bank)}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Pays (Only for Main Total Balance Card) */}
            {(name === "Total Saldo") && (
                <div className="mt-4 pt-4 border-t border-white/10 bg-black/10 -mx-5 -mb-5 px-5 py-3 grid grid-cols-4 gap-2 text-center">
                    <button
                        onClick={() => onTransfer && onTransfer()}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition active:scale-95 mx-auto">
                            <ArrowLeftRight className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] text-white/90 font-medium">Transfer</span>
                    </button>

                    <button
                        onClick={() => onQuickPay && onQuickPay('Makan Weekday', 'expense')}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition active:scale-95 mx-auto">
                            <Coffee className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] text-white/90 font-medium font-sans">Makan</span>
                    </button>

                    <button
                        onClick={() => onQuickPay && onQuickPay('Jajan/Hobi', 'expense')}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition active:scale-95 mx-auto">
                            <ShoppingBag className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] text-white/90 font-medium font-sans">Jajan</span>
                    </button>

                    <button
                        onClick={() => onQuickPay && onQuickPay('Utilitas', 'expense')}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition active:scale-95 mx-auto">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] text-white/90 font-medium font-sans">Utilitas</span>
                    </button>
                </div>
            )}
        </div>
    );
};

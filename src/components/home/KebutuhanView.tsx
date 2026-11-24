import { useMemo } from 'react';
import { inPeriod } from '../../lib/period';
import { useFinanceStore as usePeriodStore } from '../../store/useFinanceStore';
import { ArrowLeft, Sliders, HelpCircle, Edit } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Transaction, Budget } from '../../types';

interface KebutuhanViewProps {
    transactions: Transaction[];
    budgets: Budget[];
    onOpenSettings: () => void;
    onBack: () => void;
}

export const KebutuhanView = ({ transactions, budgets, onOpenSettings, onBack }: KebutuhanViewProps) => {

    const period = usePeriodStore(st => st.period);
    const budgetStatus = useMemo(() => {

        const expenses = transactions.filter(t => {
            return t.type === 'expense' &&
                inPeriod(t.timestamp, period);
        });

        const status: Record<string, { spent: number; limit: number; percent: number; color: string; icon: string }> = {};

        // Default categories configuration if not in budgets state
        const fallbackEmojis: Record<string, string> = {
            'Makan Weekday': '🍔',
            'Makan Weekend': '🍔',
            'Transport': '🚌',
            'Jajan/Hobi': '🛍️',
            'Utilitas': '💡',
            'Internet': '🌐',
            'Dana Darurat (Safety Buffer)': '🛡️',
            'Mama': '👩',
            'Paket Data': '📱',
            'Lainnya': '💵'
        };

        // Initialize with Limits from Prop
        budgets.forEach(b => {
            status[b.category] = {
                spent: 0,
                limit: b.limit,
                percent: 0,
                color: b.color || 'bg-blue-500', // Default color is purple (per reference)
                icon: b.icon || fallbackEmojis[b.category] || '💵'
            };
        });

        // Sum expenses
        expenses.forEach(t => {
            if (status[t.category]) {
                status[t.category].spent += t.amount;
            }
        });

        // Calculate percent
        Object.keys(status).forEach(cat => {
            if (status[cat].limit > 0) {
                status[cat].percent = (status[cat].spent / status[cat].limit) * 100;
            }
        });

        return status;
    }, [transactions, budgets, period]);

    // Calculate overall budget limits and spent
    const overall = useMemo(() => {
        let totalSpent = 0;
        let totalLimit = 0;
        Object.values(budgetStatus).forEach(b => {
            totalSpent += b.spent;
            totalLimit += b.limit;
        });
        const percent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
        return { spent: totalSpent, limit: totalLimit, percent };
    }, [budgetStatus]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="flex flex-col min-h-[80vh] bg-rp-canvas dark:bg-gray-900 transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                        <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                    </button>
                    <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                            <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Kebutuhan Anggaran
                        </h2>
                        <p className="text-xs text-gray-400 font-medium">Batas limit belanja bulanan</p>
                    </div>
                </div>
                <button
                    onClick={onOpenSettings}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
                >
                    <Edit size={12} />
                    Ubah
                </button>
            </div>

            <div className="p-4 space-y-5">
                {/* Overall Summary Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Total Penggunaan</span>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{Math.round(overall.percent)}%</span>
                    </div>
                    {/* Purple bar */}
                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, overall.percent)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                        <span>Terpakai: Rp {formatCurrency(overall.spent)}</span>
                        <span>Batas: Rp {formatCurrency(overall.limit)}</span>
                    </div>
                </div>

                {/* Budget Items List */}
                <div className="space-y-3">
                    {Object.entries(budgetStatus).map(([category, data]) => (
                        <div key={category} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{data.icon}</span>
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{category}</span>
                                </div>
                                <span className={cn(
                                    "text-xs font-bold",
                                    data.percent > 100 ? "text-red-500" : "text-gray-500 dark:text-gray-400"
                                )}>
                                    {Math.round(data.percent)}%
                                </span>
                            </div>

                            {/* Progress bar inside */}
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full transition-all duration-500", data.color)}
                                    style={{ width: `${Math.min(100, data.percent)}%` }}
                                />
                            </div>

                            <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500">
                                <span>Terpakai: Rp {formatCurrency(data.spent)}</span>
                                <span>Batas: Rp {formatCurrency(data.limit)}</span>
                            </div>
                        </div>
                    ))}
                    {Object.keys(budgetStatus).length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-gray-300 animate-bounce" />
                            <p className="text-xs">Belum ada budget bulanan yang diatur.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

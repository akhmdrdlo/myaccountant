import { useMemo } from 'react';
import type { Transaction, Budget } from '../../types';
import { cn } from '../../lib/utils';

interface BudgetListProps {
    transactions: Transaction[];
    budgets: Budget[];
    onOpenSettings: () => void;
}

export const BudgetList = ({ transactions, budgets, onOpenSettings }: BudgetListProps) => {

    // Calculate expenses for current month
    const budgetStatus = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const expenses = transactions.filter(t => {
            const date = new Date(t.timestamp);
            return t.type === 'expense' &&
                date.getMonth() === currentMonth &&
                date.getFullYear() === currentYear;
        });

        const status: Record<string, { spent: number; limit: number; percent: number }> = {};

        // Initialize with Limits from Prop
        budgets.forEach(b => {
            status[b.category] = { spent: 0, limit: b.limit, percent: 0 };
        });

        // Sum expenses
        expenses.forEach(t => {
            if (status[t.category]) {
                status[t.category].spent += t.amount;
            } else {
                // Check if this category matches a budget but wasn't initialized? 
                // (Already done above). If category has no budget, we might skip or show as unbudgeted?
                // For now, only show budgeted items or if we want to show all:
                // if (!status[t.category]) status[t.category] = { spent: 0, limit: 0, percent: 0 };
                // status[t.category].spent += t.amount;
            }
        });

        // Calculate percent
        Object.keys(status).forEach(cat => {
            if (status[cat].limit > 0) {
                status[cat].percent = (status[cat].spent / status[cat].limit) * 100;
            }
        });

        return status;
    }, [transactions, budgets]);



    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200">Budget Bulan Ini</h3>
                <button onClick={onOpenSettings} className="text-xs text-brimo-secondary font-medium hover:underline">Atur</button>
            </div>

            <div className="space-y-3">
                {Object.entries(budgetStatus).map(([category, data]) => {
                    const budgetConfig = budgets.find(b => b.category === category);
                    const emoji = budgetConfig?.icon || '💵';
                    const colorClass = budgetConfig?.color || 'bg-blue-500';

                    return (
                        <div key={category} className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center text-lg shadow-sm flex-shrink-0">
                                {emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{category}</span>
                                    <span className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                        data.percent > 100 
                                            ? "bg-red-50 text-red-500 dark:bg-red-950/20" 
                                            : "bg-gray-50 text-gray-500 dark:bg-gray-700/50"
                                    )}>
                                        {Math.round(data.percent)}%
                                    </span>
                                </div>

                                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                                    <div
                                        className={cn("h-full rounded-full transition-all", data.percent > 100 ? "bg-red-500" : colorClass)}
                                        style={{ width: `${Math.min(100, data.percent)}%` }}
                                    />
                                </div>

                                <div className="flex justify-between text-[9px] text-gray-400">
                                    <span>Terpakai: Rp {formatCurrency(data.spent)}</span>
                                    <span>Batas: Rp {formatCurrency(data.limit)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

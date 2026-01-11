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

    const getProgressColor = (percent: number) => {
        if (percent >= 100) return "bg-red-500";
        if (percent >= 90) return "bg-red-400";
        if (percent >= 75) return "bg-yellow-400";
        return "bg-blue-400";
    };

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
                {Object.entries(budgetStatus).map(([category, data]) => (
                    <div key={category} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{category}</span>
                            <span className={cn(
                                "text-[10px] font-bold",
                                data.percent > 100 ? "text-red-500" : "text-gray-500"
                            )}>
                                {Math.round(data.percent)}%
                            </span>
                        </div>

                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-1.5">
                            <div
                                className={cn("h-full rounded-full transition-all", getProgressColor(data.percent))}
                                style={{ width: `${Math.min(100, data.percent)}%` }}
                            />
                        </div>

                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Terpakai: Rp {formatCurrency(data.spent)}</span>
                            <span>Batas: Rp {formatCurrency(data.limit)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

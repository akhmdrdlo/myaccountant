import { useFinanceStore } from '../../store/useFinanceStore';
import { Target, TrendingUp, TrendingDown, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { isToday } from 'date-fns';

export const FinancialSummary = () => {
    const {
        monthlyIncome,
        monthlyExpense,
        dailySafeLimit,
        transactions,
        getSeabankBalance
    } = useFinanceStore();

    const seabankBalance = getSeabankBalance ? getSeabankBalance() : 0;

    // 1. Daily Budget Logic
    const todaySpend = transactions
        .filter(t =>
            t.type === 'expense' &&
            isToday(new Date(t.timestamp)) &&
            !['transfer / tarik tunai', 'penyesuaian saldo'].includes(t.category.toLowerCase())
        )
        .reduce((sum, t) => sum + t.amount, 0);

    const dailyRemaining = Math.max(0, dailySafeLimit - todaySpend);
    const dailyProgress = dailySafeLimit > 0 ? (todaySpend / dailySafeLimit) * 100 : 0;
    const isOverBudget = todaySpend > dailySafeLimit;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.abs(val));

    return (
        <div className="space-y-4 mb-8">
            {/* 1. Hero Card: Daily Budget (Dark Theme) */}
            <div className="bg-gradient-to-br from-white to-blue-50 dark:from-slate-900 dark:to-slate-950 rounded-3xl p-6 text-gray-800 dark:text-white shadow-xl shadow-blue-100/50 dark:shadow-none relative overflow-hidden transition-colors border border-blue-100 dark:border-slate-800">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Budget Harian Tersisa
                        </h4>
                        {isOverBudget && (
                            <span className="bg-red-500/20 text-red-300 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Over
                            </span>
                        )}
                    </div>

                    <h2 className="text-3xl font-bold mb-4">
                        Rp {formatCurrency(dailyRemaining)}
                    </h2>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                            <span>Terpakai: Rp {formatCurrency(todaySpend)}</span>
                            <span>Limit: Rp {formatCurrency(dailySafeLimit)}</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    isOverBudget ? "bg-red-500" : "bg-blue-500"
                                )}
                                style={{ width: `${Math.min(dailyProgress, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Monthly Summary Grid (Restored) */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-2 opacity-5">
                        <TrendingDown className="w-12 h-12 text-red-500" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <ArrowDown className="w-4 h-4 text-red-500" />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pengeluaran</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">Rp {formatCurrency(monthlyExpense)}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-2 opacity-5">
                        <TrendingUp className="w-12 h-12 text-green-500" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <ArrowUp className="w-4 h-4 text-green-500" />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pemasukan</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">Rp {formatCurrency(monthlyIncome)}</p>
                </div>
            </div>
        </div>
    );
};

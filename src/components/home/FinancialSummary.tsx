import { useFinanceStore } from '../../store/useFinanceStore';
import { TrendingDown, TrendingUp, AlertCircle, Target } from 'lucide-react';

export const FinancialSummary = () => {
    const {
        monthlyIncome,
        monthlyExpense,
        dailySafeLimit,
        transactions
    } = useFinanceStore();

    // Helper: Find top expense category (Radar Kebocoran) - Only checks 'Jajan/Hobi' and 'Admin Bank'
    const getTopExpenseCategory = () => {
        // LEAK_CATEGORIES = ['Jajan/Hobi', 'Admin Bank']
        const expenses = transactions.filter(t => t.type === 'expense' && (t.category === 'Jajan/Hobi' || t.category === 'Admin Bank'));
        if (expenses.length === 0) return { category: '-', amount: 0 };

        const catMap: Record<string, number> = {};
        expenses.forEach(t => {
            catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        });

        let maxCat = '';
        let maxAmount = 0;
        Object.entries(catMap).forEach(([cat, amount]) => {
            if (amount > maxAmount) {
                maxAmount = amount;
                maxCat = cat;
            }
        });

        return { category: maxCat, amount: maxAmount };
    };

    const topLeak = getTopExpenseCategory();

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.abs(val));

    return (
        <div className="grid grid-cols-1 gap-3 mb-6">
            {/* Daily Safe Limit */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                    <h4 className="text-xs text-blue-500 font-semibold mb-1 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Daily Safe Limit
                    </h4>
                    <p className="text-lg font-bold text-gray-800">Rp {formatCurrency(dailySafeLimit)}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">🛡️</span>
                </div>
            </div>

            {/* Grid for others */}
            <div className="grid grid-cols-2 gap-3">
                {/* Monthly Expense */}
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 shadow-sm">
                    <h4 className="text-[10px] text-red-500 font-semibold mb-1 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        Pengeluaran Bulan Ini
                    </h4>
                    <p className="text-sm font-bold text-gray-800">Rp {formatCurrency(monthlyExpense)}</p>
                </div>

                {/* Side Income (Using Total Income for now) */}
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 shadow-sm">
                    <h4 className="text-[10px] text-green-600 font-semibold mb-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Pemasukan
                    </h4>
                    <p className="text-sm font-bold text-gray-800">Rp {formatCurrency(monthlyIncome)}</p>
                </div>
            </div>

            {/* Radar Kebocoran */}
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between shadow-sm mt-1">
                <div>
                    <h4 className="text-xs text-orange-600 font-semibold mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Radar Kebocoran Duit
                    </h4>
                    <p className="text-base font-bold text-gray-800">{topLeak.category}</p>
                    <p className="text-xs text-gray-500">Rp {formatCurrency(topLeak.amount)}</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-xl">🚨</span>
                </div>
            </div>
        </div>
    );
};

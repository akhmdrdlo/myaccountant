import { useMemo } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';


export const SpendingProgress = () => {
    const { transactions, monthlyIncome } = useFinanceStore();

    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const currentTx = transactions.filter(t => {
            const date = new Date(t.timestamp);
            return t.type === 'expense' &&
                date.getMonth() === currentMonth &&
                date.getFullYear() === currentYear &&
                !['transfer / tarik tunai', 'penyesuaian saldo'].includes(t.category.toLowerCase());
        });

        let needs = 0;
        let wants = 0;

        currentTx.forEach(t => {
            const cat = t.category.toLowerCase();
            if (cat.includes('jajan') || cat.includes('hobi')) {
                wants += t.amount;
            } else {
                // Assume everything else is a "Need" (Makan, Transport, Kos, Utilitas, Admin)
                needs += t.amount;
            }
        });

        // 50/30/20 Rule Targets
        const needsLimit = monthlyIncome * 0.50;
        const wantsLimit = monthlyIncome * 0.30;
        const savingsTarget = monthlyIncome * 0.20;

        // Savings is what's left, or tracked transfers? 
        // For "Progress" let's show how much of the "Allocation" is used
        const needsPct = needsLimit > 0 ? (needs / needsLimit) * 100 : 0;
        const wantsPct = wantsLimit > 0 ? (wants / wantsLimit) * 100 : 0;

        // For savings, maybe show "Potential Savings" vs Target? 
        // Or just show "Savings" as (Income - Expense) / Target
        const currentSavings = Math.max(0, monthlyIncome - needs - wants);
        const savingsPct = savingsTarget > 0 ? (currentSavings / savingsTarget) * 100 : 0;

        return {
            needs, needsLimit, needsPct,
            wants, wantsLimit, wantsPct,
            savings: currentSavings, savingsTarget, savingsPct
        };
    }, [transactions, monthlyIncome]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('id-ID', { notation: "compact", maximumFractionDigits: 1 }).format(val);

    const getStatus = (pct: number) => {
        if (pct > 100) return "Boros!";
        if (pct > 80) return "Hati-hati";
        return "Masih aman";
    };

    const getSavingsStatus = (pct: number) => {
        if (pct >= 100) return "Target Tercapai!";
        if (pct >= 50) return "On Track";
        return "Perlu Genjot";
    };

    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const currentDay = new Date().getDate();
    const monthProgress = (currentDay / daysInMonth) * 100;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 relative overflow-hidden transition-colors">

            <div className="flex justify-between items-start mb-6">
                <div className="flex gap-4 items-center">
                    {/* Circular Day Progress */}
                    <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="24"
                                cy="24"
                                r="20"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="transparent"
                                className="text-gray-100 dark:text-gray-700"
                            />
                            <circle
                                cx="24"
                                cy="24"
                                r="20"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="transparent"
                                strokeDasharray={125.6}
                                strokeDashoffset={125.6 - (125.6 * monthProgress) / 100}
                                className="text-gray-800 dark:text-gray-200 transition-all duration-1000 ease-out"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-[8px] font-bold text-gray-700 dark:text-gray-300 leading-none">
                            <span>HARI</span>
                            <span className="text-sm">{currentDay}</span>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg">Progres Pengeluaran</h3>
                        <p className="text-xs text-gray-400">Hari {currentDay} dari {daysInMonth}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {/* Kebutuhan (Needs) - Purple */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">KEBUTUHAN (50%)</span>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">{getStatus(stats.needsPct)} ({Math.round(stats.needsPct)}%)</span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-purple-500 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, stats.needsPct)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                        <span>Terpakai: Rp {formatCurrency(stats.needs)}</span>
                        <span>Limit: Rp {formatCurrency(stats.needsLimit)}</span>
                    </div>
                </div>

                {/* Keinginan (Wants) - Orange */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-orange-500 uppercase tracking-wider">KEINGINAN (30%)</span>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">{getStatus(stats.wantsPct)} ({Math.round(stats.wantsPct)}%)</span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-orange-400 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, stats.wantsPct)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                        <span>Terpakai: Rp {formatCurrency(stats.wants)}</span>
                        <span>Limit: Rp {formatCurrency(stats.wantsLimit)}</span>
                    </div>
                </div>

                {/* Tabungan (Savings) - Green */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-green-500 uppercase tracking-wider">TABUNGAN (20%)</span>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">{getSavingsStatus(stats.savingsPct)}</span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, stats.savingsPct)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                        <span>Sisa Saldo: Rp {formatCurrency(stats.savings)}</span>
                        <span>Target: Rp {formatCurrency(stats.savingsTarget)}</span>
                    </div>
                </div>
            </div>

        </div>
    );
};

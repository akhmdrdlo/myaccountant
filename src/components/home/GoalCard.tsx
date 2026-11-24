import { Target, AlertTriangle, TrendingUp, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { differenceInDays, format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

interface GoalCardProps {
    title: string;
    currentAmount: number | string;
    targetAmount: number;
    color?: string;
    deadline?: string;
    onEdit?: () => void;
    safetyBuffer?: number;
}

export const GoalCard = ({ title, currentAmount, targetAmount, color = "bg-blue-500", deadline, onEdit, safetyBuffer = 0 }: GoalCardProps) => {
    // Safely parse current amount (handle string/formula)
    const safeCurrent = isNaN(Number(currentAmount)) ? 0 : Number(currentAmount);

    // 1. Basic Progress
    const percentage = Math.min(100, Math.max(0, (safeCurrent / targetAmount) * 100));

    // 2. Expert Safety Analysis
    // Logic: Real buying power = Total Saldo - Safety Buffer.
    // If Real Buying Power < Target, it's risky.
    const realBuyingPower = safeCurrent - safetyBuffer;
    // Removed unused safePercentage
    const isRisky = realBuyingPower < targetAmount;
    const canAfford = safeCurrent >= targetAmount;

    // 3. Forecasting (Nabung Harian)
    let dailySaving = 0;
    let daysLeft = 0;
    let showForecast = false;

    if (deadline && targetAmount > safeCurrent) {
        try {
            // Handle deadline string (YYYY-MM-DD or ISO)
            const today = new Date();
            // Ensure we parse the date correctly even if it's just YYYY-MM-DD
            const targetDate = new Date(deadline);

            if (!isNaN(targetDate.getTime())) {
                daysLeft = differenceInDays(targetDate, today);
                if (daysLeft > 0) {
                    const remaining = targetAmount - safeCurrent;
                    dailySaving = Math.ceil(remaining / daysLeft);
                    showForecast = true;
                }
            }
        } catch (e) {
            // Invalid date
        }
    }

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-4 transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl", isRisky && canAfford ? "bg-red-50 dark:bg-red-900/20" : "bg-blue-50 dark:bg-blue-900/20")}>
                        {isRisky && canAfford ? (
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        ) : (
                            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{title}</h4>
                        {deadline && (
                            <p className="text-xs text-gray-400">
                                Target: {(() => {
                                    try {
                                        const parsed = parseISO(deadline);
                                        if (isNaN(parsed.getTime())) {
                                            const d = new Date(deadline);
                                            if (isNaN(d.getTime())) return deadline;
                                            return format(d, 'd MMMM yyyy', { locale: id });
                                        }
                                        return format(parsed, 'd MMMM yyyy', { locale: id });
                                    } catch (e) {
                                        return deadline;
                                    }
                                })()}
                            </p>
                        )}
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <button onClick={onEdit} className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-1">
                        Edit
                    </button>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{Math.round(percentage)}%</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2 relative">
                {/* Visualizing Safety Buffer impact if affordable but risky */}
                <div
                    className={cn("h-full rounded-full transition-all duration-1000 ease-out", color)}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <div className="flex justify-between items-center text-xs mb-3">
                <span className="text-gray-500 font-medium">{formatCurrency(safeCurrent)}</span>
                <span className="text-gray-400">dari {formatCurrency(targetAmount)}</span>
            </div>

            {/* Expert Insights */}
            <div className="space-y-2">
                {/* Safety Analysis */}
                {canAfford && isRisky && (
                    <div className="bg-red-50 p-2 rounded-lg flex gap-2 items-start">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-red-700">Bahaya! Dana Menipis</p>
                            <p className="text-xs text-red-600 leading-tight">
                                Jika dibeli, sisa saldo hanya {formatCurrency(safeCurrent - targetAmount)}.
                                Di bawah safety buffer {formatCurrency(safetyBuffer)}.
                            </p>
                        </div>
                    </div>
                )}

                {canAfford && !isRisky && (
                    <div className="bg-green-50 p-2 rounded-lg flex gap-2 items-start">
                        <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-green-700">Aman Dibeli!</p>
                            <p className="text-xs text-green-600 leading-tight">
                                Sisa saldo aman di atas buffer {formatCurrency(safetyBuffer)}.
                            </p>
                        </div>
                    </div>
                )}

                {/* Forecasting */}
                {showForecast && (
                    <div className="bg-rp-surface-2 p-2 rounded-lg flex gap-2 items-start">
                        <TrendingUp className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-rp-royal">Biar tepat waktu</p>
                            <p className="text-xs text-rp-ink leading-snug">
                                {daysLeft > 45 ? (<>Sisihkan <span className="font-bold rp-num">{formatCurrency(Math.ceil(dailySaving * 30.44))}/bulan</span> selama {Math.ceil(daysLeft / 30.44)} bulan lagi.</>) : (<>Sisihkan <span className="font-bold rp-num">{formatCurrency(dailySaving)}/hari</span> selama {daysLeft} hari lagi.</>)}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

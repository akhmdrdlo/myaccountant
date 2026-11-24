import { useState, useMemo } from 'react';
import { format, parseISO, addMonths, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Transaction } from '../../types';
import { cn } from '../../lib/utils';

interface AktivitasKalenderProps {
    transactions: Transaction[];
}

export const AktivitasKalender = ({ transactions }: AktivitasKalenderProps) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Helper to get days in selected month
    const daysInMonth = useMemo(() => {
        return new Date(year, month + 1, 0).getDate();
    }, [year, month]);

    // Get starting day of the week (Monday = 0, Sunday = 6)
    const startDayOfWeek = useMemo(() => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1;
    }, [year, month]);

    // Create array of grid cells (padding + active days)
    const gridCells = useMemo(() => {
        const cells: (Date | null)[] = [];
        for (let i = 0; i < startDayOfWeek; i++) {
            cells.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            cells.push(new Date(year, month, i));
        }
        return cells;
    }, [daysInMonth, startDayOfWeek, year, month]);

    // Aggregate transactions by date string (yyyy-MM-dd)
    const dailyTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        
        transactions.forEach(t => {
            if (!t.timestamp) return;
            const dateStr = format(parseISO(t.timestamp), 'yyyy-MM-dd');
            if (t.type === 'transfer') return; // Skip internal transfers
            
            const amount = t.amount;
            if (!totals[dateStr]) totals[dateStr] = 0;
            
            if (t.type === 'income') {
                totals[dateStr] += amount;
            } else if (t.type === 'expense') {
                totals[dateStr] -= amount;
            } else if (t.type === 'adjustment') {
                // If it is a negative adjustment, treat as expense, else income
                if (t.description?.toLowerCase().includes('-') || t.category === 'Penyesuaian Saldo') {
                    totals[dateStr] -= amount;
                } else {
                    totals[dateStr] += amount;
                }
            }
        });
        
        return totals;
    }, [transactions]);

    // Format numbers with JT / RB suffixes matching the request
    const formatShortAmount = (num: number) => {
        const abs = Math.abs(num);
        if (abs === 0) return '';
        
        if (abs >= 1000000) {
            const val = abs / 1000000;
            const formatted = Number.isInteger(val) ? val.toString() : val.toFixed(1);
            return `${num < 0 ? '-' : '+'}${formatted}JT`;
        }
        if (abs >= 1000) {
            const val = abs / 1000;
            const formatted = Number.isInteger(val) ? val.toString() : val.toFixed(0);
            return `${num < 0 ? '-' : '+'}${formatted}RB`;
        }
        return `${num < 0 ? '-' : '+'}${abs}`;
    };

    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-150 dark:border-gray-700 shadow-sm transition-colors mb-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-md font-bold text-gray-800 dark:text-white">Aktivitas Bulan Ini</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider mt-1">
                        {format(currentMonth, 'MMMM yyyy', { locale: id })}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 no-print">
                    <button
                        onClick={handlePrevMonth}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 transition"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 transition"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div>
                {/* Day Labels */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['SN', 'SL', 'RB', 'KM', 'JM', 'SB', 'MG'].map(day => (
                        <span key={day} className="text-xs font-bold text-gray-400 dark:text-gray-500">
                            {day}
                        </span>
                    ))}
                </div>

                {/* Day Cells */}
                <div className="grid grid-cols-7 gap-1">
                    {gridCells.map((date, idx) => {
                        if (!date) {
                            return <div key={`empty-${idx}`} className="aspect-square bg-gray-50/30 dark:bg-gray-900/10 rounded-lg" />;
                        }

                        const dateStr = format(date, 'yyyy-MM-dd');
                        const dayNum = date.getDate();
                        const dailyNet = dailyTotals[dateStr] || 0;
                        const isToday = dateStr === todayStr;

                        const isIncome = dailyNet > 0;
                        const isExpense = dailyNet < 0;

                        return (
                            <div
                                key={dateStr}
                                className={cn(
                                    "aspect-square rounded-lg p-1 flex flex-col justify-between border relative transition-colors",
                                    isToday 
                                        ? "border-rp-navy bg-blue-50/10 dark:bg-blue-900/10" 
                                        : "border-gray-100 dark:border-gray-750 bg-gray-50/40 dark:bg-gray-900/20",
                                    isIncome && "bg-green-50/40 dark:bg-green-950/20 border-green-200 dark:border-green-900/50",
                                    isExpense && "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/50"
                                )}
                            >
                                <span className={cn(
                                    "text-[11px] font-bold",
                                    isToday ? "text-rp-navy dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                                )}>
                                    {dayNum}
                                </span>
                                {dailyNet !== 0 && (
                                    <span
                                        className={cn(
                                            "text-[7.5px] font-bold text-center block leading-none truncate",
                                            isIncome ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
                                        )}
                                    >
                                        {formatShortAmount(dailyNet)}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

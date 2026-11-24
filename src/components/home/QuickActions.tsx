import { useMemo } from 'react';
import { Utensils, Bus, ShoppingBag, Zap, Banknote, MoreHorizontal, Briefcase } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Transaction } from '../../types';

const ACTIONS = [
    { id: 'makan_weekday', label: 'Makan Weekday', icon: Utensils, categoryMatch: 'Makan Weekday', color: 'text-orange-500' },
    { id: 'makan_weekend', label: 'Makan Weekend', icon: Utensils, categoryMatch: 'Makan Weekend', color: 'text-red-500' },
    { id: 'jajan', label: 'Jajan/ Hobi', icon: ShoppingBag, categoryMatch: 'Jajan/Hobi', color: 'text-blue-500' },
    { id: 'transport', label: 'Transport', icon: Bus, categoryMatch: 'Transport', color: 'text-blue-500' },
    { id: 'utilitas', label: 'Utilitas', icon: Zap, categoryMatch: 'Utilitas', color: 'text-amber-500' },
    { id: 'tarik', label: 'Tarik / Transfer', icon: Banknote, categoryMatch: 'Transfer / Tarik Tunai', color: 'text-green-500' },
    { id: 'kos', label: 'Kos', icon: Briefcase, categoryMatch: 'Kos (Tabungan)', color: 'text-blue-500' },
    { id: 'more', label: 'Lainnya', icon: MoreHorizontal, categoryMatch: 'Lainnya', color: 'text-gray-500' },
];

interface QuickActionsProps {
    onActionClick?: (id: string) => void;
    transactions?: Transaction[];
}

export const QuickActions = ({ onActionClick, transactions = [] }: QuickActionsProps) => {

    const topActions = useMemo(() => {
        if (transactions.length === 0) return ACTIONS.slice(0, 4);

        // Count frequency by category
        const counts: Record<string, number> = {};
        transactions.forEach(t => {
            if (counts[t.category]) counts[t.category]++;
            else counts[t.category] = 1;
        });

        // Sort ACTIONS based on counts match
        const sorted = [...ACTIONS].sort((a, b) => {
            const countA = counts[a.categoryMatch] || 0;
            const countB = counts[b.categoryMatch] || 0;
            // Always keep 'Lainnya' last if needed, or sort purely by usage
            if (a.id === 'more') return 1;
            if (b.id === 'more') return -1;
            return countB - countA;
        });

        return sorted.slice(0, 4);
    }, [transactions]);

    return (
        <div className="grid grid-cols-4 gap-y-6 gap-x-2 mb-8">
            {topActions.map((action) => {
                const Icon = action.icon;
                return (
                    <button
                        key={action.id}
                        onClick={() => onActionClick?.(action.id)}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div
                            className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center shadow-sm shadow-gray-200 dark:shadow-none transition-transform group-hover:scale-105 active:scale-95 border border-white dark:border-gray-700 bg-white dark:bg-gray-800"
                            )}
                        >
                            <Icon className={cn("w-6 h-6", action.color)} strokeWidth={1.5} />
                        </div>
                        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 text-center leading-tight">
                            {action.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

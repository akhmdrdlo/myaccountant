import { Utensils, Bus, ShoppingBag, Zap, Banknote, MoreHorizontal, Briefcase } from 'lucide-react';
import { cn } from '../../lib/utils';

const ACTIONS = [
    { id: 'makan_weekday', label: 'Makan Weekday', icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'makan_weekend', label: 'Makan Weekend', icon: Utensils, color: 'text-red-500', bg: 'bg-red-50' },
    { id: 'jajan', label: 'Jajan/ Hobi', icon: ShoppingBag, color: 'text-pink-500', bg: 'bg-pink-50' },
    { id: 'transport', label: 'Transport', icon: Bus, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'utilitas', label: 'Utilitas', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { id: 'tarik', label: 'Tarik / Transfer', icon: Banknote, color: 'text-green-500', bg: 'bg-green-50' },
    { id: 'kos', label: 'Kos', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'more', label: 'Lainnya', icon: MoreHorizontal, color: 'text-gray-500', bg: 'bg-gray-100' },
];

interface QuickActionsProps {
    onActionClick?: (id: string) => void;
}

export const QuickActions = ({ onActionClick }: QuickActionsProps) => {
    return (
        <div className="grid grid-cols-4 gap-y-6 gap-x-2 mb-8">
            {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                    <button
                        key={action.id}
                        onClick={() => onActionClick?.(action.id)}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div
                            className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center shadow-sm shadow-gray-200 transition-transform group-hover:scale-105 active:scale-95 border border-white",
                                // action.bg // Using subtle backgrounds specific to category
                                "bg-white" // BRImo usually has white icons within container or white circles. 
                                // Let's stick to standard BRImo style: White circle with colored icon.
                            )}
                        >
                            <Icon className={cn("w-6 h-6", action.color)} strokeWidth={1.5} />
                        </div>
                        <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">
                            {action.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

import { useState, useEffect } from 'react';
import { X, Save, Settings2 } from 'lucide-react';
import type { Budget } from '../../types';

interface BudgetSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    budgets: Budget[];
    categories: string[];
    onSave: (budgets: Budget[]) => void;
}

export const BudgetSettings = ({ isOpen, onClose, budgets, categories, onSave }: BudgetSettingsProps) => {
    const [localBudgets, setLocalBudgets] = useState<Budget[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Initialize with existing budgets, or 0/default for other categories
            const initialMap = new Map(budgets.map(b => [b.category, b.limit]));

            // Ensure Dana Darurat is in the list
            const extendedCategories = Array.from(new Set(['Dana Darurat (Safety Buffer)', ...categories]));

            const merged: Budget[] = extendedCategories.map(cat => ({
                category: cat,
                limit: initialMap.get(cat) || 0
            }));
            setLocalBudgets(merged);
        }
    }, [isOpen, budgets, categories]);

    if (!isOpen) return null;

    const handleChange = (category: string, value: string) => {
        const numValue = parseInt(value) || 0;
        setLocalBudgets(prev => prev.map(b =>
            b.category === category ? { ...b, limit: numValue } : b
        ));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        // Filter out 0 limits to save space? Or keep them? Let's keep them explicit or filter.
        // Filtering might mean "no budget set".
        const toSave = localBudgets.filter(b => b.limit > 0);
        onSave(toSave);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 transition-all duration-300">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 flex flex-col max-h-[85vh] border border-transparent dark:border-gray-800">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <Settings2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                            Atur Budget Bulanan
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {localBudgets.map((budget) => (
                            <div key={budget.category} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    {budget.category}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">Rp</span>
                                    <input
                                        type="number"
                                        value={budget.limit || ''}
                                        onChange={(e) => handleChange(budget.category, e.target.value)}
                                        placeholder="0"
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 mt-2 border-t border-gray-100 flex-shrink-0">
                        <button
                            type="submit"
                            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <Save className="w-5 h-5" />
                            Simpan Budget
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

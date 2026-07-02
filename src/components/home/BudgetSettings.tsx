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

    const COLOR_OPTIONS = [
        { name: 'Biru', value: 'bg-blue-500' },
        { name: 'Merah', value: 'bg-red-500' },
        { name: 'Kuning', value: 'bg-yellow-400' },
        { name: 'Hijau', value: 'bg-green-500' },
        { name: 'Ungu', value: 'bg-purple-500' },
        { name: 'Pink', value: 'bg-pink-500' },
        { name: 'Oranye', value: 'bg-orange-500' },
        { name: 'Indigo', value: 'bg-indigo-500' }
    ];

    const EMOJI_OPTIONS = [
        { emoji: '🍔', label: 'Makan' },
        { emoji: '🚌', label: 'Transport' },
        { emoji: '🛍️', label: 'Belanja' },
        { emoji: '💡', label: 'Utilitas' },
        { emoji: '🌐', label: 'Internet' },
        { emoji: '👩', label: 'Keluarga' },
        { emoji: '📱', label: 'Pulsa' },
        { emoji: '🏠', label: 'Kost/Rumah' },
        { emoji: '😭', label: 'Tak Terduga' },
        { emoji: '🎮', label: 'Hiburan' },
        { emoji: '💵', label: 'Lainnya' }
    ];

    useEffect(() => {
        if (isOpen) {
            // Ensure Dana Darurat is in the list
            const extendedCategories = Array.from(new Set(['Dana Darurat (Safety Buffer)', ...categories]));

            const merged: Budget[] = extendedCategories.map(cat => {
                const existing = budgets.find(b => b.category === cat);
                return {
                    category: cat,
                    limit: existing ? existing.limit : 0,
                    color: existing?.color || 'bg-blue-500',
                    icon: existing?.icon || '💵'
                };
            });
            setLocalBudgets(merged);
        }
    }, [isOpen, budgets, categories]);

    if (!isOpen) return null;

    const handleChange = (category: string, field: keyof Budget, value: any) => {
        setLocalBudgets(prev => prev.map(b =>
            b.category === category ? { ...b, [field]: value } : b
        ));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
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
                    <div className="flex-1 overflow-y-auto pr-2 space-y-5">
                        {localBudgets.map((budget) => (
                            <div key={budget.category} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                    {budget.category}
                                </label>
                                
                                {/* Limit Input */}
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">Rp</span>
                                    <input
                                        type="number"
                                        value={budget.limit || ''}
                                        onChange={(e) => handleChange(budget.category, 'limit', parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                    />
                                </div>

                                {/* Color Picker & Emoji Picker */}
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Ikon / Emoji</span>
                                        <select
                                            value={budget.icon || '💵'}
                                            onChange={(e) => handleChange(budget.category, 'icon', e.target.value)}
                                            className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:outline-none text-gray-800 dark:text-white"
                                        >
                                            {EMOJI_OPTIONS.map(opt => (
                                                <option key={opt.emoji} value={opt.emoji} className="text-gray-800 bg-white">{opt.emoji} {opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Tema Warna</span>
                                        <select
                                            value={budget.color || 'bg-blue-500'}
                                            onChange={(e) => handleChange(budget.category, 'color', e.target.value)}
                                            className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:outline-none text-gray-800 dark:text-white"
                                        >
                                            {COLOR_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value} className="text-gray-800 bg-white">{opt.name}</option>
                                            ))}
                                        </select>
                                    </div>
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

import { useState } from 'react';
import { CreditCard, Plus, Trash2, X } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useSupabase } from '../../hooks/useSupabase';
import type { Subscription } from '../../types';

export const SubscriptionTracker = () => {
    // 1. Get Data from Store
    const { subscriptions, setSubscriptions } = useFinanceStore();
    const { addSubscription, deleteSubscription } = useSupabase();

    // UI State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Form State
    const [newName, setNewName] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newDate, setNewDate] = useState('');
    const [newCategory, setNewCategory] = useState('Hiburan');

    // ...

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newAmount || !newDate) return;

        const newSub: Subscription = {
            id: crypto.randomUUID(),
            name: newName,
            amount: Number(newAmount),
            billingDate: Number(newDate),
            category: newCategory // Use state
        };

        // Optimistic Update
        setSubscriptions([...subscriptions, newSub]);

        // API Call
        await addSubscription(newSub);

        setNewName('');
        setNewAmount('');
        setNewDate('');
        setNewCategory('Hiburan'); // Reset to default
    };

    // ...

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mt-6 transition-colors">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-700 dark:text-gray-100 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Tagihan Rutin
                </h3>
                <button
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                    {isSettingsOpen ? <X size={20} /> : <Plus size={20} />}
                </button>
            </div>

            {isSettingsOpen && (
                <form onSubmit={handleAdd} className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100 animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Tambah Baru</p>
                    <div className="space-y-3">
                        <input
                            placeholder="Nama (e.g. Netflix, Spotify)"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Harga (Rp)"
                                value={newAmount}
                                onChange={e => setNewAmount(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                            />
                            <input
                                type="number"
                                placeholder="Tgl"
                                title="Tanggal Tagihan (1-31)"
                                value={newDate}
                                onChange={e => setNewDate(e.target.value)}
                                className="w-20 px-3 py-2 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                            />
                        </div>
                        <select
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                        >
                            <option value="Hiburan">Hiburan</option>
                            <option value="Produktivitas">Produktivitas</option>
                            <option value="Rumah Tangga">Rumah Tangga</option>
                            <option value="Internet">Internet</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                        <button type="submit" className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition">
                            <Plus className="w-4 h-4" /> Tambah
                        </button>
                    </div>
                </form>
            )}

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {(subscriptions || []).map(sub => (
                    <div key={sub.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex flex-col items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm text-purple-600 dark:text-purple-400">
                                <span className="text-[9px] text-gray-400 font-bold uppercase">Tgl</span>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{sub.billingDate}</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{sub.name}</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(sub.amount)}</p>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{sub.category}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => deleteSubscription(sub.id)}
                            className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {(subscriptions || []).length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
                        <p className="text-gray-400 text-xs">Belum ada langganan tersimpan.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

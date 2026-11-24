import { useState, useEffect } from 'react';
import { X, Save, Target } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Goal } from '../../types';

interface GoalFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Goal;
    onSubmit: (goal: Goal) => void;
    onDelete?: (id: string) => void; // New prop
    defaultAmount?: number;
    /** Nama akun yang bisa ditautkan; saldo akun itu menjadi jumlah terkumpul. */
    accounts?: string[];
}

export const GoalForm = ({ isOpen, onClose, initialData, onSubmit, onDelete, defaultAmount = 0, accounts = [] }: GoalFormProps) => {
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [currentAmount, setCurrentAmount] = useState('');
    const [deadline, setDeadline] = useState('');
    const [color, setColor] = useState('bg-blue-500');
    const [linkedAccount, setLinkedAccount] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setTargetAmount(initialData.targetAmount.toString());
                setCurrentAmount(initialData.currentAmount.toString());
                setDeadline(initialData.deadline || '');
                setColor(initialData.color || 'bg-blue-500');
                setLinkedAccount(initialData.linkedAccount || '');
            } else {
                setName('');
                setTargetAmount('');
                setCurrentAmount(defaultAmount.toString()); // Use default amount if no initial data
                setDeadline('');
                setColor('bg-blue-500');
                setLinkedAccount('');
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            id: initialData?.id || crypto.randomUUID(),
            name,
            targetAmount: Number(targetAmount) || 0,
            currentAmount: Number(String(currentAmount).replace(/[^0-9]/g, '')) || 0,
            deadline,
            color,
            linkedAccount: linkedAccount || undefined,
        });
        onClose();
    };

    const colors = [
        { name: 'Biru', value: 'bg-blue-500' },
        { name: 'Merah', value: 'bg-red-500' },
        { name: 'Kuning', value: 'bg-amber-400' },
        { name: 'Hijau', value: 'bg-green-500' },
        { name: 'Ungu', value: 'bg-blue-500' },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4 transition-all duration-300">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 border border-transparent dark:border-gray-800">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                            {initialData ? 'Edit Barang Harapan' : 'Tambah Barang Harapan'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Impian</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Laptop Baru"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target (Rp)</label>
                            <input
                                type="number"
                                required
                                value={targetAmount}
                                onChange={(e) => setTargetAmount(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Terkumpul (Rp)</label>
                            <input
                                type="number"
                                inputMode="numeric"
                                disabled={!!linkedAccount}
                                value={linkedAccount ? '' : currentAmount}
                                onChange={(e) => setCurrentAmount(e.target.value)}
                                placeholder={linkedAccount ? 'Ikut saldo akun' : '0'}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tautkan ke akun tabungan (opsional)</label>
                        <select
                            value={linkedAccount}
                            onChange={(e) => setLinkedAccount(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            <option value="">Tidak, isi manual</option>
                            {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">Kalau ditautkan, jumlah terkumpul otomatis = saldo akun itu.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Waktu (Opsional)</label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Warna Progress</label>
                        <div className="flex gap-3">
                            {colors.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setColor(c.value)}
                                    className={cn(
                                        "w-8 h-8 rounded-full border-2 transition-all",
                                        c.value,
                                        color === c.value ? "border-gray-800 dark:border-white scale-110" : "border-transparent"
                                    )}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-rp-2 flex items-center justify-center gap-2 transition-all active:scale-95 mt-4"
                    >
                        <Save className="w-5 h-5" />
                        Simpan Barang
                    </button>

                    {initialData && onDelete && (
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm('Yakin ingin menghapus impian ini?')) {
                                    onDelete(initialData.id);
                                    onClose();
                                }
                            }}
                            className="w-full py-3.5 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            Hapus Barang Harapan
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

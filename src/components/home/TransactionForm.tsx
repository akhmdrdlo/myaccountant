import { useState, useEffect } from 'react';
import { X, Check, Wallet } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TransactionInput } from '../../types';

interface TransactionFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Partial<TransactionInput>;
    onSubmit: (data: TransactionInput) => Promise<boolean>;
    loading?: boolean;
}

const EXPENSE_CATEGORIES = [
    'Makan Weekday', 'Makan Weekend', 'Transport', 'Utilitas', 'Kos (Tabungan)', 'Jajan/Hobi', 'Admin Bank', 'Transfer / Tarik Tunai'
];

const INCOME_CATEGORIES = [
    'Gaji', 'Freelance Project', 'Bunga Bank', 'Refund/Cashback'
];

const ACCOUNTS = [
    'Bank BTN (Gaji)', 'Bank BRI (Freelance + Endapan)', 'Seabank (Simpanan)', 'Cash'
];

export const TransactionForm = ({ isOpen, onClose, initialData, onSubmit, loading }: TransactionFormProps) => {
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [account, setAccount] = useState('Cash');

    // Reset/Prefill form when opened
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setType(initialData.type || 'expense');
                setCategory(initialData.category || '');
                setAmount(initialData.amount ? initialData.amount.toString() : '');
                setDescription(initialData.description || '');
                setAccount(initialData.account || 'Cash');
            } else {
                // Default reset
                setAmount('');
                setCategory('');
                setDescription('');
                setAccount('Cash');
                setType('expense');
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !category) return;

        const numAmount = parseFloat(amount.replace(/[^0-9]/g, ''));

        const success = await onSubmit({
            type,
            amount: numAmount,
            category,
            description,
            account
        });

        if (success) {
            onClose();
            setAmount('');
            setDescription('');
            setCategory('');
        }
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Bottom Sheet */}
            <div
                className={cn(
                    "fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-[70] shadow-2xl transition-transform duration-300 ease-out transform max-w-md mx-auto h-[90vh] overflow-y-auto",
                    isOpen ? "translate-y-0" : "translate-y-full"
                )}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800">Catat Transaksi</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 pb-10">
                    {/* Type Switcher */}
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={cn(
                                "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all",
                                type === 'expense' ? "bg-white text-red-500 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Pengeluaran
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={cn(
                                "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all",
                                type === 'income' ? "bg-white text-green-500 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Pemasukan
                        </button>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nominal</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">Rp</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brimo-primary/20 focus:border-brimo-primary font-bold text-2xl text-gray-800"
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Account Selector */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">Sumber Dana / Akun</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {ACCOUNTS.map(acc => (
                                <button
                                    key={acc}
                                    type="button"
                                    onClick={() => setAccount(acc)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl border flex items-center gap-2 whitespace-nowrap transition-all",
                                        account === acc
                                            ? "bg-blue-50 border-brimo-primary text-brimo-primary shadow-sm"
                                            : "bg-white border-gray-200 text-gray-600"
                                    )}
                                >
                                    <Wallet className="w-3.5 h-3.5" />
                                    <span className="text-xs font-medium">{acc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category Grid */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">Kategori</label>
                        <div className="flex flex-wrap gap-2">
                            {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCategory(cat)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs rounded-full border transition-all",
                                        category === cat
                                            ? "bg-blue-50 border-brimo-primary text-brimo-primary font-medium"
                                            : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Catatan (Opsional)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Makan siang..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brimo-primary/20 focus:border-brimo-primary text-sm"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brimo-primary hover:bg-blue-800 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? "Menyimpan..." : (
                            <>
                                <Check className="w-5 h-5" />
                                Simpan Transaksi
                            </>
                        )}
                    </button>
                </form>
            </div>
        </>
    );
};

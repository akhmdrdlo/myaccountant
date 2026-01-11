import { useState, useEffect } from 'react';
import { X, Check, Wallet, ArrowRightLeft, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TransactionInput } from '../../types';

interface TransactionFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Partial<TransactionInput>;
    onSubmit: (data: TransactionInput) => Promise<boolean>;
    loading?: boolean;
    accounts?: { name: string; balance: number }[];
}

const EXPENSE_CATEGORIES = [
    'Makan Weekday', 'Makan Weekend', 'Transport', 'Utilitas', 'Kos (Tabungan)', 'Jajan/Hobi', 'Admin Bank', 'Penyesuaian Saldo'
];

const INCOME_CATEGORIES = [
    'Gaji', 'Freelance Project', 'Bunga Bank', 'Refund/Cashback'
];

const ACCOUNTS = [
    'Bank BTN (Gaji)', 'Bank BRI (Freelance + Endapan)', 'Seabank (Simpanan)', 'Cash'
];

// Smart Category Mapping
const KEYWORD_MAP: Record<string, string> = {
    'makan': 'Makan Weekday',
    'nasi': 'Makan Weekday',
    'warteg': 'Makan Weekday',
    'kfc': 'Makan Weekend',
    'mcd': 'Makan Weekend',
    'bakso': 'Makan Weekday',
    'soto': 'Makan Weekday',
    'gojek': 'Transport',
    'grab': 'Transport',
    'bensin': 'Transport',
    'parkir': 'Transport',
    'tol': 'Transport',
    'listrik': 'Utilitas',
    'air': 'Utilitas',
    'wifi': 'Utilitas',
    'pulsa': 'Utilitas',
    'kopi': 'Jajan/Hobi',
    'snack': 'Jajan/Hobi',
    'admin': 'Admin Bank',
    'transfer': 'Admin Bank', // Potentially admin fee
};

export const TransactionForm = ({ isOpen, onClose, initialData, onSubmit, loading, accounts = [] }: TransactionFormProps) => {
    const [type, setType] = useState<'income' | 'expense' | 'transfer' | 'adjustment'>('expense');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [account, setAccount] = useState('Cash');
    const [toAccount, setToAccount] = useState('Bank BTN (Gaji)'); // For Transfer

    // Reset/Prefill form when opened
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setType(initialData.type || 'expense');
                setCategory(initialData.category || '');
                setAmount(initialData.amount ? initialData.amount.toString() : '');
                setDescription(initialData.description || '');
                setAccount(initialData.account || 'Cash');
                if (initialData.toAccount) setToAccount(initialData.toAccount);
            } else {
                // Default reset
                setAccount('Cash');
                setType('expense');
                setAmount('');
                setCategory('');
                setDescription('');
            }
        }
    }, [isOpen, initialData]);

    // Smart Category Logic
    useEffect(() => {
        if (!isOpen || type !== 'expense' || category !== '') return; // Only verify if category is empty or user hasn't manually set it? 
        // Better: Only auto-set if the user is typing and found a match, but let's just do simple match

        const lowerDesc = description.toLowerCase();
        for (const [key, cat] of Object.entries(KEYWORD_MAP)) {
            if (lowerDesc.includes(key)) {
                setCategory(cat);
                break;
            }
        }
    }, [description, type, isOpen, category]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return;
        if (type !== 'transfer' && type !== 'adjustment' && !category) return;

        let numAmount = parseFloat(amount.replace(/[^0-9]/g, ''));
        let finalType = type;
        let finalCategory = category;
        let finalDescription = description;

        // Smart Adjustment Logic
        if (type === 'adjustment') {
            const currentAccountData = accounts.find(a => a.name === account);
            const currentBalance = currentAccountData?.balance || 0;
            const targetBalance = numAmount; // User inputs the ACTUAL balance they have

            const diff = targetBalance - currentBalance;

            if (diff === 0) {
                onClose(); // No change needed
                return;
            }

            if (diff > 0) {
                // Balance increased (Income)
                finalType = 'income';
                numAmount = diff;
                finalCategory = 'Penyesuaian Saldo';
                finalDescription = description || `Koreksi Saldo (+${new Intl.NumberFormat('id-ID').format(diff)})`;
            } else {
                // Balance decreased (Expense)
                finalType = 'expense';
                numAmount = Math.abs(diff); // Amount must be positive
                finalCategory = 'Penyesuaian Saldo';
                finalDescription = description || `Koreksi Saldo (-${new Intl.NumberFormat('id-ID').format(Math.abs(diff))})`;
            }
        } else if (type === 'transfer') {
            finalCategory = 'Transfer';
            finalDescription = description || `Transfer to ${toAccount}`;
        }

        const success = await onSubmit({
            type: finalType as any, // 'adjustment' is handled above and converted
            amount: numAmount,
            category: finalCategory,
            description: finalDescription,
            account,
            toAccount: type === 'transfer' ? toAccount : undefined
        });

        if (success) {
            onClose();
            setAmount('');
            setDescription('');
            setCategory('');
            setType('expense'); // Reset to default
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
                    "fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl p-6 z-[70] shadow-2xl transition-transform duration-300 ease-out transform max-w-md mx-auto h-[90vh] overflow-y-auto border-t border-gray-100 dark:border-gray-800",
                    isOpen ? "translate-y-0" : "translate-y-full"
                )}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                        {type === 'adjustment' ? 'Penyesuaian Saldo' : 'Catat Transaksi'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 pb-10">
                    {/* Type Navigation */}
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'expense', label: 'Pengeluaran', color: 'text-red-500' },
                            { id: 'income', label: 'Pemasukan', color: 'text-green-500' },
                            { id: 'transfer', label: 'Transfer', color: 'text-blue-500', icon: ArrowRightLeft },
                            { id: 'adjustment', label: 'Atur Saldo', color: 'text-purple-500', icon: Settings }
                        ].map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setType(t.id as any)}
                                className={cn(
                                    "flex-1 min-w-[90px] py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                                    type === t.id
                                        ? `bg-white dark:bg-gray-700 ${t.color} shadow-sm`
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                )}
                            >
                                {t.icon && <t.icon className="w-3.5 h-3.5" />}
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            {type === 'adjustment' ? 'Saldo Sebenarnya Saat Ini' : 'Nominal'}
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">Rp</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                                placeholder="0"
                                className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brimo-primary/20 focus:border-brimo-primary font-bold text-2xl text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Source Account Selector */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                            {type === 'income' ? 'Masuk ke Akun' : type === 'adjustment' ? 'Akun yang Disesuaikan' : 'Sumber Dana'}
                        </label>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {ACCOUNTS.map(acc => (
                                <button
                                    key={acc}
                                    type="button"
                                    onClick={() => setAccount(acc)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl border flex items-center gap-2 whitespace-nowrap transition-all",
                                        account === acc
                                            ? "bg-blue-50 border-brimo-primary text-brimo-primary shadow-sm dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300"
                                            : "bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                    )}
                                >
                                    <Wallet className="w-3.5 h-3.5" />
                                    <span className="text-xs font-medium">{acc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Destination Account Selector (Transfer Only) */}
                    {type === 'transfer' && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">
                                Tujuan Transfer
                            </label>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {ACCOUNTS.filter(a => a !== account).map(acc => (
                                    <button
                                        key={acc}
                                        type="button"
                                        onClick={() => setToAccount(acc)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl border flex items-center gap-2 whitespace-nowrap transition-all",
                                            toAccount === acc
                                                ? "bg-blue-50 border-brimo-primary text-brimo-primary shadow-sm dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300"
                                                : "bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                        )}
                                    >
                                        <Wallet className="w-3.5 h-3.5" />
                                        <span className="text-xs font-medium">{acc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Category Grid (Only for Income/Expense) */}
                    {(type === 'expense' || type === 'income') && (
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
                                                ? "bg-blue-50 border-brimo-primary text-brimo-primary font-medium dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300"
                                                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600"
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Catatan (Opsional)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                            placeholder={type === 'transfer' ? 'Berita transfer...' : type === 'adjustment' ? 'Keterangan koreksi...' : 'Makan siang...'}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brimo-primary/20 focus:border-brimo-primary text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
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
                                {type === 'transfer' ? 'Kirim Uang' : type === 'adjustment' ? 'Update Saldo' : 'Simpan Transaksi'}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </>
    );
};

import { useState, useEffect } from 'react';
import { X, Check, ArrowRightLeft, Settings, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { AI_ENABLED, AiError, aiReadReceipt } from '../../lib/ai';
import { cn } from '../../lib/utils';
import type { TransactionInput } from '../../types';
import { useFinanceStore } from '../../store/useFinanceStore';
import { institutionForAccount } from '../../lib/institutions';
import { findRule } from '../../lib/merchantRules';
import { TagInput } from '../common/TagInput';
import { InstitutionLogo } from '../common/InstitutionLogo';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../lib/categories';

interface TransactionFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Partial<TransactionInput>;
    onSubmit: (data: TransactionInput) => Promise<boolean>;
    loading?: boolean;
    accounts?: { name: string; balance: number }[];
}

// Smart Category Mapping (Default Fallbacks)
const KEYWORD_MAP: Record<string, string> = {
    'makan': 'Makan Weekday',
    'nasi': 'Makan Weekday',
    'warteg': 'Makan Weekday',
    'kfc': 'Makan Weekday',
    'mcd': 'Makan Weekday',
    'bakso': 'Makan Weekday',
    'soto': 'Makan Weekday',
    'kopi': 'Makan Weekday',
    'gojek': 'Transport',
    'goride': 'Transport',
    'grab': 'Transport',
    'bensin': 'Transport',
    'parkir': 'Transport',
    'tol': 'Transport',
    'listrik': 'Utilitas',
    'token': 'Utilitas',
    'air': 'Utilitas',
    'wifi': 'Utilitas',
    'pulsa': 'Utilitas',
    'snack': 'Jajan/Hobi',
    'indomaret': 'Jajan/Hobi',
    'alfamart': 'Jajan/Hobi',
    'kos': 'Kos (Tabungan)',
};

export const TransactionForm = ({ isOpen, onClose, initialData, onSubmit, loading, accounts = [] }: TransactionFormProps) => {
    const storeAccounts = useFinanceStore(state => state.accounts);
    const storeExpenseCategories = useFinanceStore(state => state.expenseCategories);
    const storeIncomeCategories = useFinanceStore(state => state.incomeCategories);
    const merchantRules = useFinanceStore(state => state.merchantRules);

    const activeAccounts = storeAccounts && storeAccounts.length > 0
        ? storeAccounts.map(a => a.name)
        : ['Kantong Utama'];

    // Kategori aplikasi (sama dengan budget) didahulukan; kategori kustom pengguna ikut di belakang.
    const activeExpenseCategories = [...new Set([...EXPENSE_CATEGORIES, ...(storeExpenseCategories ?? []).filter(c => !/^(Makanan & Minuman|Transportasi|Belanja|Hiburan|Tagihan)$/.test(c))])];
    const activeIncomeCategories = [...new Set([...INCOME_CATEGORIES, ...(storeIncomeCategories ?? [])])];

    const [type, setType] = useState<'income' | 'expense' | 'transfer' | 'adjustment'>('expense');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [account, setAccount] = useState('');
    const [toAccount, setToAccount] = useState(''); // For Transfer

    // Reset/Prefill form when opened
    useEffect(() => {
        if (isOpen) {
            const defaultAcc = storeAccounts.find(a => institutionForAccount(a).kind === 'cash')?.name ?? activeAccounts[0] ?? '';
            if (initialData) {
                setType(initialData.type || 'expense');
                setCategory(initialData.category || '');
                setAmount(initialData.amount ? initialData.amount.toString() : '');
                setDescription(initialData.description || '');
                setTags(initialData.tags ?? []);
                setAccount(initialData.account || defaultAcc);
                setToAccount(initialData.toAccount || activeAccounts.find(a => a !== (initialData.account || defaultAcc)) || '');
            } else {
                setAccount(defaultAcc);
                setToAccount(activeAccounts.find(a => a !== defaultAcc) || '');
                setType('expense');
                setAmount('');
                setCategory('');
                setDescription('');
                setTags([]);
            }
        }
    }, [isOpen, initialData]);

    // Pindai struk dengan Claude Haiku (vision)
    const [scanning, setScanning] = useState(false);
    const handleScanReceipt = async (file: File) => {
        setScanning(true);
        try {
            const receipt = await aiReadReceipt(file);
            if (!receipt) {
                toast.error('Struk tidak terbaca. Coba foto lebih dekat dan terang.');
                return;
            }
            setType('expense');
            setAmount(String(receipt.total));
            setCategory(receipt.category);
            setDescription(receipt.merchant);
            toast.success(`Terbaca ${receipt.merchant || 'struk'}: Rp${receipt.total.toLocaleString('id-ID')}. Cek lalu simpan.`);
        } catch (err) {
            toast.error(err instanceof AiError ? err.message : 'Gagal membaca struk.');
        } finally {
            setScanning(false);
        }
    };

    // Smart Category Logic
    useEffect(() => {
        if (!isOpen || type !== 'expense' || category !== '') return; // Only verify if category is empty or user hasn't manually set it? 
        // Better: Only auto-set if the user is typing and found a match, but let's just do simple match

        // 1) Kategori yang pernah kamu pilih untuk merchant ini
        const learned = findRule(merchantRules, description);
        if (learned) {
            setCategory(learned.category);
            return;
        }
        // 2) Tebakan kata kunci bawaan
        const lowerDesc = description.toLowerCase();
        for (const [key, cat] of Object.entries(KEYWORD_MAP)) {
            if (lowerDesc.includes(key)) {
                setCategory(cat);
                break;
            }
        }
    }, [description, type, isOpen, category, merchantRules]);

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
            toAccount: type === 'transfer' ? toAccount : undefined,
            tags: type === 'expense' || type === 'income' ? tags : undefined,
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
                    <div className="flex items-center gap-2">
                        {AI_ENABLED && <label
                            className={cn(
                                "h-11 px-3 flex items-center gap-1.5 rounded-xl bg-rp-surface-2 text-rp-royal text-sm font-semibold cursor-pointer",
                                scanning && "opacity-60 pointer-events-none"
                            )}
                        >
                            <Camera className="w-4 h-4" />
                            {scanning ? 'Membaca…' : 'Pindai struk'}
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="sr-only"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = '';
                                    if (file) handleScanReceipt(file);
                                }}
                            />
                        </label>}
                        <button
                            onClick={onClose}
                            aria-label="Tutup"
                            className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 pb-10">
                    {/* Type Navigation */}
                    <div className="grid grid-cols-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        {[
                            { id: 'expense', label: 'Keluar', color: 'text-red-600 dark:text-red-400' },
                            { id: 'income', label: 'Masuk', color: 'text-green-600 dark:text-green-400' },
                            { id: 'transfer', label: 'Transfer', color: 'text-blue-600 dark:text-blue-400', icon: ArrowRightLeft },
                            { id: 'adjustment', label: 'Koreksi', color: 'text-blue-600 dark:text-blue-400', icon: Settings }
                        ].map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setType(t.id as any)}
                                className={cn(
                                    "min-h-[44px] px-1 text-[13px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
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
                                className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rp-navy/20 focus:border-rp-navy font-bold text-2xl text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
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
                            {activeAccounts.map(acc => (
                                <button
                                    key={acc}
                                    type="button"
                                    onClick={() => setAccount(acc)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl border flex items-center gap-2 whitespace-nowrap transition-all",
                                        account === acc
                                            ? "bg-blue-50 border-rp-navy text-rp-navy shadow-sm dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300"
                                            : "bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                    )}
                                >
                                    <InstitutionLogo institution={institutionForAccount(storeAccounts.find(a => a.name === acc) ?? { name: acc })} size="sm" className="!w-6 !h-6 !rounded-md !text-[8px]" />
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
                                {activeAccounts.filter(a => a !== account).map(acc => (
                                    <button
                                        key={acc}
                                        type="button"
                                        onClick={() => setToAccount(acc)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl border flex items-center gap-2 whitespace-nowrap transition-all",
                                            toAccount === acc
                                                ? "bg-blue-50 border-rp-navy text-rp-navy shadow-sm dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300"
                                                : "bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                        )}
                                    >
                                        <InstitutionLogo institution={institutionForAccount(storeAccounts.find(a => a.name === acc) ?? { name: acc })} size="sm" className="!w-6 !h-6 !rounded-md !text-[8px]" />
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
                                {(type === 'expense' ? activeExpenseCategories : activeIncomeCategories).map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setCategory(cat)}
                                        className={cn(
                                            "px-3 py-1.5 text-xs rounded-full border transition-all",
                                            category === cat
                                                ? "bg-blue-50 border-rp-navy text-rp-navy font-medium dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300"
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
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rp-navy/20 focus:border-rp-navy text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        />
                    </div>

                    {(type === 'expense' || type === 'income') && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Tag (opsional)</label>
                            <TagInput value={tags} onChange={setTags} />
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-rp-action hover:bg-rp-action-press text-white font-semibold py-3.5 rounded-xl shadow-rp-2 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
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

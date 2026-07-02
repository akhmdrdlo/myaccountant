import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Wallet, Plus, CreditCard, Landmark, Banknote, X, Trash2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { localDb } from '../../services/localDb';

interface DompetViewProps {
    onBack: () => void;
    onOpenTransactionForm?: () => void;
}

const PRESET_GRADIENTS = [
    { label: 'Blue-Yellow', value: 'from-blue-600 to-yellow-500' },
    { label: 'Blue-Orange', value: 'from-blue-700 to-orange-500' },
    { label: 'Orange-Red', value: 'from-orange-500 to-red-500' },
    { label: 'Purple-Indigo', value: 'from-purple-600 to-indigo-600' },
    { label: 'Emerald-Teal', value: 'from-emerald-500 to-teal-600' },
    { label: 'Rose-Red', value: 'from-rose-500 to-red-600' },
    { label: 'Slate-Dark', value: 'from-slate-700 to-slate-900' },
];

const PRESET_EMOJIS = ['💵', '💳', '🏦', '📱', '💰', '💼', '🛒', '🏡', '🚗', '🌟'];

export const DompetView = ({ onBack }: DompetViewProps) => {
    const { getAccountBalances, accounts: rawAccounts, setMetadata } = useFinanceStore();
    const accounts = getAccountBalances();

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [targetAccountName, setTargetAccountName] = useState('');
    
    // Form States
    const [name, setName] = useState('');
    const [initialBalance, setInitialBalance] = useState<number>(0);
    const [color, setColor] = useState('from-blue-600 to-yellow-500');
    const [icon, setIcon] = useState('🏦');

    // Group accounts
    const isCreditCardOrDebt = (name: string) => {
        const lower = name.toLowerCase();
        return lower.includes('paylater') || lower.includes('kredit') || lower.includes('cicilan') || lower.includes('credit') || lower.includes('debt');
    };

    const saldoTabungan = accounts.filter(acc => !isCreditCardOrDebt(acc.name));
    const kartuKreditCicilan = accounts.filter(acc => isCreditCardOrDebt(acc.name));

    // Calculate totals
    const totalSaldo = saldoTabungan.reduce((sum, acc) => sum + acc.balance, 0);
    const totalKredit = kartuKreditCicilan.reduce((sum, acc) => sum + acc.balance, 0);

    const formatCurrency = (amount: number) => {
        const isNegative = amount < 0;
        const absVal = Math.abs(amount);
        const formatted = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(absVal);
        return isNegative ? `-${formatted}` : formatted;
    };

    // Helper to get Account Subtype label & icon
    const getAccountTypeInfo = (acc: any) => {
        const lower = acc.name.toLowerCase();
        let label = 'BANK';
        let defaultIcon = Landmark;
        let typeColor = 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';

        if (lower.includes('cash') || lower.includes('tunai')) {
            label = 'TUNAI';
            defaultIcon = Banknote;
            typeColor = 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
        } else if (lower.includes('ovo') || lower.includes('gopay') || lower.includes('dana') || lower.includes('shopeepay') || lower.includes('linkaja')) {
            label = 'E-WALLET';
            defaultIcon = Wallet;
            typeColor = 'text-green-500 bg-green-50 dark:bg-green-900/20';
        } else if (lower.includes('paylater') || lower.includes('kredit')) {
            label = 'CICILAN';
            defaultIcon = CreditCard;
            typeColor = 'text-red-500 bg-red-50 dark:bg-red-900/20';
        }

        return { label, defaultIcon, color: typeColor };
    };

    // Open Add Modal
    const handleOpenAdd = () => {
        setName('');
        setInitialBalance(0);
        setColor('from-blue-600 to-yellow-500');
        setIcon('🏦');
        setModalMode('add');
        setIsModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (acc: any) => {
        const rawAcc = rawAccounts.find(r => r.name === acc.name);
        setName(acc.name);
        setInitialBalance(rawAcc ? rawAcc.initialBalance : 0);
        setColor(acc.color || 'from-blue-600 to-yellow-500');
        setIcon(acc.icon || '🏦');
        setTargetAccountName(acc.name);
        setModalMode('edit');
        setIsModalOpen(true);
    };

    // Save/Update Dompet
    const handleSave = () => {
        if (!name.trim()) return;

        const currentMetadata = {
            accounts: [...rawAccounts],
            expenseCategories: useFinanceStore.getState().expenseCategories,
            incomeCategories: useFinanceStore.getState().incomeCategories
        };

        if (modalMode === 'add') {
            // Check duplicate
            if (rawAccounts.some(acc => acc.name.toLowerCase() === name.trim().toLowerCase())) {
                toast.error('Nama dompet sudah terdaftar!');
                return;
            }
            currentMetadata.accounts.push({
                name: name.trim(),
                initialBalance,
                color,
                icon
            });
            localDb.saveMetadata(currentMetadata);
            setMetadata(currentMetadata);
            setIsModalOpen(false);
            toast.success(`Dompet "${name.trim()}" berhasil ditambahkan!`);
        } else {
            // Update mode
            currentMetadata.accounts = currentMetadata.accounts.map(acc => {
                if (acc.name === targetAccountName) {
                    return {
                        ...acc,
                        name: name.trim(),
                        initialBalance,
                        color,
                        icon
                    };
                }
                return acc;
            });
            localDb.saveMetadata(currentMetadata);
            setMetadata(currentMetadata);
            setIsModalOpen(false);
            toast.success(`Dompet "${name.trim()}" berhasil diperbarui!`);
        }
    };

    // Delete Dompet
    const handleDelete = () => {
        if (!confirm(`Hapus dompet "${targetAccountName}"? Seluruh saldo awal dompet ini akan disesuaikan.`)) return;

        const currentMetadata = {
            accounts: rawAccounts.filter(acc => acc.name !== targetAccountName),
            expenseCategories: useFinanceStore.getState().expenseCategories,
            incomeCategories: useFinanceStore.getState().incomeCategories
        };

        localDb.saveMetadata(currentMetadata);
        setMetadata(currentMetadata);
        setIsModalOpen(false);
    };

    return (
        <div className="flex flex-col min-h-[80vh] bg-brimo-bg dark:bg-gray-900 transition-colors animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                        <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                    </button>
                    <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                            <Wallet className="w-5 h-5 text-brimo-primary dark:text-blue-400" />
                            Dompet
                        </h2>
                        <p className="text-[10px] text-gray-400">Atur semua sumber uangmu.</p>
                    </div>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="w-8 h-8 rounded-lg bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition active:scale-95"
                >
                    <Plus size={18} />
                </button>
            </div>

            {/* List Body */}
            <div className="flex-1 p-4 space-y-6">
                {/* Saldo & Tabungan Section */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-gray-500">Saldo & Tabungan</span>
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">{formatCurrency(totalSaldo)}</span>
                    </div>

                    <div className="space-y-2">
                        {saldoTabungan.map((acc, index) => {
                            const { label } = getAccountTypeInfo(acc);
                            return (
                                <div 
                                    key={index} 
                                    onClick={() => handleOpenEdit(acc)}
                                    className="flex justify-between items-center p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-sm cursor-pointer active:scale-[0.99] transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center relative bg-gradient-to-tr ${acc.color || 'from-blue-600 to-yellow-500'} text-white shadow-sm`}>
                                            <span className="text-lg">{acc.icon || '🏦'}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{acc.name}</p>
                                            <p className="text-[9px] uppercase font-bold text-gray-400">{label}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-800 dark:text-white">{formatCurrency(acc.balance)}</span>
                                </div>
                            );
                        })}
                        {saldoTabungan.length === 0 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-4">Belum ada akun saldo.</p>
                        )}
                    </div>
                </div>

                {/* Kartu Kredit & Cicilan Section */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-gray-500">Kartu Kredit & Cicilan</span>
                        <span className="text-xs font-bold text-red-500">{formatCurrency(totalKredit)}</span>
                    </div>

                    <div className="space-y-2">
                        {kartuKreditCicilan.map((acc, index) => {
                            const { label } = getAccountTypeInfo(acc);
                            return (
                                <div 
                                    key={index} 
                                    onClick={() => handleOpenEdit(acc)}
                                    className="flex justify-between items-center p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-sm cursor-pointer active:scale-[0.99] transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center relative bg-gradient-to-tr ${acc.color || 'from-red-500 to-rose-600'} text-white shadow-sm`}>
                                            <span className="text-lg">{acc.icon || '💳'}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{acc.name}</p>
                                            <p className="text-[9px] uppercase font-bold text-gray-400">{label}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-red-500">{formatCurrency(acc.balance)}</span>
                                </div>
                            );
                        })}
                        {kartuKreditCicilan.length === 0 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-4">Tidak ada kartu kredit atau cicilan.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tambah / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-[95%] sm:max-w-md rounded-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                                {modalMode === 'add' ? 'Tambah Dompet Baru' : 'Edit Dompet'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto space-y-4">
                            {/* Card Theme Preview */}
                            <div className={`w-full rounded-2xl p-4 text-white bg-gradient-to-tr ${color} shadow-md flex justify-between items-center transition-all duration-300`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                                        {icon}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold tracking-wide">{name || 'Nama Dompet'}</p>
                                        <p className="text-[10px] text-white/80">Saldo Awal Terdaftar</p>
                                    </div>
                                </div>
                                <span className="text-base font-bold">{formatCurrency(initialBalance)}</span>
                            </div>

                            {/* Input Nama */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Nama Rekening / Dompet</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Contoh: Bank BCA, Cash Wallet, Gopay"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brimo-primary dark:text-white"
                                />
                            </div>

                            {/* Input Saldo Awal */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Saldo Awal</label>
                                <input
                                    type="number"
                                    value={initialBalance || 0}
                                    onChange={e => setInitialBalance(Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brimo-primary dark:text-white font-semibold"
                                />
                            </div>

                            {/* Preset Ikon Emoji */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Pilih Ikon</label>
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_EMOJIS.map(em => (
                                        <button
                                            key={em}
                                            type="button"
                                            onClick={() => setIcon(em)}
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition border ${icon === em ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' : 'border-gray-100 dark:border-gray-850 hover:bg-gray-50'}`}
                                        >
                                            {em}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preset Tema Gradien */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Tema Warna Dompet</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {PRESET_GRADIENTS.map(grad => (
                                        <button
                                            key={grad.value}
                                            type="button"
                                            onClick={() => setColor(grad.value)}
                                            className={`h-8 rounded-lg bg-gradient-to-tr ${grad.value} border-2 ${color === grad.value ? 'border-orange-500 scale-105' : 'border-transparent'} transition`}
                                            title={grad.label}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="p-4 border-t border-gray-100 dark:border-gray-800 pb-safe flex gap-2">
                            {modalMode === 'edit' && (
                                <button
                                    onClick={handleDelete}
                                    className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 rounded-xl transition flex items-center justify-center"
                                    title="Hapus Dompet"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                className="flex-1 bg-brimo-primary hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition active:scale-95 text-sm"
                            >
                                Simpan Dompet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

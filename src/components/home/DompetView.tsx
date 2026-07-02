import { ArrowLeft, Wallet, Plus, CreditCard, Landmark, Banknote } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';

interface DompetViewProps {
    onBack: () => void;
    onOpenTransactionForm: () => void;
}

export const DompetView = ({ onBack, onOpenTransactionForm }: DompetViewProps) => {
    const { getAccountBalances } = useFinanceStore();
    const accounts = getAccountBalances();

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
    const getAccountTypeInfo = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('cash') || lower.includes('tunai')) {
            return { label: 'TUNAI', icon: Banknote, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' };
        }
        if (lower.includes('ovo') || lower.includes('gopay') || lower.includes('dana') || lower.includes('shopeepay') || lower.includes('linkaja')) {
            return { label: 'E-WALLET', icon: Wallet, color: 'text-green-500 bg-green-50 dark:bg-green-900/20' };
        }
        if (lower.includes('paylater') || lower.includes('kredit')) {
            return { label: 'CICILAN', icon: CreditCard, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' };
        }
        return { label: 'BANK', icon: Landmark, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' };
    };

    return (
        <div className="flex flex-col min-h-[80vh] bg-brimo-bg dark:bg-gray-900 transition-colors">
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
                    onClick={onOpenTransactionForm}
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
                            const { label, icon: Icon, color } = getAccountTypeInfo(acc.name);
                            return (
                                <div key={index} className="flex justify-between items-center p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center relative ${color}`}>
                                            {/* Top-left Indicator Dot */}
                                            <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-yellow-400"></span>
                                            <Icon className="w-5 h-5" />
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
                            const { label, icon: Icon, color } = getAccountTypeInfo(acc.name);
                            return (
                                <div key={index} className="flex justify-between items-center p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center relative ${color}`}>
                                            <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-400"></span>
                                            <Icon className="w-5 h-5" />
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
        </div>
    );
};

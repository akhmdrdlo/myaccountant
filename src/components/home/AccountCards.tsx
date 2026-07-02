import { useState } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { BalanceCard } from './BalanceCard';
import type { TransactionInput } from '../../types';
import { ChevronDown, Check, Wallet } from 'lucide-react';

interface AccountCardsProps {
    onOpenTransactionForm: (initial?: Partial<TransactionInput>) => void;
    onQuickPay?: (category: string, type: 'expense' | 'transfer') => void;
}

export const AccountCards = ({ onOpenTransactionForm, onQuickPay }: AccountCardsProps) => {
    const { balance, loading, getAccountBalances } = useFinanceStore();
    const accounts = getAccountBalances();

    const [selectedWallet, setSelectedWallet] = useState<string>('Total Saldo');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const cashBalance = accounts.find((a: any) => a.name.toLowerCase().includes('cash'))?.balance || 0;
    const bankBalance = balance - cashBalance;

    // Find the currently selected account details
    const selectedAccDetails = accounts.find(acc => acc.name === selectedWallet);

    const activeBalance = selectedWallet === 'Total Saldo' ? balance : (selectedAccDetails?.balance || 0);
    const activeColor = selectedWallet === 'Total Saldo' ? 'from-brimo-primary to-brimo-secondary' : (selectedAccDetails?.color || 'from-gray-700 to-gray-900');
    const activeBreakdown = selectedWallet === 'Total Saldo' ? { cash: cashBalance, bank: bankBalance } : undefined;

    return (
        <div className="w-full pb-2 pt-2 px-1 mb-2">
            {/* Header with Selector */}
            <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">
                    Informasi Saldo
                </h3>
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-sm active:scale-95 transition"
                    >
                        <Wallet className="w-3.5 h-3.5 text-blue-500" />
                        <span>{selectedWallet}</span>
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>

                    {dropdownOpen && (
                        <>
                            {/* Backdrop/Overlay to close dropdown */}
                            <div 
                                className="fixed inset-0 z-40 cursor-default" 
                                onClick={() => setDropdownOpen(false)} 
                            />
                            
                            {/* Dropdown Menu */}
                            <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-50 py-1.5 text-xs text-gray-700 dark:text-gray-200">
                                <button
                                    onClick={() => {
                                        setSelectedWallet('Total Saldo');
                                        setDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                                >
                                    <span className="font-medium">Total Saldo</span>
                                    {selectedWallet === 'Total Saldo' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                                </button>
                                
                                {accounts.map((acc) => (
                                    <button
                                        key={acc.name}
                                        onClick={() => {
                                            setSelectedWallet(acc.name);
                                            setDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                                    >
                                        <span>{acc.name}</span>
                                        {selectedWallet === acc.name && <Check className="w-3.5 h-3.5 text-blue-500" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Displaying selected wallet card */}
            <div className="w-full transition-all duration-300">
                <BalanceCard
                    name={selectedWallet}
                    balance={activeBalance}
                    loading={loading}
                    color={activeColor}
                    breakdown={activeBreakdown}
                    onTransfer={selectedWallet === 'Total Saldo' ? () => onOpenTransactionForm({ type: 'transfer' }) : undefined}
                    onQuickPay={selectedWallet === 'Total Saldo' ? onQuickPay : undefined}
                />
            </div>
        </div>
    );
};

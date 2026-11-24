import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Coffee, Bus, ShoppingBag, Zap, CreditCard, HelpCircle, Briefcase, Banknote } from 'lucide-react';
import type { Transaction } from '../../types';
import { cn } from '../../lib/utils';

// Category to Icon mapping
const getCategoryIcon = (category: string) => {
    const norm = category.toLowerCase();
    if (norm.includes('makan') || norm.includes('food')) return Coffee;
    if (norm.includes('transport') || norm.includes('gojek')) return Bus;
    if (norm.includes('belanja') || norm.includes('shop')) return ShoppingBag;
    if (norm.includes('tagihan') || norm.includes('bill') || norm.includes('utilitas')) return Zap;
    if (norm.includes('gaji') || norm.includes('salary')) return Briefcase;
    if (norm.includes('tarik') || norm.includes('cash') || norm.includes('transfer')) return Banknote;
    if (norm.includes('cicilan') || norm.includes('credit')) return CreditCard;
    return HelpCircle;
};

interface TransaksiTerbaruProps {
    transactions: Transaction[];
}

export const TransaksiTerbaru = ({ transactions }: TransaksiTerbaruProps) => {
    // Take the 5 most recent transactions
    const recentTransactions = transactions
        .filter(t => t.type !== 'transfer') // Optionally skip internal transfers or keep them
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(Math.abs(amount));
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-150 dark:border-gray-700 shadow-sm transition-colors mb-6">
            <h3 className="text-md font-bold text-gray-800 dark:text-white mb-4">Transaksi Terbaru</h3>

            {recentTransactions.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-500 italic">
                    Belum ada transaksi.
                </div>
            ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-750">
                    {recentTransactions.map((t) => {
                        const Icon = getCategoryIcon(t.category);
                        const isExpense = t.type === 'expense';
                        const formattedDate = format(parseISO(t.timestamp), 'dd MMM yyyy', { locale: id });

                        return (
                            <div key={t.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-9 h-9 rounded-full flex items-center justify-center",
                                        isExpense ? "bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400" : "bg-green-50 dark:bg-green-950/30 text-green-500 dark:text-green-400"
                                    )}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200 capitalize">{t.category}</p>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500">{t.description || formattedDate}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={cn("text-xs font-bold", isExpense ? "text-red-500" : "text-green-500")}>
                                        {isExpense ? "-" : "+"}Rp {formatAmount(t.amount)}
                                    </p>
                                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{t.account}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

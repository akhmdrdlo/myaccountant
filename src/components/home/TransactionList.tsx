import { format, isToday, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';
import { Coffee, Bus, ShoppingBag, Zap, CreditCard, HelpCircle, Briefcase, Banknote } from 'lucide-react';
import type { Transaction } from '../../types';
import { cn } from '../../lib/utils';

// Helper to map category to Icon
const getCategoryIcon = (category: string) => {
    const norm = category.toLowerCase();
    if (norm.includes('makan') || norm.includes('food')) return Coffee;
    if (norm.includes('transport') || norm.includes('gojek')) return Bus;
    if (norm.includes('belanja') || norm.includes('shop')) return ShoppingBag;
    if (norm.includes('tagihan') || norm.includes('bill')) return Zap;
    if (norm.includes('gaji') || norm.includes('salary')) return Briefcase;
    if (norm.includes('tarik') || norm.includes('cash')) return Banknote;
    if (norm.includes('cicilan') || norm.includes('credit')) return CreditCard;
    return HelpCircle;
};

interface TransactionListProps {
    transactions: Transaction[];
    loading?: boolean;
}

export const TransactionList = ({ transactions, loading }: TransactionListProps) => {

    // Group by date
    // Sort DESC first
    const sorted = [...transactions]
        .filter(t => !isNaN(new Date(t.timestamp).getTime())) // Safety Check
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const grouped: Record<string, Transaction[]> = {};
    sorted.forEach(t => {
        const date = new Date(t.timestamp);
        // Key: "2024-12-18" or distinct Label
        const key = format(date, 'yyyy-MM-dd');
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
    });

    const formatDateLabel = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isToday(date)) return "Hari Ini";
        if (isYesterday(date)) return "Kemarin";
        return format(date, 'd MMMM yyyy', { locale: id });
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(Math.abs(amount));
    };

    if (loading) {
        return <div className="p-4 text-center text-gray-500 text-sm">Memuat transaksi...</div>;
    }

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <HelpCircle className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm">Belum ada transaksi</p>
            </div>
        );
    }

    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="font-semibold text-gray-700">Riwayat Transaksi</h3>
                <button className="text-xs text-brimo-secondary font-medium hover:underline">Lihat Semua</button>
            </div>

            <div className="space-y-4">
                {Object.keys(grouped).map((dateKey) => (
                    <div key={dateKey}>
                        <p className="text-[11px] text-gray-500 font-medium mb-2 sticky top-0 bg-brimo-bg/95 backdrop-blur-sm py-1 z-10 px-1">
                            {formatDateLabel(dateKey)}
                        </p>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {grouped[dateKey].map((t, idx) => {
                                const Icon = getCategoryIcon(t.category);
                                const isExpense = t.type === 'expense';
                                const isLast = idx === grouped[dateKey].length - 1;

                                return (
                                    <div
                                        key={t.id}
                                        className={cn(
                                            "flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors cursor-pointer",
                                            !isLast && "border-b border-gray-50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isExpense ? "bg-red-50" : "bg-green-50")}>
                                                {/* {isExpense ? <ArrowUpRight className="w-5 h-5 text-red-500" /> : <ArrowDownLeft className="w-5 h-5 text-green-500" />} */}
                                                {/* Better: Category Icon */}
                                                <Icon className={cn("w-5 h-5", isExpense ? "text-red-500" : "text-green-500")} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700 capitalize">{t.category}</p>
                                                <p className="text-[10px] text-gray-400 line-clamp-1">{t.description || t.type}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("text-sm font-bold", isExpense ? "text-red-500" : "text-green-500")}>
                                                {isExpense ? "-" : "+"}Rp {formatAmount(t.amount)}
                                            </p>
                                            <span className={cn(
                                                "text-[9px] px-1.5 py-0.5 rounded-full",
                                                t.status === 'completed' ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
                                            )}>
                                                {t.status === 'completed' ? "Berhasil" : "Pending"}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

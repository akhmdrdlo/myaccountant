import { useState, useMemo } from 'react';
import { format, isToday, isYesterday, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { Coffee, Bus, ShoppingBag, Zap, CreditCard, HelpCircle, Briefcase, Banknote, Search, Filter, Calendar, ArrowDown } from 'lucide-react';
import type { Transaction } from '../../types';
import { cn } from '../../lib/utils';

// Helper to map category to Icon
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

interface TransactionListProps {
    transactions: Transaction[];
    loading?: boolean;
}

export const TransactionList = ({ transactions, loading }: TransactionListProps) => {
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [limit, setLimit] = useState(20);
    const [showFilters, setShowFilters] = useState(false);

    // Derived Data: Categories present in the list for filter dropdown
    const availableCategories = useMemo(() => {
        const cats = new Set(transactions.map(t => t.category));
        return Array.from(cats).sort();
    }, [transactions]);

    // Filter & Sort Logic
    const filteredAndSorted = useMemo(() => {
        let result = [...transactions];

        // 1. Search
        if (search) {
            const lowSearch = search.toLowerCase();
            result = result.filter(t =>
                t.description?.toLowerCase().includes(lowSearch) ||
                t.category.toLowerCase().includes(lowSearch) ||
                t.amount.toString().includes(lowSearch)
            );
        }

        // 2. Category Filter
        if (categoryFilter) {
            result = result.filter(t => t.category === categoryFilter);
        }

        // 3. Date Range Filter
        if (startDate) {
            result = result.filter(t => isAfter(parseISO(t.timestamp), startOfDay(parseISO(startDate))) || format(parseISO(t.timestamp), 'yyyy-MM-dd') === startDate);
        }
        if (endDate) {
            result = result.filter(t => isBefore(parseISO(t.timestamp), endOfDay(parseISO(endDate))) || format(parseISO(t.timestamp), 'yyyy-MM-dd') === endDate);
        }

        // 4. Sort DESC
        return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [transactions, search, categoryFilter, startDate, endDate]);

    // Pagination
    const displayedTransactions = filteredAndSorted.slice(0, limit);
    const hasMore = limit < filteredAndSorted.length;

    // Grouping
    const grouped = useMemo(() => {
        const groups: Record<string, Transaction[]> = {};
        displayedTransactions.forEach(t => {
            if (!t.timestamp) return;
            const dateStr = format(parseISO(t.timestamp), 'yyyy-MM-dd');
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(t);
        });
        return groups;
    }, [displayedTransactions]);

    const formatDateLabel = (dateStr: string) => {
        try {
            const date = parseISO(dateStr);
            if (isToday(date)) return "Hari Ini";
            if (isYesterday(date)) return "Kemarin";
            return format(date, 'd MMMM yyyy', { locale: id });
        } catch (e) {
            return dateStr;
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(Math.abs(amount));
    };

    const handleLoadMore = () => {
        setLimit(prev => prev + 20);
    };

    if (loading && transactions.length === 0) {
        return <div className="p-4 text-center text-gray-500 text-sm">Memuat transaksi...</div>;
    }

    return (
        <div className="pb-24"> {/* Extra padding for FAB */}
            <div className="px-1 mb-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-700">Riwayat Transaksi</h3>
                    <div className="text-xs text-gray-500">
                        Total: {filteredAndSorted.length} Transaksi
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari transaksi..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brimo-primary"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "p-2 rounded-xl border transition-colors",
                                showFilters || categoryFilter || startDate || endDate ? "bg-blue-50 border-brimo-primary text-brimo-primary" : "bg-white border-gray-200 text-gray-500"
                            )}
                        >
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Expandable Filters */}
                    {showFilters && (
                        <div className="bg-gray-50 p-3 rounded-xl space-y-3 border border-gray-100 animate-in fade-in slide-in-from-top-2">
                            {/* Category Select */}
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Kategori</label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brimo-primary"
                                >
                                    <option value="">Semua Kategori</option>
                                    {availableCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Range */}
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Rentang Tanggal</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full pl-7 pr-2 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                                        />
                                    </div>
                                    <span className="self-center text-gray-400">-</span>
                                    <div className="relative flex-1">
                                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full pl-7 pr-2 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Reset Filter */}
                            {(categoryFilter || startDate || endDate) && (
                                <button
                                    onClick={() => {
                                        setCategoryFilter('');
                                        setStartDate('');
                                        setEndDate('');
                                    }}
                                    className="text-xs text-red-500 font-semibold text-center w-full hover:underline"
                                >
                                    Reset Filter
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {filteredAndSorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Search className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm">Tidak ditemukan transaksi</p>
                </div>
            ) : (
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

                    {/* Load More Button */}
                    {hasMore && (
                        <button
                            onClick={handleLoadMore}
                            className="w-full py-3 bg-white border border-gray-200 text-gray-600 font-medium text-sm rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowDown className="w-4 h-4" />
                            Tampilkan Lebih Banyak
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

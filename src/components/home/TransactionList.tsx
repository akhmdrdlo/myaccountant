import { useState, useMemo } from 'react';
import { format, isToday, isYesterday, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { Search, Filter, Calendar, ArrowDown, Printer } from 'lucide-react';
import { categoryIcon } from '../../lib/categoryIcons';
import { isNeutralCategory } from '../../lib/period';
import type { Transaction } from '../../types';
import { cn } from '../../lib/utils';

interface TransactionListProps {
    transactions: Transaction[];
    loading?: boolean;
    /** Ketuk baris untuk mengubah atau menghapus */
    onSelect?: (t: Transaction) => void;
}

export const TransactionList = ({ transactions, loading, onSelect }: TransactionListProps) => {
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [tagFilter, setTagFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [dateRangeOption, setDateRangeOption] = useState<'all' | '1month' | '3month' | 'custom'>('all');
    const [limit, setLimit] = useState(20);
    const [showFilters, setShowFilters] = useState(false);

    // Derived Data: Categories present in the list for filter dropdown
    const availableCategories = useMemo(() => {
        const cats = new Set(transactions.map(t => t.category));
        return Array.from(cats).sort();
    }, [transactions]);

    const availableTags = useMemo(() => {
        const count = new Map<string, number>();
        for (const t of transactions) for (const tag of t.tags ?? []) count.set(tag, (count.get(tag) ?? 0) + 1);
        return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
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
                t.amount.toString().includes(lowSearch) ||
                (t.tags ?? []).some(tag => tag.includes(lowSearch.replace(/^#/, '')))
            );
        }

        if (tagFilter) {
            result = result.filter(t => (t.tags ?? []).includes(tagFilter));
        }

        // 2. Category Filter
        if (categoryFilter) {
            result = result.filter(t => t.category === categoryFilter);
        }

        // 3. Date Range Filter based on active option
        const today = new Date();
        if (dateRangeOption === '1month') {
            const oneMonthAgo = new Date();
            oneMonthAgo.setDate(today.getDate() - 30);
            result = result.filter(t => {
                const tDate = parseISO(t.timestamp);
                return tDate >= oneMonthAgo && tDate <= today;
            });
        } else if (dateRangeOption === '3month') {
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setDate(today.getDate() - 90);
            result = result.filter(t => {
                const tDate = parseISO(t.timestamp);
                return tDate >= threeMonthsAgo && tDate <= today;
            });
        } else if (dateRangeOption === 'custom') {
            if (startDate) {
                result = result.filter(t => isAfter(parseISO(t.timestamp), startOfDay(parseISO(startDate))) || format(parseISO(t.timestamp), 'yyyy-MM-dd') === startDate);
            }
            if (endDate) {
                result = result.filter(t => isBefore(parseISO(t.timestamp), endOfDay(parseISO(endDate))) || format(parseISO(t.timestamp), 'yyyy-MM-dd') === endDate);
            }
        }

        // 4. Sort DESC
        return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [transactions, search, categoryFilter, tagFilter, dateRangeOption, startDate, endDate]);

    const tagTotals = useMemo(() => {
        if (!tagFilter) return null;
        const out = filteredAndSorted.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const inn = filteredAndSorted.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        return { out, inn, count: filteredAndSorted.length };
    }, [filteredAndSorted, tagFilter]);

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
        return <div className="p-4 text-center text-rp-ink-2 text-sm">Memuat transaksi...</div>;
    }

    return (
        <div className="pb-24"> {/* Extra padding for FAB */}
            <div className="px-1 mb-4">
                <div className="flex justify-between items-center mb-3">
                    <p className="text-sm text-rp-ink-2 rp-num">{filteredAndSorted.length} transaksi</p>
                    <button
                        onClick={() => window.print()}
                        className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-rp-surface-2 text-rp-royal text-xs font-semibold no-print"
                    >
                        <Printer className="w-4 h-4" /> Cetak PDF
                    </button>
                </div>

                {/* Search & Filter Bar */}
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rp-ink-2" />
                            <input
                                type="text"
                                placeholder="Cari transaksi..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-rp-surface border border-rp-line rounded-xl text-sm focus:outline-none focus:border-rp-navy"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "p-2 rounded-xl border transition-colors",
                                showFilters || categoryFilter ? "bg-rp-surface-2 border-rp-navy text-rp-navy" : "bg-rp-surface border-rp-line text-rp-ink-2"
                            )}
                        >
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Quick Date Filters Segment (Pill Tabs) */}
                    <div className="flex gap-1.5 p-1 bg-rp-canvas rounded-xl no-print">
                        {(['all', '1month', '3month', 'custom'] as const).map((opt) => {
                            const labels = {
                                all: 'Semua',
                                '1month': '30 Hari',
                                '3month': '90 Hari',
                                custom: 'Kalender'
                            };
                            const isActive = dateRangeOption === opt;
                            return (
                                <button
                                    key={opt}
                                    onClick={() => setDateRangeOption(opt)}
                                    className={cn(
                                        "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                                        isActive 
                                            ? "bg-rp-surface text-rp-navy shadow-rp-1" 
                                            : "text-rp-ink-2 hover:text-rp-ink"
                                    )}
                                >
                                    {labels[opt]}
                                </button>
                            );
                        })}
                    </div>

                    {/* Custom Calendar Pickers (only shown if 'custom' is active) */}
                    {dateRangeOption === 'custom' && (
                        <div className="bg-rp-surface p-3 rounded-xl border border-rp-line space-y-2 no-print animate-in fade-in slide-in-from-top-1">
                            <label className="text-xs uppercase font-bold text-rp-ink-2 mb-1 block">Rentang Tanggal Khusus</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rp-ink-2" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full pl-8 pr-2 py-1.5 bg-rp-canvas border border-rp-line rounded-lg text-xs focus:outline-none focus:border-rp-navy"
                                    />
                                </div>
                                <span className="self-center text-rp-ink-2">-</span>
                                <div className="relative flex-1">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rp-ink-2" />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full pl-8 pr-2 py-1.5 bg-rp-canvas border border-rp-line rounded-lg text-xs focus:outline-none focus:border-rp-navy"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Category Filter Dropdown (Toggled by Filter button) */}
                    {showFilters && (
                        <div className="bg-rp-canvas p-3 rounded-xl border border-rp-line space-y-3 no-print animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="text-xs uppercase font-bold text-rp-ink-2 mb-1 block">Kategori Transaksi</label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full p-2 bg-rp-surface border border-rp-line rounded-lg text-sm focus:outline-none focus:border-rp-navy"
                                >
                                    <option value="" className="text-rp-ink bg-rp-surface">Semua Kategori</option>
                                    {availableCategories.map(cat => (
                                        <option key={cat} value={cat} className="text-rp-ink bg-rp-surface">{cat}</option>
                                    ))}
                                </select>
                            </div>
                            {categoryFilter && (
                                <button
                                    onClick={() => setCategoryFilter('')}
                                    className="text-xs text-rp-out font-semibold text-center w-full hover:underline"
                                >
                                    Reset Filter Kategori
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="no-print">
                {availableTags.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 -mx-1 px-1" role="group" aria-label="Filter tag">
                        {availableTags.map(tag => (
                            <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? '' : tag)} aria-pressed={tagFilter === tag}
                                className={cn('h-9 px-3 shrink-0 rounded-full text-xs font-semibold border transition',
                                    tagFilter === tag ? 'bg-rp-royal border-rp-royal text-white' : 'border-rp-line text-rp-ink-2 bg-rp-surface')}>
                                #{tag}
                            </button>
                        ))}
                    </div>
                )}
                {tagTotals && (
                    <div className="rp-card p-4 mb-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-rp-ink-2">Total #{tagFilter} · {tagTotals.count} transaksi</p>
                            <p className="text-lg font-bold text-rp-out rp-num">−Rp{formatAmount(tagTotals.out)}</p>
                        </div>
                        {tagTotals.inn > 0 && <p className="text-sm font-semibold text-rp-in rp-num">+Rp{formatAmount(tagTotals.inn)}</p>}
                    </div>
                )}
                {filteredAndSorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-rp-ink-2">
                        <div className="w-16 h-16 bg-rp-surface-2 rounded-full flex items-center justify-center mb-3">
                            <Search className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-sm text-rp-ink">Tidak ditemukan transaksi</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Object.keys(grouped).map((dateKey) => {
                            // Calculate Daily Total
                            const dailyTransactions = grouped[dateKey];
                            const dailyIncome = dailyTransactions.reduce((acc, curr) =>
                                curr.type === 'income' && curr.category !== 'Transfer / Tarik Tunai' ? acc + curr.amount : acc, 0);
                            const dailyExpense = dailyTransactions.reduce((acc, curr) =>
                                curr.type === 'expense' && curr.category !== 'Transfer / Tarik Tunai' ? acc + curr.amount : acc, 0);
                            const dailyNet = dailyIncome - dailyExpense;

                            return (
                                <div key={dateKey}>
                                    <div className="flex items-center gap-3 sticky top-14 z-10 bg-rp-canvas py-2 px-1">
                                        <p className="text-xs font-semibold text-rp-ink-2 shrink-0">{formatDateLabel(dateKey)}</p>
                                        <span className="flex-1 border-t border-dashed border-rp-line" aria-hidden />
                                        <p className={cn("text-xs font-semibold rp-num shrink-0", dailyNet >= 0 ? "text-rp-in" : "text-rp-ink-2")}>
                                            {dailyNet >= 0 ? "+" : "−"}{formatAmount(Math.abs(dailyNet))}
                                        </p>
                                    </div>
                                    <div className="rp-card divide-y divide-rp-line overflow-hidden">
                                        {grouped[dateKey].map((t) => {
                                            const Icon = categoryIcon(t.category);
                                            const neutral = isNeutralCategory(t.category);
                                            const isExpense = t.type === 'expense';

                                            return (
                                                <button
                                                    type="button"
                                                    key={t.id}
                                                    onClick={() => onSelect?.(t)}
                                                    aria-label={`${t.description || t.category}, ${isExpense ? 'keluar' : 'masuk'} Rp${formatAmount(t.amount)}. Ketuk untuk ubah`}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-rp-surface-2 transition-colors"
                                                >
                                                    <span className={cn("w-9 h-9 shrink-0 rounded-xl flex items-center justify-center", neutral ? "bg-rp-surface-2 text-rp-ink-2" : isExpense ? "bg-rp-out-soft text-rp-out" : "bg-rp-in-soft text-rp-in")}>
                                                        <Icon className="w-[18px] h-[18px]" />
                                                    </span>
                                                    <span className="flex-1 min-w-0">
                                                        <span className="block text-sm font-medium text-rp-ink truncate">{t.description || t.category}</span>
                                                        <span className="block text-xs text-rp-ink-2 truncate">
                                                            {t.category} · {t.account}{(t.tags?.length ?? 0) > 0 ? ` · ${t.tags!.map(x => '#' + x).join(' ')}` : ''}
                                                        </span>
                                                    </span>
                                                    <span className="text-right shrink-0">
                                                        <span className={cn("block text-sm font-semibold rp-num", neutral ? "text-rp-ink-2" : isExpense ? "text-rp-ink" : "text-rp-in")}>
                                                            {isExpense ? "−" : "+"}Rp{formatAmount(t.amount)}
                                                        </span>
                                                        {t.status === 'pending' && <span className="block text-[11px] text-rp-warn">Menunggu</span>}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )
                        })}

                        {/* Load More Button */}
                        {hasMore && (
                            <button
                                onClick={handleLoadMore}
                                className="w-full py-3 bg-rp-surface dark:bg-rp-canvas border border-rp-line text-rp-ink-2 font-medium text-sm rounded-xl hover:bg-rp-surface-2 transition-colors flex items-center justify-center gap-2"
                            >
                                <ArrowDown className="w-4 h-4 dark:text-white" />
                                Tampilkan Lebih Banyak
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Printable Report Table Area */}
            <div className="print-container">
                <div className="print-header">
                    <h1>Laporan Mutasi Keuangan Personal</h1>
                    <p>Sistem Manajemen Keuangan Rplanner</p>
                    <p>Dicetak pada: {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })} WIB</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>No</th>
                            <th style={{ width: '120px' }}>Tanggal</th>
                            <th style={{ width: '150px' }}>Rekening/Dompet</th>
                            <th style={{ width: '90px' }}>Tipe</th>
                            <th style={{ width: '120px' }}>Kategori</th>
                            <th>Keterangan</th>
                            <th style={{ width: '120px', textAlign: 'right' }}>Nominal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSorted.map((t, idx) => (
                            <tr key={t.id}>
                                <td>{idx + 1}</td>
                                <td>{format(parseISO(t.timestamp), 'dd/MM/yyyy HH:mm')}</td>
                                <td>{t.account}</td>
                                <td className="capitalize">
                                    {t.type === 'expense' ? 'Pengeluaran' : t.type === 'income' ? 'Pemasukan' : t.type === 'transfer' ? 'Transfer' : 'Penyesuaian'}
                                </td>
                                <td>{t.category}</td>
                                <td>{t.description || '-'}</td>
                                <td className={cn(t.type === 'expense' ? 'text-rp-out' : 'text-rp-in')} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                    {t.type === 'expense' ? '-' : '+'}Rp {formatAmount(t.amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="print-signature-area">
                    <div className="signature-box">
                        <p>Mengetahui,</p>
                        <p className="signature-line">Administrator Sistem</p>
                    </div>
                    <div className="signature-box">
                        <p>Bandung, {format(new Date(), 'dd MMMM yyyy', { locale: id })}</p>
                        <p className="signature-line">Akhmad Ridlo Rifa'i</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

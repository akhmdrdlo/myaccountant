import { ArrowLeft, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useFinanceStore } from '../../store/useFinanceStore';
import { SubscriptionTracker } from './SubscriptionTracker';

interface DeadlinesViewProps {
    onBack: () => void;
}

export const DeadlinesView = ({ onBack }: DeadlinesViewProps) => {
    const { subscriptions, goals } = useFinanceStore();

    // 1. Format Subscriptions Deadlines (Monthly Recurring)
    const formattedSubs = (subscriptions || []).map(sub => {
        const today = new Date();
        let targetMonth = today.getMonth();
        let targetYear = today.getFullYear();
        
        // If billing date is passed for this month, target next month
        if (today.getDate() > sub.billingDate) {
            targetMonth += 1;
            if (targetMonth > 11) {
                targetMonth = 0;
                targetYear += 1;
            }
        }
        
        const targetDate = new Date(targetYear, targetMonth, sub.billingDate);
        return {
            type: 'Tagihan Rutin',
            name: sub.name,
            amount: sub.amount,
            date: targetDate,
            category: sub.category,
            label: `Setiap tgl ${sub.billingDate}`
        };
    });

    // 2. Format Goals Deadlines
    const formattedGoals = (goals || [])
        .filter(g => g.deadline)
        .map(g => {
            const date = new Date(g.deadline!);
            return {
                type: 'Target Impian',
                name: g.name,
                amount: typeof g.currentAmount === 'number' ? (g.targetAmount - g.currentAmount) : g.targetAmount,
                date: isNaN(date.getTime()) ? new Date() : date,
                category: 'Tabungan',
                label: 'Jatuh Tempo'
            };
        });

    // Merge & Sort chronologically
    const allDeadlines = [...formattedSubs, ...formattedGoals].sort((a, b) => a.date.getTime() - b.date.getTime());

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(val);
    };

    return (
        <div className="flex flex-col min-h-[80vh] bg-rp-canvas dark:bg-gray-900 transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                        <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                    </button>
                    <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            Tagihan & Pembayaran
                        </h2>
                        <p className="text-xs text-gray-400">Kelola tagihan bulanan dan tanggal pembayaran terdekat</p>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-6">
                {/* Subscription Management */}
                <SubscriptionTracker />

                {/* Content Timeline */}
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide px-1">Garis Waktu Jatuh Tempo</h3>
                    <div className="space-y-3">
                        {allDeadlines.map((item, idx) => {
                            const isSub = item.type === 'Tagihan Rutin';
                            return (
                                <div key={idx} className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-all relative">
                                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono border ${
                                        isSub 
                                            ? 'border-blue-100 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800' 
                                            : 'border-blue-100 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800'
                                    }`}>
                                        <span className="text-[11px] font-bold uppercase text-gray-400">TGL</span>
                                        <span className="text-sm font-bold">{item.date.getDate()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <h4 className="font-bold text-sm text-gray-800 dark:text-white truncate">{item.name}</h4>
                                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                                                isSub ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                                            }`}>
                                                {item.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                            <p className="font-semibold text-gray-600 dark:text-gray-300">{formatCurrency(item.amount)}</p>
                                            <p className="text-xs text-gray-400">
                                                {item.label}: {format(item.date, 'd MMM yyyy', { locale: id })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {allDeadlines.length === 0 && (
                            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs text-gray-400">Belum ada jadwal pembayaran atau target goals terdekat.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

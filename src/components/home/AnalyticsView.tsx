import { useMemo, type ReactNode } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, AlertCircle, Activity } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { Transaction } from '../../types';
import { format, parseISO } from 'date-fns';

interface AnalyticsViewProps {
    transactions: Transaction[];
    children?: ReactNode;
}

const COLORS = ['#0B3C7A', '#1F5FDB', '#5AB0E4', '#7C8FB0', '#B6C6DC', '#2E8C9A'];

export const AnalyticsView = ({ transactions, children }: AnalyticsViewProps) => {
    const { monthlyIncome, monthlyExpense, balance } = useFinanceStore();

    // 0. Net Worth & Health Logic
    // Health Score
    const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpense) / monthlyIncome : 0;
    const healthScore = monthlyIncome === 0
        ? (balance > 0 ? 50 : 0)
        : Math.min(100, Math.max(0, 60 + (savingsRate * 100)));

    const getHealthLabel = (score: number) => {
        if (score >= 80) return { label: "Sangat Sehat", color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" };
        if (score >= 60) return { label: "Sehat", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" };
        if (score >= 40) return { label: "Waspada", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" };
        return { label: "Bahaya", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" };
    };
    const healthStatus = getHealthLabel(healthScore);


    // 1. Prepare Data for Donut Chart (Category Proportion)
    const categoryData = useMemo(() => {
        // Exclude Transfer transactions
        const expenses = transactions.filter(t =>
            t.type === 'expense' &&
            !['transfer / tarik tunai', 'penyesuaian saldo'].includes(t.category.toLowerCase())
        );
        const grouped: Record<string, number> = {};

        expenses.forEach(t => {
            if (!grouped[t.category]) grouped[t.category] = 0;
            grouped[t.category] += t.amount;
        });

        // Top 5 categories + Others
        const entries = Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        if (entries.length > 5) {
            const top5 = entries.slice(0, 5);
            const others = entries.slice(5).reduce((acc, curr) => acc + curr.value, 0);
            return [...top5, { name: 'Lainnya', value: others }];
        }
        return entries;
    }, [transactions]);

    // 2. Prepare Data for Trend Chart (Daily Expenses)
    const trendData = useMemo(() => {
        const expenses = transactions.filter(t => t.type === 'expense');
        const grouped: Record<string, number> = {};

        // Filter for current month (optional, but requested "Trend harian bulan ini")
        // const now = new Date();
        // const start = startOfMonth(now);
        // const end = endOfMonth(now);

        expenses.forEach(t => {
            if (!t.timestamp) return;
            const date = parseISO(t.timestamp);
            const dayKey = format(date, 'dd MMM');
            if (!grouped[dayKey]) grouped[dayKey] = 0;
            grouped[dayKey] += t.amount;
        });

        // Re-approach: Group sorted transactions
        const sortedTx = [...expenses].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const finalGrouped: { name: string; amount: number; fullDate: string }[] = [];

        sortedTx.forEach(t => {
            const date = parseISO(t.timestamp);
            const name = format(date, 'd MMM'); // e.g. "1 Des"
            const last = finalGrouped[finalGrouped.length - 1];
            if (last && last.name === name) {
                last.amount += t.amount;
            } else {
                finalGrouped.push({ name, amount: t.amount, fullDate: t.timestamp });
            }
        });

        // Limit to last 14 days or 30 days for readability
        return finalGrouped.slice(-30);
    }, [transactions]);

    // 3. Insights
    const insights = useMemo(() => {
        if (categoryData.length === 0) return null;
        const topCategory = categoryData.find(c =>
            !['transfer / tarik tunai', 'penyesuaian saldo'].includes(c.name.toLowerCase())
        ) || categoryData[0];

        // Anomaly: Any day > 2x Average?
        const total = trendData.reduce((acc, curr) => acc + curr.amount, 0);
        const avg = total / (trendData.length || 1);
        const anomaly = trendData.find(d => d.amount > avg * 3); // Spike > 3x avg

        return {
            topCategory,
            anomaly
        };
    }, [categoryData, trendData]);

    const formatCurrency = (val: number) => {
        // Short format: 1.5jt, 500rb
        if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}jt`;
        if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}rb`;
        return val.toString();
    };

    if (transactions.length === 0) {
        return <div className="p-10 text-center text-gray-500">Belum ada data untuk analisis.</div>;
    }


    return (
        <div className="pb-24 px-1">

            <div className="bg-gradient-to-br from-blue-800 to-blue-600 rounded-2xl p-5 text-white shadow-lg mb-6">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-white/20 rounded-full">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-1">Insight Bulanan</h3>
                        <p className="text-sm text-brimo-100 leading-relaxed">
                            Pengeluaran terbesar bulan ini adalah <span className="font-bold text-white bg-white/20 px-1 rounded">{insights?.topCategory.name}</span> ({formatCurrency(insights?.topCategory.value || 0)}).
                        </p>
                        {insights?.anomaly && (
                            <div className="mt-3 flex items-center gap-2 bg-white/10 p-2 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-amber-300" />
                                <p className="text-xs">
                                    Spike pada <span className="font-bold">{insights.anomaly.name}</span> ({formatCurrency(insights.anomaly.amount)}). Cek detailnya.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Health Score Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex items-center justify-between">
                <div>
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Skor Keuangan</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-800 dark:text-white">{Math.round(healthScore)}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${healthStatus.bg} ${healthStatus.color}`}>
                            {healthStatus.label}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        Berdasarkan rasio tabungan bulan ini ({Math.round(savingsRate * 100)}%)
                    </p>
                </div>
                <div className="h-16 w-16 relative flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100 dark:text-gray-700" />
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={175} strokeDashoffset={175 - (Math.min(healthScore, 100) / 100) * 175} className={healthStatus.color} strokeLinecap="round" />
                    </svg>
                    <Activity className={`w-6 h-6 absolute ${healthStatus.color}`} />
                </div>
            </div>

            {/* Donut Chart */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 transition-colors">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 text-sm">Proporsi Pengeluaran</h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {categoryData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                                itemStyle={{ color: '#0F1E33' }}
                                formatter={(value: any) => formatCurrency(Number(value) || 0)}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                    {categoryData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{entry.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trend Chart */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 transition-colors">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 text-sm">Tren Pengeluaran Harian</h3>
                <div className="h-[200px] w-full -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1F5FDB" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#1F5FDB" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" strokeOpacity={0.2} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 12, fill: '#5E6F87' }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={20}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#5E6F87' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => val >= 1000 ? `${val / 1000}k` : val}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                                itemStyle={{ color: '#0F1E33' }}
                                formatter={(value: any) => formatCurrency(Number(value) || 0)}
                            />
                            <Area type="monotone" dataKey="amount" stroke="#1F5FDB" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Moved Content from Home */}
            <div className="space-y-6">
                {children}
            </div>
        </div>
    );
};

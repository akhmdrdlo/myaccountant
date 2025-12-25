import { useMemo, type ReactNode } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';
import type { Transaction } from '../../types';
import { format, parseISO } from 'date-fns';

interface AnalyticsViewProps {
    transactions: Transaction[];
    children?: ReactNode;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

export const AnalyticsView = ({ transactions, children }: AnalyticsViewProps) => {

    // 1. Prepare Data for Donut Chart (Category Proportion)
    const categoryData = useMemo(() => {
        // Exclude Transfer transactions
        const expenses = transactions.filter(t =>
            t.type === 'expense' &&
            t.category !== 'Transfer / Tarik Tunai'
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
            !['transfer / tarik tunai'].includes(c.name.toLowerCase())
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
            <h2 className="text-xl font-bold text-gray-800 mb-4 px-2">Analisis Keuangan</h2>

            {/* Smart Insights Card */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg mb-6">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-white/20 rounded-full">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-1">Insight Bulanan</h3>
                        <p className="text-sm text-indigo-100 leading-relaxed">
                            Pengeluaran terbesar bulan ini adalah <span className="font-bold text-white bg-white/20 px-1 rounded">{insights?.topCategory.name}</span> ({formatCurrency(insights?.topCategory.value || 0)}).
                        </p>
                        {insights?.anomaly && (
                            <div className="mt-3 flex items-center gap-2 bg-white/10 p-2 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-yellow-300" />
                                <p className="text-xs">
                                    Spike pada <span className="font-bold">{insights.anomaly.name}</span> ({formatCurrency(insights.anomaly.amount)}). Cek detailnya.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Donut Chart */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h3 className="font-bold text-gray-700 mb-4 text-sm">Proporsi Pengeluaran</h3>
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
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                    {categoryData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-xs text-gray-500 font-medium">{entry.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trend Chart */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h3 className="font-bold text-gray-700 mb-4 text-sm">Tren Pengeluaran Harian</h3>
                <div className="h-[200px] w-full -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={20}
                            />
                            <YAxis
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => val >= 1000 ? `${val / 1000}k` : val}
                            />
                            <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} />
                            <Area type="monotone" dataKey="amount" stroke="#8884d8" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={3} />
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

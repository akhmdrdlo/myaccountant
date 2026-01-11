import { useMemo, type ReactNode } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, AlertCircle, Activity, Wallet, Trophy, Rocket, ShieldCheck } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { Transaction } from '../../types';
import { format, parseISO } from 'date-fns';

interface AnalyticsViewProps {
    transactions: Transaction[];
    children?: ReactNode;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

export const AnalyticsView = ({ transactions, children }: AnalyticsViewProps) => {
    const { monthlyIncome, monthlyExpense, balance, getAccountBalances } = useFinanceStore();

    // 0. Net Worth & Health Logic
    // Health Score
    const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpense) / monthlyIncome : 0;
    const healthScore = monthlyIncome === 0
        ? (balance > 0 ? 50 : 0)
        : Math.min(100, Math.max(0, 60 + (savingsRate * 100)));

    const getHealthLabel = (score: number) => {
        if (score >= 80) return { label: "Sangat Sehat", color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" };
        if (score >= 60) return { label: "Sehat", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" };
        if (score >= 40) return { label: "Waspada", color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-900/20" };
        return { label: "Bahaya", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" };
    };
    const healthStatus = getHealthLabel(healthScore);

    // Net Worth Breakdown
    const netWorthData = useMemo(() => {
        let cash = 0;
        let bank = 0;
        // Check if helper exists (it should), otherwise derived from transactions if needed, but lets rely on store helper
        const balances = getAccountBalances ? getAccountBalances() : [];

        balances.forEach(acc => {
            const nameLower = acc.name.toLowerCase();
            if (nameLower.includes('cash') || nameLower.includes('tunai') || nameLower.includes('dompet')) {
                cash += acc.balance;
            } else {
                bank += acc.balance;
            }
        });
        return { cash, bank, total: cash + bank };
    }, [getAccountBalances, transactions]);

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

    // Logic: Wealth Level
    const getWealthLevel = (amount: number) => {
        if (amount < 8000000) return { level: "Pejuang Finansial", next: 8000000, icon: Activity };
        if (amount < 20000000) return { level: "Bertahan", next: 20000000, icon: ShieldCheck };
        if (amount < 45000000) return { level: "Aman", next: 45000000, icon: TrendingUp };
        return { level: "Sultan", next: 100000000, icon: Trophy };
    };

    const wealthInfo = getWealthLevel(netWorthData.total);
    const wealthProgress = Math.min(100, (netWorthData.total / wealthInfo.next) * 100);

    return (
        <div className="pb-24 px-1">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 px-2">Analisis Keuangan</h2>

            {/* Net Worth Card (Premium Design) */}
            <div className="bg-gradient-to-br from-brimo-primary to-blue-600 dark:from-black dark:to-gray-900 rounded-3xl p-6 text-white shadow-2xl shadow-blue-200 dark:shadow-none mb-6 relative overflow-hidden group transition-all">
                {/* Abstract Gold Shapes */}
                <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-white/20 rounded-xl border border-white/20 backdrop-blur-md">
                                <Wallet className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm font-medium text-blue-100 dark:text-white tracking-wide">Total Kekayaan</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
                            <span className="text-[10px] font-semibold text-white tracking-wider">PREMIUM</span>
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold mb-4 text-white tracking-tight">
                        {formatCurrency(netWorthData.total)}
                    </h2>

                    {/* Wealth Level Badge & Runway */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                            <Rocket className="w-4 h-4 text-orange-300" />
                            <div className="flex flex-col">
                                <span className="text-[8px] text-gray-400 dark:text-white uppercase font-bold">Runway</span>
                                <span className="text-xs font-bold font-mono">
                                    {(netWorthData.total / (monthlyExpense || 1)).toFixed(1)} Bln
                                </span>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <div className="flex flex-col">
                                <span className="text-[8px] text-gray-400 dark:text-white uppercase font-bold">Level</span>
                                <span className="text-xs font-bold">{wealthInfo.level}</span>
                            </div>
                        </div>
                    </div>

                    {/* Wealth Level Progress */}
                    <div className="mb-6">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] text-white-500 dark:text-white uppercase font-bold">Next Level ({formatCurrency(wealthInfo.next)})</span>
                            <span className="text-[10px] text-white-400 dark:text-white font-bold">{Math.round(wealthProgress)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 relative"
                                style={{ width: `${wealthProgress}%` }}
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px]" />
                            </div>
                        </div>
                    </div>

                    {/* Breakdown with Glassmorphism */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 hover:bg-white/10 transition-colors">
                            <p className="text-[10px] text-white-500 dark:text-white uppercase tracking-widest mb-1 font-bold">CASH</p>
                            <p className="font-bold text-base text-white-200">{formatCurrency(netWorthData.cash)}</p>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 hover:bg-white/10 transition-colors text-right">
                            <p className="text-[10px] text-white-500 dark:text-white uppercase tracking-widest mb-1 font-bold">BANK</p>
                            <p className="font-bold text-base text-gray-200">{formatCurrency(netWorthData.bank)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-brimo-primary to-blue-600 rounded-2xl p-5 text-white shadow-lg mb-6">
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
                                <AlertCircle className="w-4 h-4 text-yellow-300" />
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
                    <p className="text-[10px] text-gray-400 mt-1">
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
                                itemStyle={{ color: '#374151' }}
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
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" strokeOpacity={0.2} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={20}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => val >= 1000 ? `${val / 1000}k` : val}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                                itemStyle={{ color: '#374151' }}
                                formatter={(value: any) => formatCurrency(Number(value) || 0)}
                            />
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

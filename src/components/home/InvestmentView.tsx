import { useState } from 'react';
import { TrendingUp, TrendingDown, Plus, Wallet, Trash2, X, LineChart } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useGoogleSheets } from '../../hooks/useGoogleSheets';
import { cn } from '../../lib/utils';
import type { Investment } from '../../types';

export const InvestmentView = () => {
    const { investments, getInvestmentTotal, addTransactionOptimistic } = useFinanceStore();
    const { addInvestment, updateInvestment, deleteInvestment, addTransaction } = useGoogleSheets();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingInv, setEditingInv] = useState<Investment | undefined>(undefined);
    const [loading, setLoading] = useState(false);

    // Form states
    const [formData, setFormData] = useState<Partial<Investment>>({
        type: 'Reksadana',
        name: '',
        symbol: '',
        averagePrice: 0,
        totalUnits: 0,
        currentPrice: 0,
        color: '#6366f1'
    });

    const [syncWithAccount, setSyncWithAccount] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState('Bank BTN');

    const getAccountBalances = useFinanceStore(state => state.getAccountBalances);
    const accounts = getAccountBalances();

    const totalValue = getInvestmentTotal();
    const totalCost = investments.reduce((sum, inv) => sum + (inv.averagePrice * inv.totalUnits), 0);
    const totalProfit = totalValue - totalCost;
    const profitPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    const handleOpenForm = (inv?: Investment) => {
        if (inv) {
            setFormData(inv);
            setEditingInv(inv);
        } else {
            setFormData({
                type: 'Reksadana',
                name: '',
                symbol: '',
                averagePrice: 0,
                totalUnits: 0,
                currentPrice: 0,
                color: '#6366f1'
            });
            setEditingInv(undefined);
        }
        setSyncWithAccount(false);
        setIsFormOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;
        setLoading(true);

        const invPayload: Investment = {
            id: editingInv?.id || crypto.randomUUID(),
            name: formData.name,
            symbol: formData.symbol,
            type: formData.type || 'Lainnya',
            averagePrice: Number(formData.averagePrice) || 0,
            totalUnits: 1, // UX Simplified: User only enters Total Modal (averagePrice)
            currentPrice: Number(formData.currentPrice) || 0,
            color: formData.color || '#6366f1'
        };

        try {
            if (editingInv) {
                // Optimistic Local
                useFinanceStore.setState(state => ({
                    investments: state.investments.map(i => i.id === invPayload.id ? invPayload : i)
                }));
                await updateInvestment(invPayload);
            } else {
                useFinanceStore.setState(state => ({
                    investments: [...state.investments, invPayload]
                }));
                await addInvestment(invPayload);

                // Check sync
                if (syncWithAccount) {
                    const totalCostAdded = invPayload.averagePrice * invPayload.totalUnits;
                    const txId = crypto.randomUUID();
                    const tx = {
                        id: txId,
                        timestamp: new Date().toISOString(),
                        type: 'expense' as const,
                        category: 'Investasi',
                        amount: totalCostAdded,
                        description: `Beli ${invPayload.name}`,
                        account: selectedAccount,
                        status: 'pending' as const
                    };
                    addTransactionOptimistic(tx);
                    await addTransaction(tx);
                }
            }
            setIsFormOpen(false);
        } catch (error) {
            console.error("Failed to save investment", error);
            alert("Gagal menyimpan data investasi");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Hapus investasi ini?")) return;
        setLoading(true);
        try {
            useFinanceStore.setState(state => ({
                investments: state.investments.filter(i => i.id !== id)
            }));
            await deleteInvestment(id);
        } catch (err) {
            console.error("Delete failed", err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

    return (
        <div className="pb-32 px-4 pt-4 dark:bg-gray-900 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <LineChart className="w-6 h-6 text-brimo-primary dark:text-blue-400" />
                    Investasi
                </h1>
                <button
                    onClick={() => handleOpenForm()}
                    className="flex items-center gap-1 bg-brimo-primary hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" /> Tambah
                </button>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-5 mb-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                    <LineChart className="w-24 h-24" />
                </div>
                <div className="relative z-10">
                    <p className="text-indigo-100 text-sm font-medium mb-1">Total Nilai Portofolio</p>
                    <h2 className="text-3xl font-bold mb-4">{formatCurrency(totalValue)}</h2>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-indigo-100 text-xs mb-1">Modal Investasi</p>
                            <p className="font-semibold">{formatCurrency(totalCost)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-indigo-100 text-xs mb-1">Return Keseluruhan</p>
                            <div className={cn(
                                "flex items-center gap-1 font-semibold",
                                totalProfit >= 0 ? "text-emerald-300" : "text-rose-300"
                            )}>
                                {totalProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                {formatCurrency(Math.abs(totalProfit))} ({totalProfit >= 0 ? '+' : '-'}{Math.abs(profitPercentage).toFixed(2)}%)
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Investment List */}
            <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200">Aset Saya</h3>

                {investments.length === 0 ? (
                    <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <Wallet className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Belum ada portofolio</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Mulai catat investasi reksadana atau sahammu!</p>
                    </div>
                ) : (
                    investments.map(inv => {
                        const invValue = inv.currentPrice * inv.totalUnits;
                        const invCost = inv.averagePrice * inv.totalUnits;
                        const invProfit = invValue - invCost;

                        return (
                            <div key={inv.id} onClick={() => handleOpenForm(inv)} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-brimo-primary dark:hover:border-blue-500 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: inv.color || '#6366f1' }}>
                                            {inv.symbol ? inv.symbol.substring(0, 2).toUpperCase() : inv.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 dark:text-gray-100">{inv.name}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{inv.type}</p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={(e) => handleDelete(inv.id, e)} className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Nilai Saat Ini</p>
                                        <p className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(invValue)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Return</p>
                                        <p className={cn(
                                            "text-sm font-semibold flex items-center justify-end gap-1",
                                            invProfit >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                                        )}>
                                            {invProfit >= 0 ? '+' : '-'}{formatCurrency(Math.abs(invProfit))}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Modal Form */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                {editingInv ? 'Edit Investasi' : 'Tambah Investasi'}
                            </h2>
                            <button onClick={() => setIsFormOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto">
                            <form id="investment-form" onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Aset (Produk)</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brimo-primary dark:text-white"
                                        placeholder="Contoh: Reksa Dana Sucorinvest"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jenis Aset</label>
                                        <select
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brimo-primary dark:text-white"
                                        >
                                            <option value="Reksadana">Reksadana</option>
                                            <option value="Saham">Saham</option>
                                            <option value="Crypto">Crypto</option>
                                            <option value="SBN/Obligasi">SBN/Obligasi</option>
                                            <option value="Emas">Emas</option>
                                            <option value="Deposito">Deposito</option>
                                            <option value="Lainnya">Lainnya</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kode / Simbol</label>
                                        <input
                                            type="text"
                                            value={formData.symbol}
                                            onChange={e => setFormData({ ...formData, symbol: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brimo-primary dark:text-white"
                                            placeholder="Ex: BBCA (Opsional)"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Modal Investasi</label>
                                        <input
                                            required
                                            type="number"
                                            value={formData.averagePrice || ''}
                                            onChange={e => setFormData({ ...formData, averagePrice: Number(e.target.value) })}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brimo-primary dark:text-white"
                                            placeholder="Cth: 100000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nilai Saat Ini</label>
                                        <input
                                            required
                                            type="number"
                                            value={formData.currentPrice || ''}
                                            onChange={e => setFormData({ ...formData, currentPrice: Number(e.target.value) })}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brimo-primary dark:text-white font-semibold text-brimo-primary dark:text-blue-400"
                                            placeholder="Cth: 105000"
                                        />
                                    </div>
                                </div>

                                {!editingInv && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={syncWithAccount}
                                                onChange={e => setSyncWithAccount(e.target.checked)}
                                                className="w-4 h-4 text-brimo-primary rounded focus:ring-brimo-primary"
                                            />
                                            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Catat Pembelian ke Mutasi Rekening</span>
                                        </label>

                                        {syncWithAccount && (
                                            <div className="mt-3">
                                                <label className="block text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Sumber Rekening</label>
                                                <select
                                                    value={selectedAccount}
                                                    onChange={e => setSelectedAccount(e.target.value)}
                                                    className="w-full bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 text-sm outline-none dark:text-white"
                                                >
                                                    {accounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                                                </select>
                                                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1.5 flex flex-col gap-0.5">
                                                    <span>Transaksi jenis "Pengeluaran" sebesar {formatCurrency(formData.averagePrice || 0)} akan ditambahkan.</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="p-4 border-t border-gray-100 dark:border-gray-800 pb-safe">
                            <button
                                type="submit"
                                form="investment-form"
                                disabled={loading}
                                className="w-full bg-brimo-primary hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? 'Menyimpan...' : 'Simpan Investasi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

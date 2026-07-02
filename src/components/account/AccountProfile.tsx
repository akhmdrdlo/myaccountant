import { useState } from 'react';
import { toast } from 'sonner';
import { Moon, Sun, Download, Upload, Database, FileSpreadsheet, LogOut, Sparkles, X, Plus, Trash2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useThemeStore } from '../../store/useThemeStore';
import { localDb } from '../../services/localDb';

export const AccountProfile = () => {
    const { transactions, accounts, expenseCategories, incomeCategories, setMetadata } = useFinanceStore();
    const { theme, toggleTheme } = useThemeStore();

    // Key & Category states
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [categoryTab, setCategoryTab] = useState<'expense' | 'income'>('expense');
    const [newCategoryName, setNewCategoryName] = useState('');

    const rawMetadata = (localDb.loadAllData().metadata || { accounts: [], expenseCategories: [], incomeCategories: [] }) as any;
    const [apiKey, setApiKey] = useState(rawMetadata.alphaVantageKey || 'GWST0VV7BWSMK7AB');

    const handleSaveApiKey = (key: string) => {
        setApiKey(key);
        const currentMetadata = {
            ...rawMetadata,
            alphaVantageKey: key
        };
        localDb.saveMetadata(currentMetadata);
        setMetadata(currentMetadata);
    };

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        const catName = newCategoryName.trim();
        if (!catName) return;

        const currentMetadata = {
            ...rawMetadata,
            expenseCategories: [...expenseCategories],
            incomeCategories: [...incomeCategories]
        };

        if (categoryTab === 'expense') {
            if (currentMetadata.expenseCategories.includes(catName)) {
                toast.error('Kategori pengeluaran sudah ada!');
                return;
            }
            currentMetadata.expenseCategories.push(catName);
            toast.success(`Kategori pengeluaran "${catName}" berhasil ditambahkan!`);
        } else {
            if (currentMetadata.incomeCategories.includes(catName)) {
                toast.error('Kategori pemasukan sudah ada!');
                return;
            }
            currentMetadata.incomeCategories.push(catName);
            toast.success(`Kategori pemasukan "${catName}" berhasil ditambahkan!`);
        }

        localDb.saveMetadata(currentMetadata);
        setMetadata(currentMetadata);
        setNewCategoryName('');
    };

    const handleDeleteCategory = (catName: string) => {
        if (!confirm(`Hapus kategori "${catName}"?`)) return;

        const currentMetadata = {
            ...rawMetadata,
            expenseCategories: expenseCategories.filter((c: string) => c !== catName),
            incomeCategories: incomeCategories.filter((c: string) => c !== catName)
        };

        localDb.saveMetadata(currentMetadata);
        setMetadata(currentMetadata);
    };

    const handleExportJSON = () => {
        try {
            const dataStr = localDb.exportToJSON();
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rplanner_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error('Gagal mengekspor data: ' + err);
        }
    };

    const handleExportCSV = () => {
        try {
            const csvStr = localDb.exportToCSV();
            const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rplanner_transactions_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Transaksi berhasil diekspor ke CSV!');
        } catch (err) {
            toast.error('Gagal mengekspor data: ' + err);
        }
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (!content) return;

            let result;
            if (file.name.endsWith('.json') || content.trim().startsWith('{')) {
                result = localDb.importFromJSON(content);
            } else if (file.name.endsWith('.csv') || content.includes(',')) {
                result = localDb.importFromCSV(content);
            } else {
                toast.error('Format file tidak dikenali. Harap gunakan file JSON atau CSV.');
                return;
            }

            if (result.success) {
                toast.success(`Impor Berhasil!\n\n- Berhasil memasukkan: ${result.added} transaksi baru\n- Duplikat diabaikan: ${result.duplicates} transaksi\n\nHalaman akan disegarkan otomatis.`);
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                toast.error(`Gagal mengimpor file cadangan:\n${result.error}`);
            }
        };

        reader.readAsText(file);
    };

    // Stats
    const totalTransactions = transactions.length;
    const activeAccounts = accounts.length || 3;

    const activeUser = localStorage.getItem('myaccountant_username') || 'pengguna';

    const handleLogout = () => {
        localStorage.removeItem('myaccountant_token');
        localStorage.removeItem('myaccountant_username');
        localStorage.removeItem('myaccountant_mode');
        window.location.reload();
    };

    return (
        <div className="pb-24 pt-6 px-4 animate-in fade-in duration-200">
            {/* Header / Profile Card */}
            <div className="bg-gradient-to-br from-brimo-primary to-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 mb-6 relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="relative mb-4 group">
                        <div className="w-24 h-24 rounded-full p-1 bg-white/20 backdrop-blur-sm">
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(activeUser)}&background=0284c7&color=fff&size=128`}
                                alt="Profile"
                                className="w-full h-full rounded-full object-cover border-2 border-white shadow-lg"
                            />
                        </div>
                        <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-blue-600" />
                    </div>

                    <h2 className="text-xl font-bold mb-1 capitalize">{activeUser}</h2>
                    <p className="text-blue-100 text-xs font-semibold bg-white/10 px-3 py-1 rounded-full backdrop-blur-md mb-6">
                        Pengguna Aktif Rplanner
                    </p>

                    {/* Mini Stats */}
                    <div className="grid grid-cols-2 gap-4 w-full border-t border-white/20 pt-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold">{totalTransactions}</p>
                            <p className="text-[10px] text-blue-100 uppercase tracking-wider opacity-80">Transaksi</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">{activeAccounts}</p>
                            <p className="text-[10px] text-blue-100 uppercase tracking-wider opacity-80">Akun Aktif</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content List */}
            <div className="space-y-4">
                {/* Theme Toggle */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center transition-colors">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-orange-100 text-orange-500'}`}>
                            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Mode Tampilan</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{theme === 'dark' ? 'Gelap (Dark Mode)' : 'Terang (Light Mode)'}</p>
                        </div>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${theme === 'dark' ? 'bg-indigo-500' : 'bg-gray-300'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Kelola Kategori */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-100 text-orange-500 dark:bg-orange-950/20 dark:text-orange-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Kelola Kategori</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Atur kategori pemasukan & pengeluaran</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="px-4 py-2 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-900/30 dark:text-orange-400 text-orange-600 font-bold rounded-xl text-xs transition active:scale-95"
                    >
                        Kelola
                    </button>
                </div>

                {/* Alpha Vantage API Key */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                        🔑 Alpha Vantage API Key
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                        Masukkan API Key Alpha Vantage Anda untuk sinkronisasi harga investasi/saham terkini secara real-time.
                    </p>
                    <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => handleSaveApiKey(e.target.value)}
                        placeholder="Contoh: GWST0VV7BWSMK7AB"
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-brimo-primary dark:text-white"
                    />
                </div>

                {/* Backup & Recovery Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                    <h3 className="text-md font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-500" />
                        Cadangkan & Pulihkan Data
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                        Simpan cadangan data finansial Anda (transaksi, anggaran, langganan, dll.) secara lokal atau pulihkan dari file sebelumnya.
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                            onClick={handleExportJSON}
                            className="flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-900/50 rounded-xl text-blue-600 dark:text-blue-400 transition hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Download className="w-5 h-5 mb-1.5" />
                            <span className="text-[10px] font-bold">Ekspor JSON</span>
                            <span className="text-[8px] opacity-75">Cadangan Penuh</span>
                        </button>

                        <button
                            onClick={handleExportCSV}
                            className="flex flex-col items-center justify-center p-3 bg-green-50 hover:bg-green-100 dark:bg-green-950/20 dark:hover:bg-green-900/30 border border-green-100 dark:border-green-900/50 rounded-xl text-green-600 dark:text-green-400 transition hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <FileSpreadsheet className="w-5 h-5 mb-1.5" />
                            <span className="text-[10px] font-bold">Ekspor CSV</span>
                            <span className="text-[8px] opacity-75">Buka di Excel</span>
                        </button>
                    </div>

                    <div>
                        <label className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                            <Upload className="w-4 h-4 text-gray-400 animate-pulse" />
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Impor Cadangan (JSON / CSV)</span>
                            <input
                                type="file"
                                accept=".json,.csv"
                                onChange={handleImportFile}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>

                {/* Logout Button */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-red-100 text-red-500 dark:bg-red-950/20 dark:text-red-400">
                            <LogOut className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Keluar dari Akun</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Keluar dari sesi aktif Anda</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:hover:bg-red-900/30 dark:text-red-400 font-bold rounded-xl text-xs transition active:scale-95"
                    >
                        Keluar
                    </button>
                </div>
            </div>

            {/* Kelola Kategori Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-[95%] sm:max-w-md rounded-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Kelola Kategori</h3>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 dark:border-gray-800 p-2 gap-2">
                            <button
                                onClick={() => setCategoryTab('expense')}
                                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${categoryTab === 'expense' ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-850'}`}
                            >
                                Pengeluaran
                            </button>
                            <button
                                onClick={() => setCategoryTab('income')}
                                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${categoryTab === 'income' ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-850'}`}
                            >
                                Pemasukan
                            </button>
                        </div>

                        {/* List Area */}
                        <div className="p-4 flex-1 overflow-y-auto space-y-2 max-h-[45vh]">
                            {(categoryTab === 'expense' ? expenseCategories : incomeCategories).map((catName: string) => (
                                <div key={catName} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-250">{catName}</span>
                                    <button
                                        onClick={() => handleDeleteCategory(catName)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Form Tambah */}
                        <form onSubmit={handleAddCategory} className="p-4 border-t border-gray-100 dark:border-gray-800 pb-safe flex gap-2">
                            <input
                                required
                                type="text"
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                placeholder={`Tambah kategori ${categoryTab === 'expense' ? 'pengeluaran' : 'pemasukan'}...`}
                                className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-brimo-primary dark:text-white"
                            />
                            <button
                                type="submit"
                                className="bg-brimo-primary hover:bg-blue-700 text-white p-2.5 rounded-xl transition active:scale-95 flex items-center justify-center"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

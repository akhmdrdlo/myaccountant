import { Moon, Sun, Download, Upload, Database, FileSpreadsheet, LogOut } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useThemeStore } from '../../store/useThemeStore';
import { localDb } from '../../services/localDb';

export const AccountProfile = () => {
    const { transactions, accounts } = useFinanceStore();
    const { theme, toggleTheme } = useThemeStore();

    const handleExportJSON = () => {
        try {
            const dataStr = localDb.exportToJSON();
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `myaccountant_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Gagal mengekspor data: ' + err);
        }
    };

    const handleExportCSV = () => {
        try {
            const csvStr = localDb.exportToCSV();
            const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `myaccountant_transactions_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Gagal mengekspor data: ' + err);
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
                alert('Format file tidak dikenali. Harap gunakan file JSON atau CSV.');
                return;
            }

            if (result.success) {
                alert(`Impor Berhasil!\n\n- Berhasil memasukkan: ${result.added} transaksi baru\n- Duplikat diabaikan: ${result.duplicates} transaksi\n\nHalaman akan disegarkan otomatis.`);
                window.location.reload();
            } else {
                alert(`Gagal mengimpor file cadangan:\n${result.error}`);
            }
        };

        reader.readAsText(file);
    };

    // Mock stats
    const totalTransactions = transactions.length;
    const activeAccounts = accounts.length || 4;

    const activeUser = localStorage.getItem('myaccountant_username') || 'pengguna';

    const handleLogout = () => {
        localStorage.removeItem('myaccountant_token');
        localStorage.removeItem('myaccountant_username');
        localStorage.removeItem('myaccountant_mode');
        window.location.reload();
    };

    return (
        <div className="pb-24 pt-6 px-4">
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

            {/* LinkedIn Style Content */}
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
            </div>
        </div>
    );
};

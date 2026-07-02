import { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AuthScreenProps {
    onSuccess: (username: string) => void;
}

export const AuthScreen = ({ onSuccess }: AuthScreenProps) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Basic Validations
        if (username.trim().length < 3) {
            setError('Username minimal 3 karakter.');
            return;
        }
        if (password.length < 5) {
            setError('Kata sandi minimal 5 karakter.');
            return;
        }

        setLoading(true);

        // Simulate a tiny delay for high-end feel
        await new Promise(resolve => setTimeout(resolve, 300));

        const normalizedUser = username.trim().toLowerCase();
        const localUsersJson = localStorage.getItem('myaccountant_local_users');
        const localUsers: Record<string, string> = localUsersJson ? JSON.parse(localUsersJson) : {};

        if (isLogin) {
            if (!localUsers[normalizedUser]) {
                setError('Akun tidak ditemukan. Silakan daftar terlebih dahulu.');
                setLoading(false);
                return;
            }
            if (localUsers[normalizedUser] !== password) {
                setError('Kata sandi salah.');
                setLoading(false);
                return;
            }
        } else {
            if (localUsers[normalizedUser]) {
                setError('Username sudah terdaftar.');
                setLoading(false);
                return;
            }
            localUsers[normalizedUser] = password;
            localStorage.setItem('myaccountant_local_users', JSON.stringify(localUsers));
        }

        // Success: Login in local/offline mode
        localStorage.setItem('myaccountant_token', 'local_offline_token');
        localStorage.setItem('myaccountant_username', username.trim());
        localStorage.setItem('myaccountant_mode', 'offline');

        setUsername('');
        setPassword('');
        setLoading(false);
        onSuccess(username.trim());
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors">
            {/* Elegant Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-br from-brimo-primary via-blue-700 to-blue-900 rounded-b-[40px] -z-10 shadow-lg shadow-blue-100 dark:shadow-none" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
            <div className="absolute bottom-10 left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />

            <div className="w-full max-w-sm flex flex-col items-center z-10">
                {/* Logo Area */}
                <div className="mb-6 p-4 bg-white/10 dark:bg-white/5 backdrop-blur-md rounded-full shadow-inner border border-white/20">
                    <img src="/banklogo.png" alt="Logo" className="w-14 h-14 object-contain" onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=Rplanner&background=0284c7&color=fff";
                    }} />
                </div>

                <h1 className="text-white text-2xl font-bold tracking-wider mb-2">Rplanner</h1>
                <p className="text-blue-100 text-xs opacity-90 mb-8 text-center font-medium">Manajemen Keuangan Personal Aman & Privat</p>

                {/* Form Card */}
                <div className="bg-white dark:bg-gray-900 w-full rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-800 transition-colors">
                    {/* Tabs */}
                    <div className="flex gap-2 p-1 bg-gray-50 dark:bg-gray-950 rounded-xl mb-6 border border-gray-150 dark:border-gray-850">
                        <button
                            onClick={() => { setIsLogin(true); setError(null); }}
                            className={cn(
                                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                isLogin ? "bg-white dark:bg-gray-800 text-brimo-primary dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-800"
                            )}
                        >
                            Masuk
                        </button>
                        <button
                            onClick={() => { setIsLogin(false); setError(null); }}
                            className={cn(
                                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                !isLogin ? "bg-white dark:bg-gray-800 text-brimo-primary dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-800"
                            )}
                        >
                            Daftar
                        </button>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold animate-shake">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-600 dark:text-gray-400 mb-1 block">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Masukkan username..."
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brimo-primary dark:focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-600 dark:text-gray-400 mb-1 block">Kata Sandi</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brimo-primary dark:focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 py-3 bg-brimo-primary hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-100 dark:shadow-none flex items-center justify-center gap-2 transition active:scale-95 text-sm"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>{isLogin ? 'Masuk Sekarang' : 'Daftar Akun Baru'}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Security Info */}
                <div className="mt-8 flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span>Enkripsi scrypt & Sesi Aman HMAC-SHA256</span>
                </div>
            </div>
        </div>
    );
};

import { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck, Mail, Phone } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface AuthScreenProps {
    onSuccess: (username: string) => void;
}

export const AuthScreen = ({ onSuccess }: AuthScreenProps) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [emailInput, setEmailInput] = useState('');
    const [phoneInput, setPhoneInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const cleanUsername = username.trim();

        // Basic Validations
        if (cleanUsername.length < 3) {
            setError('Username minimal 3 karakter.');
            return;
        }
        if (password.length < 5) {
            setError('Kata sandi minimal 5 karakter.');
            return;
        }

        setLoading(true);

        try {
            // Main auth identifier
            const primaryEmail = `${cleanUsername.toLowerCase()}@rplanner.com`;

            if (isLogin) {
                const { data, error: authError } = await supabase.auth.signInWithPassword({
                    email: primaryEmail,
                    password
                });

                if (authError) {
                    setError('Gagal masuk. Periksa kembali username dan kata sandi Anda.');
                    setLoading(false);
                    return;
                }

                // Retrieve display name from profiles if exists, fallback to display name from auth
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', data.user?.id)
                    .single();

                localStorage.setItem('rplanner_token', data.session?.access_token || 'supabase_token');
                localStorage.setItem('rplanner_username', profile?.username || data.user?.user_metadata?.display_name || cleanUsername);
                localStorage.setItem('rplanner_mode', 'online');
            } else {
                // SIGN UP FLOW

                // 1. Check duplicate username first in 'profiles'
                const { data: existingProfiles, error: profileCheckError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', cleanUsername.toLowerCase());

                if (profileCheckError) {
                    setError('Gagal memvalidasi username. Silakan coba lagi.');
                    setLoading(false);
                    return;
                }

                if (existingProfiles && existingProfiles.length > 0) {
                    setError('Username sudah terdaftar. Silakan pilih username lain.');
                    setLoading(false);
                    return;
                }

                // 2. Call Supabase Sign Up
                const { data, error: authError } = await supabase.auth.signUp({
                    email: primaryEmail,
                    password,
                    options: {
                        data: {
                            display_name: cleanUsername
                        }
                    }
                });

                if (authError) {
                    setError(authError.message || 'Gagal mendaftar akun baru.');
                    setLoading(false);
                    return;
                }

                // 3. Create profile entry if user creation was successful
                if (data.user) {
                    const { error: profileInsertError } = await supabase
                        .from('profiles')
                        .insert([
                            {
                                id: data.user.id,
                                username: cleanUsername.toLowerCase(),
                                email: emailInput.trim() || null,
                                phone: phoneInput.trim() || null,
                                avatar_url: null
                            }
                        ]);

                    if (profileInsertError) {
                        console.error("Failed to insert profile record:", profileInsertError);
                    }

                    if (data.session) {
                        localStorage.setItem('rplanner_token', data.session.access_token);
                        localStorage.setItem('rplanner_username', cleanUsername);
                        localStorage.setItem('rplanner_mode', 'online');
                    } else {
                        setError('Pendaftaran berhasil! Silakan hubungi admin atau coba login.');
                        setLoading(false);
                        return;
                    }
                } else {
                    setError('Pendaftaran gagal. User tidak terbuat.');
                    setLoading(false);
                    return;
                }
            }

            setUsername('');
            setPassword('');
            setEmailInput('');
            setPhoneInput('');
            setLoading(false);
            onSuccess(cleanUsername);
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan sistem.');
            setLoading(false);
        }
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

                        {/* Optional Email (Only for SignUp) */}
                        {!isLogin && (
                            <>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-600 dark:text-gray-400 mb-1 block">Email (Opsional)</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="email"
                                            value={emailInput}
                                            onChange={(e) => setEmailInput(e.target.value)}
                                            placeholder="contoh@domain.com"
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brimo-primary dark:focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-600 dark:text-gray-400 mb-1 block">No. Telepon (Opsional)</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="tel"
                                            value={phoneInput}
                                            onChange={(e) => setPhoneInput(e.target.value)}
                                            placeholder="0812xxxxxx"
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brimo-primary dark:focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

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

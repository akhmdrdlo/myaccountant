import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Brain, Bell, CalendarDays, Camera, ChevronRight, Download, FileUp, Fingerprint, Lightbulb, LogOut, Tags, Wallet, X, Plus, Trash2 } from 'lucide-react';
import { AI_ENABLED } from '../../lib/ai';
import { clearLocalUserData } from '../../lib/session';
import { disableLock, enableLock, isBiometricAvailable, isLockEnabled } from '../../lib/appLock';
import { useFinanceStore } from '../../store/useFinanceStore';
import { localDb } from '../../services/localDb';
import { supabase } from '../../lib/supabase';
import { useSupabase } from '../../hooks/useSupabase';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../lib/categories';
import { cn } from '../../lib/utils';

interface AccountProfileProps {
    onOpenView?: (view: string) => void;
    onSetPayday?: () => void;
}

export const AccountProfile = ({ onOpenView, onSetPayday }: AccountProfileProps) => {
    const { transactions, accounts, expenseCategories, incomeCategories, setMetadata } = useFinanceStore();
    const { fetchProfile, updateProfile } = useSupabase();

    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [categoriesOpen, setCategoriesOpen] = useState(false);
    const [lockOn, setLockOn] = useState(isLockEnabled);
    const [canLock, setCanLock] = useState(false);
    const payday = useFinanceStore(st => st.payday);

    useEffect(() => { isBiometricAvailable().then(setCanLock); }, []);

    const toggleLock = async () => {
        if (lockOn) {
            disableLock();
            setLockOn(false);
            toast.success('Kunci dimatikan.');
            return;
        }
        try {
            if (await enableLock(activeUser)) {
                setLockOn(true);
                toast.success('Rplanner akan minta sidik jari setiap dibuka.');
            }
        } catch {
            toast.error('Gagal mengaktifkan. Pastikan sidik jari/wajah atau PIN layar sudah diatur di HP.');
        }
    };

    const rawMetadata = (localDb.loadAllData().metadata || {}) as Record<string, unknown>;
    const [apiKey, setApiKey] = useState(String(rawMetadata.alphaVantageKey ?? ''));

    const activeUser = localStorage.getItem('rplanner_username') || 'pengguna';
    const initials = activeUser.slice(0, 2).toUpperCase();

    useEffect(() => {
        fetchProfile().then(data => {
            if (!data) return;
            setEmail(data.email || '');
            setPhone(data.phone || '');
            setAvatarUrl(data.avatar_url || null);
        });
    }, [fetchProfile]);

    /** Simpan metadata lokal (kategori, API key) TANPA menimpa daftar akun dari Supabase. */
    const saveLocalMeta = (patch: Record<string, unknown>) => {
        const next = {
            ...rawMetadata,
            accounts: useFinanceStore.getState().accounts,
            expenseCategories: useFinanceStore.getState().expenseCategories,
            incomeCategories: useFinanceStore.getState().incomeCategories,
            ...patch,
        };
        localDb.saveMetadata(next as never);
        setMetadata(next);
    };

    const handleAvatar = async (file: File) => {
        if (file.size > 5 * 1024 * 1024) return toast.error('Foto maksimal 5MB.');
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 300 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const url = canvas.toDataURL('image/jpeg', 0.75);
        setAvatarUrl(url);
        const ok = await updateProfile({ email: email.trim() || undefined, phone: phone.trim() || undefined, avatar_url: url });
        toast[ok ? 'success' : 'error'](ok ? 'Foto profil diperbarui.' : 'Gagal menyimpan foto.');
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const ok = await updateProfile({ email: email.trim() || undefined, phone: phone.trim() || undefined, avatar_url: avatarUrl || undefined });
        setSaving(false);
        toast[ok ? 'success' : 'error'](ok ? 'Profil disimpan.' : 'Gagal menyimpan profil.');
    };

    /** Ekspor dari data yang tampil di aplikasi (sumbernya Supabase), bukan salinan localStorage. */
    const handleExportCSV = () => {
        const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = [
            ['Tanggal', 'Jenis', 'Kategori', 'Nominal', 'Dompet', 'Catatan'],
            ...transactions
                .filter(t => t.status !== 'failed')
                .map(t => [new Date(t.timestamp).toLocaleString('id-ID'), t.type === 'income' ? 'Masuk' : t.type === 'expense' ? 'Keluar' : t.type, t.category, t.amount, t.account, t.description]),
        ];
        const csv = '﻿' + rows.map(r => r.map(esc).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `rplanner_transaksi_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${rows.length - 1} transaksi diekspor.`);
    };

    const handleLogout = async () => {
        if (!window.confirm('Keluar dari akun di perangkat ini?')) return;
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Sign out error:', err);
        }
        await clearLocalUserData();
        window.location.reload();
    };

    const field = 'mt-1 w-full h-11 px-3 rounded-xl bg-rp-canvas border border-rp-line text-sm text-rp-ink placeholder:text-rp-ink-2';

    return (
        <div className="space-y-6">
            {/* Identitas */}
            <section className="flex items-center gap-4">
                <label className="relative shrink-0 cursor-pointer" aria-label="Ganti foto profil">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                    ) : (
                        <span className="w-16 h-16 rounded-2xl bg-blue-800 text-white text-xl font-bold flex items-center justify-center">{initials}</span>
                    )}
                    <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-rp-surface border border-rp-line flex items-center justify-center text-rp-ink-2">
                        <Camera className="w-3.5 h-3.5" />
                    </span>
                    <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleAvatar(f); }} />
                </label>
                <div className="min-w-0">
                    <h1 className="text-xl font-bold text-rp-ink truncate">{activeUser}</h1>
                    <p className="text-sm text-rp-ink-2">{accounts.length} dompet · {transactions.length} transaksi</p>
                </div>
            </section>

            {/* Pengaturan */}
            <section>
                <h2 className="rp-section-title mb-2">Pengaturan</h2>
                <ul className="rp-card divide-y divide-rp-line overflow-hidden">
                    <Row icon={Wallet} label="Dompet" hint="Kantong, bank, dan e-wallet" onClick={() => onOpenView?.('dompet')} />
                    {AI_ENABLED && <Row icon={Brain} label="Yang AI tahu tentangku" hint="Memori untuk Tanya AI" onClick={() => onOpenView?.('memori')} />}
                    <Row icon={Bell} label="Notifikasi & catat otomatis" hint="Pengingat, push, catat dari notifikasi bank" onClick={() => onOpenView?.('notifikasi')} />
                    <Row icon={Tags} label="Kategori" hint={`${(expenseCategories.length || EXPENSE_CATEGORIES.length) + (incomeCategories.length || INCOME_CATEGORIES.length)} kategori`} onClick={() => setCategoriesOpen(true)} />
                    <Row icon={CalendarDays} label="Tanggal gajian" hint={payday === 1 ? 'Awal bulan (tanggal 1)' : `Tanggal ${payday}`} onClick={() => onSetPayday?.()} />
                    {canLock && (
                        <li>
                            <button onClick={toggleLock} role="switch" aria-checked={lockOn} className="w-full flex items-center gap-3 px-4 min-h-[60px] text-left hover:bg-rp-surface-2 transition">
                                <Fingerprint className="w-5 h-5 text-rp-royal shrink-0" />
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold text-rp-ink">Kunci dengan sidik jari</span>
                                    <span className="block text-xs text-rp-ink-2">Minta sidik jari/wajah saat aplikasi dibuka</span>
                                </span>
                                <span className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0', lockOn ? 'bg-rp-royal' : 'bg-gray-300 dark:bg-gray-600')}>
                                    <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', lockOn && 'translate-x-5')} />
                                </span>
                            </button>
                        </li>
                    )}
                </ul>
            </section>

            <section>
                <h2 className="rp-section-title mb-2">Data</h2>
                <ul className="rp-card divide-y divide-rp-line overflow-hidden">
                    <Row icon={FileUp} label="Impor mutasi rekening" hint="Isi riwayat lama dari file CSV bank" onClick={() => onOpenView?.('impor')} />
                    <Row icon={Download} label="Ekspor transaksi (CSV)" hint="Bisa dibuka di Excel / Google Sheets" onClick={handleExportCSV} />
                    <Row icon={Lightbulb} label="Tips keuangan" onClick={() => onOpenView?.('tips')} />
                </ul>
            </section>

            {/* Kontak */}
            <section>
                <h2 className="rp-section-title mb-2">Kontak</h2>
                <form onSubmit={handleSaveProfile} className="rp-card p-4 space-y-3">
                    <label className="block text-sm font-medium text-rp-ink">
                        Email
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" className={field} />
                    </label>
                    <label className="block text-sm font-medium text-rp-ink">
                        Nomor HP
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" className={field} />
                    </label>
                    <button type="submit" disabled={saving} className="w-full h-11 rounded-xl bg-rp-surface-2 text-rp-royal text-sm font-semibold disabled:opacity-60">
                        {saving ? 'Menyimpan…' : 'Simpan kontak'}
                    </button>
                </form>
            </section>

            {/* Lanjutan */}
            <details className="rp-card group">
                <summary className="flex items-center justify-between min-h-[52px] px-4 cursor-pointer list-none text-sm font-semibold text-rp-ink">
                    Lanjutan
                    <ChevronRight className="w-4 h-4 text-rp-ink-2 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-4 pb-4">
                    <label className="block text-sm font-medium text-rp-ink">
                        API key Alpha Vantage
                        <input value={apiKey} onChange={e => { setApiKey(e.target.value); saveLocalMeta({ alphaVantageKey: e.target.value }); }}
                            placeholder="Kosongkan untuk memakai bawaan" className={cn(field, 'font-mono')} />
                    </label>
                    <p className="mt-1 text-xs text-rp-ink-2">Untuk update harga saham di menu Investasi. Daftar gratis di alphavantage.co.</p>
                </div>
            </details>

            <button onClick={handleLogout} className="w-full h-12 rounded-xl border border-rp-line text-rp-out font-semibold flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" /> Keluar
            </button>

            {categoriesOpen && (
                <CategorySheet
                    expense={expenseCategories.length ? expenseCategories : EXPENSE_CATEGORIES}
                    income={incomeCategories.length ? incomeCategories : INCOME_CATEGORIES}
                    onChange={(expense, income) => saveLocalMeta({ expenseCategories: expense, incomeCategories: income })}
                    onClose={() => setCategoriesOpen(false)}
                />
            )}
        </div>
    );
};

const Row = ({ icon: Icon, label, hint, onClick }: { icon: typeof Wallet; label: string; hint?: string; onClick: () => void }) => (
    <li>
        <button onClick={onClick} className="w-full flex items-center gap-3 px-4 min-h-[60px] text-left hover:bg-rp-surface-2 transition">
            <Icon className="w-5 h-5 text-rp-royal shrink-0" />
            <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-rp-ink">{label}</span>
                {hint && <span className="block text-xs text-rp-ink-2 truncate">{hint}</span>}
            </span>
            <ChevronRight className="w-4 h-4 text-rp-ink-2" />
        </button>
    </li>
);

const CategorySheet = ({ expense, income, onChange, onClose }: {
    expense: string[];
    income: string[];
    onChange: (expense: string[], income: string[]) => void;
    onClose: () => void;
}) => {
    const [tab, setTab] = useState<'expense' | 'income'>('expense');
    const [name, setName] = useState('');
    const list = tab === 'expense' ? expense : income;
    const builtIn = new Set(tab === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES);

    const add = (e: React.FormEvent) => {
        e.preventDefault();
        const clean = name.trim();
        if (!clean) return;
        if (list.some(c => c.toLowerCase() === clean.toLowerCase())) return toast.error('Kategori sudah ada.');
        if (tab === 'expense') onChange([...expense, clean], income);
        else onChange(expense, [...income, clean]);
        setName('');
    };

    const remove = (c: string) => {
        if (!window.confirm(`Hapus kategori "${c}"? Transaksi lama tetap memakai nama ini.`)) return;
        if (tab === 'expense') onChange(expense.filter(x => x !== c), income);
        else onChange(expense, income.filter(x => x !== c));
    };

    return (
        <>
            <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-label="Kelola kategori"
                className="fixed inset-x-0 bottom-0 z-[70] max-w-md mx-auto bg-rp-surface rounded-t-3xl max-h-[85vh] flex flex-col p-4 pb-safe">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-rp-ink">Kategori</h2>
                    <button onClick={onClose} aria-label="Tutup" className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl hover:bg-rp-surface-2"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-2 p-1 bg-rp-canvas rounded-xl mb-3">
                    {(['expense', 'income'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={cn('min-h-[40px] rounded-lg text-sm font-semibold', tab === t ? 'bg-rp-surface text-rp-ink shadow-rp-1' : 'text-rp-ink-2')}>
                            {t === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                        </button>
                    ))}
                </div>
                <ul className="flex-1 overflow-y-auto divide-y divide-rp-line">
                    {list.map(c => (
                        <li key={c} className="flex items-center justify-between min-h-[48px]">
                            <span className="text-sm text-rp-ink">{c}</span>
                            {builtIn.has(c)
                                ? <span className="text-xs text-rp-ink-2">bawaan</span>
                                : <button onClick={() => remove(c)} aria-label={`Hapus ${c}`} className="w-10 h-10 flex items-center justify-center text-rp-out rounded-lg hover:bg-rp-out-soft"><Trash2 className="w-4 h-4" /></button>}
                        </li>
                    ))}
                </ul>
                <form onSubmit={add} className="flex gap-2 pt-3">
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Kategori baru" className="flex-1 h-11 px-3 rounded-xl bg-rp-canvas border border-rp-line text-sm text-rp-ink" />
                    <button type="submit" aria-label="Tambah kategori" className="w-11 h-11 rounded-xl bg-rp-action text-white flex items-center justify-center"><Plus className="w-5 h-5" /></button>
                </form>
            </div>
        </>
    );
};


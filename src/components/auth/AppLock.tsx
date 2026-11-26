import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Fingerprint } from 'lucide-react';
import { markActive, shouldLock, unlock } from '../../lib/appLock';
import { supabase } from '../../lib/supabase';
import { clearLocalUserData } from '../../lib/session';

/** Membungkus aplikasi: tampilkan layar kunci saat dibuka atau setelah ditinggal > 1 menit. */
export const AppLock = ({ children }: { children: ReactNode }) => {
    const [locked, setLocked] = useState(shouldLock);
    const [failed, setFailed] = useState(false);

    const tryUnlock = useCallback(async () => {
        setFailed(false);
        if (await unlock()) setLocked(false);
        else setFailed(true);
    }, []);

    useEffect(() => {
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') markActive();
            else if (shouldLock()) setLocked(true);
        };
        document.addEventListener('visibilitychange', onVisibility);
        const tick = window.setInterval(() => document.visibilityState === 'visible' && !locked && markActive(), 15_000);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.clearInterval(tick);
        };
    }, [locked]);

    // Langsung minta sidik jari saat layar kunci muncul
    useEffect(() => {
        if (locked) tryUnlock();
    }, [locked, tryUnlock]);

    if (!locked) return <>{children}</>;

    return (
        <div className="min-h-screen bg-rp-canvas flex flex-col items-center justify-center p-6 text-center">
            <img src="/banklogo.png" alt="" className="w-12 h-12 object-contain" />
            <h1 className="mt-4 text-xl font-bold text-rp-ink">Rplanner terkunci</h1>
            <p className="mt-1 text-sm text-rp-ink-2">Buka dengan sidik jari, wajah, atau PIN layar HP-mu.</p>
            <button onClick={tryUnlock} className="mt-8 w-20 h-20 rounded-2xl bg-rp-surface border border-rp-line text-rp-royal flex items-center justify-center shadow-rp-1 active:scale-95 transition" aria-label="Buka kunci">
                <Fingerprint className="w-10 h-10" />
            </button>
            {failed && <p className="mt-4 text-sm text-rp-out">Belum berhasil. Ketuk ikon untuk coba lagi.</p>}
            <button
                onClick={async () => {
                    if (!window.confirm('Keluar dan masuk lagi dengan username & kata sandi?')) return;
                    await clearLocalUserData();
                    await supabase.auth.signOut();
                    localStorage.removeItem('rplanner_lock_credential');
                    window.location.reload();
                }}
                className="mt-10 h-11 px-4 text-sm font-semibold text-rp-ink-2 underline underline-offset-4"
            >
                Masuk pakai kata sandi
            </button>
        </div>
    );
};

import { Sun, Moon, Bell } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';

interface TopBarProps {
    onOpenNotifications?: () => void;
    pendingCount?: number;
}

export const TopBar = ({ onOpenNotifications, pendingCount = 0 }: TopBarProps) => {
    const { theme, toggleTheme } = useThemeStore();
    const isDarkMode = theme === 'dark';

    return (
        <header className="sticky top-0 z-40 w-full flex justify-between items-center h-14 px-4 bg-rp-surface/95 backdrop-blur border-b border-rp-line">
            <div className="flex items-center gap-2">
                <img src="/banklogo.png" alt="" className="w-7 h-7 object-contain" />
                <span className="text-lg font-bold tracking-tight text-rp-navy">Rplanner</span>
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={onOpenNotifications}
                    aria-label={pendingCount > 0 ? `Notifikasi, ${pendingCount} transaksi menunggu konfirmasi` : 'Notifikasi & catat otomatis'}
                    className="relative w-11 h-11 flex items-center justify-center rounded-xl text-rp-ink-2 hover:bg-rp-surface-2 hover:text-rp-royal transition"
                >
                    <Bell className="w-5 h-5" />
                    {pendingCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rp-action text-white text-[11px] font-bold leading-[18px] text-center rp-num">
                            {pendingCount > 9 ? '9+' : pendingCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={toggleTheme}
                    aria-label={isDarkMode ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
                    className="w-11 h-11 flex items-center justify-center rounded-xl text-rp-ink-2 hover:bg-rp-surface-2 hover:text-rp-royal transition"
                >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
            </div>
        </header>
    );
};

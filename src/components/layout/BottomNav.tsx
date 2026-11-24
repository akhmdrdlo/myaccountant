import { Home, ReceiptText, User, PieChart, Plus, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItemDef {
    id: string;
    label: string;
    icon: LucideIcon;
}

const NAV_ITEMS: NavItemDef[] = [
    { id: 'home', label: 'Beranda', icon: Home },
    { id: 'mutasi', label: 'Mutasi', icon: ReceiptText },
    { id: 'analytics', label: 'Analisis', icon: PieChart },
    { id: 'akun', label: 'Akun', icon: User },
];

interface BottomNavProps {
    activeTab: string;
    onTabChange: (id: string) => void;
    onFabClick?: () => void;
}

export const BottomNav = ({ activeTab, onTabChange, onFabClick }: BottomNavProps) => {
    return (
        <nav
            aria-label="Navigasi utama"
            className="fixed bottom-0 inset-x-0 z-50 bg-rp-surface/95 backdrop-blur border-t border-rp-line pb-safe"
        >
            <div className="max-w-md mx-auto grid grid-cols-5 items-end px-2 pt-1.5">
                <NavItem item={NAV_ITEMS[0]} activeTab={activeTab} onTabChange={onTabChange} />
                <NavItem item={NAV_ITEMS[1]} activeTab={activeTab} onTabChange={onTabChange} />

                <div className="flex flex-col items-center -mt-6">
                    <button
                        onClick={onFabClick}
                        aria-label="Catat transaksi baru"
                        className="w-14 h-14 rounded-2xl bg-rp-action hover:bg-rp-action-press text-white flex items-center justify-center shadow-rp-2 ring-4 ring-rp-canvas transition-transform active:scale-95"
                    >
                        <Plus className="w-7 h-7" strokeWidth={2.5} />
                    </button>
                    <span className="mt-1 text-[11px] font-semibold text-rp-ink-2">Catat</span>
                </div>

                <NavItem item={NAV_ITEMS[2]} activeTab={activeTab} onTabChange={onTabChange} />
                <NavItem item={NAV_ITEMS[3]} activeTab={activeTab} onTabChange={onTabChange} />
            </div>
        </nav>
    );
};

const NavItem = ({ item, activeTab, onTabChange }: { item: NavItemDef; activeTab: string; onTabChange: (id: string) => void }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
        <button
            onClick={() => onTabChange(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className="flex flex-col items-center justify-center gap-0.5 min-h-[52px] rounded-xl"
        >
            <span className={cn('px-4 py-1 rounded-full transition-colors', isActive ? 'bg-rp-surface-2' : 'bg-transparent')}>
                <Icon className={cn('w-[22px] h-[22px]', isActive ? 'text-rp-royal' : 'text-rp-ink-2')} strokeWidth={isActive ? 2.4 : 2} />
            </span>
            <span className={cn('text-[11px] font-semibold', isActive ? 'text-rp-royal' : 'text-rp-ink-2')}>{item.label}</span>
        </button>
    );
};

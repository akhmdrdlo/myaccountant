import { Home, FileText, User, PieChart, Plus, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';

// Define navigation items
const NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'mutasi', label: 'Mutasi', icon: FileText }, // History
    { id: 'investasi', label: 'Investasi', icon: TrendingUp },
    { id: 'analytics', label: 'Analisis', icon: PieChart },
    { id: 'akun', label: 'Akun', icon: User },
];

interface BottomNavProps {
    activeTab: string;
    onTabChange: (id: string) => void;
    onFabClick?: () => void;
}

export const BottomNav = ({ activeTab, onTabChange, onFabClick }: BottomNavProps) => {
    // const [activeTab, setActiveTab] = useState('home'); // Removed internal state

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-2 sm:px-6 py-2 pb-4 z-50">
            <div className="flex justify-between items-center max-w-md mx-auto">
                {/* Left Side */}
                <div className="flex flex-1 justify-evenly">
                    <NavItem item={NAV_ITEMS[0]} activeTab={activeTab} onTabChange={onTabChange} />
                    <NavItem item={NAV_ITEMS[1]} activeTab={activeTab} onTabChange={onTabChange} />
                </div>

                {/* Center FAB */}
                <div className="relative -top-5 shrink-0 mx-2">
                    <button
                        onClick={onFabClick}
                        className="w-14 h-14 bg-brimo-accent hover:bg-orange-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-200 border-4 border-white dark:border-gray-900 transition-transform active:scale-95"
                    >
                        <Plus className="w-8 h-8" strokeWidth={2.5} />
                    </button>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-400">Add</span>
                </div>

                {/* Right Side */}
                <div className="flex flex-1 justify-evenly">
                    <NavItem item={NAV_ITEMS[2]} activeTab={activeTab} onTabChange={onTabChange} />
                    <NavItem item={NAV_ITEMS[3]} activeTab={activeTab} onTabChange={onTabChange} />
                    <NavItem item={NAV_ITEMS[4]} activeTab={activeTab} onTabChange={onTabChange} />
                </div>
            </div>
        </nav>
    );
};

// Helper Component
const NavItem = ({ item, activeTab, onTabChange }: { item: any, activeTab: string, onTabChange: (id: string) => void }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
        <button
            onClick={() => onTabChange(item.id)}
            className="flex flex-col items-center gap-1 group w-14 sm:w-16 pt-3"
        >
            <div
                className={cn(
                    "p-1.5 rounded-xl transition-all duration-200",
                    isActive ? "bg-blue-50 dark:bg-blue-900/30" : "bg-transparent"
                )}
            >
                <Icon
                    className={cn(
                        "w-6 h-6 transition-colors duration-200",
                        isActive ? "text-brimo-primary dark:text-blue-400 fill-brimo-primary/20" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-500"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                />
            </div>
            <span
                className={cn(
                    "text-[10px] font-medium transition-colors duration-200",
                    isActive ? "text-brimo-primary dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                )}
            >
                {item.label}
            </span>
        </button>
    );
};


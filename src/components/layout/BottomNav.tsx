import { Home, FileText, User, PieChart } from 'lucide-react';
import { cn } from '../../lib/utils';
// import { useState } from 'react'; // Removed unused

// Define navigation items
const NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'mutasi', label: 'Mutasi', icon: FileText }, // History
    { id: 'analytics', label: 'Analisis', icon: PieChart },
    { id: 'akun', label: 'Akun', icon: User },
];

interface BottomNavProps {
    activeTab: string;
    onTabChange: (id: string) => void;
}

export const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
    // const [activeTab, setActiveTab] = useState('home'); // Removed internal state

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 pb-4 z-50">
            <div className="flex justify-between items-center max-w-md mx-auto">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className="flex flex-col items-center gap-1 group w-16"
                        >
                            <div
                                className={cn(
                                    "p-1.5 rounded-xl transition-all duration-200",
                                    isActive ? "bg-blue-50" : "bg-transparent"
                                )}
                            >
                                <Icon
                                    className={cn(
                                        "w-6 h-6 transition-colors duration-200",
                                        isActive ? "text-brimo-primary fill-brimo-primary/20" : "text-gray-400 group-hover:text-gray-500"
                                    )}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                            </div>
                            <span
                                className={cn(
                                    "text-[10px] font-medium transition-colors duration-200",
                                    isActive ? "text-brimo-primary" : "text-gray-400"
                                )}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

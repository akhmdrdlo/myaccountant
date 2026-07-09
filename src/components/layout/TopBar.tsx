import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';

export const TopBar = () => {
    const { theme, toggleTheme } = useThemeStore();
    const isDarkMode = theme === 'dark';

    return (
        <header className="w-full flex justify-between items-center py-4 px-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 transition-colors duration-300">
            {/* Brand Logo / Name */}
            <div className="flex items-center gap-2">
                <img src="/banklogo.png" alt="Logo" className="w-12 h-12" />
                <span className="text-lg font-black tracking-tight text-brimo-primary dark:text-blue-400">
                    Rplanner
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                <button
                    onClick={toggleTheme}
                    className="p-2 text-gray-500 hover:text-brimo-primary dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition"
                    title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
                >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
            </div>
        </header>
    );
};

import React from 'react';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

interface LayoutProps {
    children: React.ReactNode;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    onFabClick?: () => void;
}

export const Layout = ({ children, activeTab = 'home', onTabChange = () => { }, onFabClick }: LayoutProps) => {
    return (
        <div className="min-h-screen bg-brimo-bg dark:bg-gray-900 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden flex flex-col transition-colors duration-300">
            {/* Custom TopBar */}
            <TopBar />

            {/* Background Decorations */}
            <div className="absolute top-16 left-0 w-full h-[300px] bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-900/20 -z-10" />

            <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4 scrollbar-hide">
                {children}
            </div>

            <BottomNav activeTab={activeTab} onTabChange={onTabChange} onFabClick={onFabClick} />
        </div>
    );
};

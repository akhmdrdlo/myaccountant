import React from 'react';
import { BottomNav } from './BottomNav';

interface LayoutProps {
    children: React.ReactNode;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

export const Layout = ({ children, activeTab = 'home', onTabChange = () => { } }: LayoutProps) => {
    return (
        <div className="min-h-screen bg-brimo-bg font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden flex flex-col">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-50 to-transparent -z-10" />

            <div className="flex-1 overflow-y-auto pb-24 px-4 pt-6 scrollbar-hide">
                {children}
            </div>

            <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
        </div>
    );
};

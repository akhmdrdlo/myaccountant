import React from 'react';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

interface LayoutProps {
    children: React.ReactNode;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    onFabClick?: () => void;
    onOpenNotifications?: () => void;
    pendingCount?: number;
}

export const Layout = ({ children, activeTab = 'home', onTabChange = () => { }, onFabClick, onOpenNotifications, pendingCount }: LayoutProps) => {
    return (
        <div className="min-h-screen bg-rp-canvas max-w-md mx-auto relative flex flex-col md:border-x md:border-rp-line">
            <TopBar onOpenNotifications={onOpenNotifications} pendingCount={pendingCount} />
            <main className="flex-1 pb-28 px-4 pt-4">
                {children}
            </main>
            <BottomNav activeTab={activeTab} onTabChange={onTabChange} onFabClick={onFabClick} />
        </div>
    );
};

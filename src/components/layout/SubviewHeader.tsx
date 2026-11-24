import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface SubviewHeaderProps {
    title: string;
    subtitle?: string;
    onBack: () => void;
    action?: ReactNode;
}

export const SubviewHeader = ({ title, subtitle, onBack, action }: SubviewHeaderProps) => (
    <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
            <button
                onClick={onBack}
                aria-label="Kembali"
                className="-ml-2 w-11 h-11 shrink-0 flex items-center justify-center rounded-xl text-rp-ink hover:bg-rp-surface-2 transition"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
                <h1 className="text-xl font-bold text-rp-ink truncate">{title}</h1>
                {subtitle && <p className="text-xs text-rp-ink-2 truncate">{subtitle}</p>}
            </div>
        </div>
        {action}
    </div>
);

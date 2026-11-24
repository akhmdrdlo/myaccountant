import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SheetProps {
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
}

/** Bottom sheet standar Rplanner: naik dari bawah, tutup dengan tap latar atau Esc. */
export const Sheet = ({ title, onClose, children, footer }: SheetProps) => {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <>
            <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-label={title}
                className="fixed inset-x-0 bottom-0 z-[70] max-w-md mx-auto bg-rp-surface rounded-t-3xl max-h-[90vh] flex flex-col shadow-rp-2 animate-[rp-sheet_180ms_ease-out]">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <h2 className="text-lg font-bold text-rp-ink">{title}</h2>
                    <button onClick={onClose} aria-label="Tutup" className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl hover:bg-rp-surface-2">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">{children}</div>
                {footer && <div className="px-4 pt-2 pb-safe border-t border-rp-line">{footer}</div>}
            </div>
        </>
    );
};

export const fieldClass = 'mt-1 w-full h-11 px-3 rounded-xl bg-rp-canvas border border-rp-line text-sm text-rp-ink placeholder:text-rp-ink-2';

export const Field = ({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) => (
    <label className={cn('block text-sm font-medium text-rp-ink', className)}>
        {label}
        {children}
        {hint && <span className="block mt-1 text-xs font-normal text-rp-ink-2">{hint}</span>}
    </label>
);

/** Input rupiah: hanya angka, ditampilkan dengan titik ribuan. */
export const MoneyInput = ({ value, onChange, placeholder = '0', autoFocus }: {
    value: number | '';
    onChange: (v: number | '') => void;
    placeholder?: string;
    autoFocus?: boolean;
}) => (
    <div className="relative mt-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-rp-ink-2">Rp</span>
        <input
            inputMode="numeric"
            autoFocus={autoFocus}
            value={value === '' ? '' : value.toLocaleString('id-ID')}
            onChange={e => {
                const digits = e.target.value.replace(/[^0-9]/g, '');
                onChange(digits ? Number(digits) : '');
            }}
            placeholder={placeholder}
            className={cn(fieldClass, '!mt-0 pl-10 rp-num')}
        />
    </div>
);

export const PrimaryButton = ({ children, disabled, onClick, type = 'button' }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit';
}) => (
    <button type={type} onClick={onClick} disabled={disabled}
        className="w-full h-12 rounded-xl bg-rp-action hover:bg-rp-action-press text-white font-semibold disabled:opacity-60 transition">
        {children}
    </button>
);

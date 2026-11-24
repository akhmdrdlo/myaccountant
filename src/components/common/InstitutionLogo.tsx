import { useState } from 'react';
import { LOGO_FILES, type Institution } from '../../lib/institutions';
import { cn } from '../../lib/utils';

interface InstitutionLogoProps {
    institution: Institution;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const SIZES = {
    sm: 'w-8 h-8 rounded-lg text-[10px]',
    md: 'w-10 h-10 rounded-xl text-[11px]',
    lg: 'w-12 h-12 rounded-2xl text-xs',
};

/** Logo bank/e-wallet: file resmi jika tersedia, selain itu lencana warna brand + singkatan. */
export const InstitutionLogo = ({ institution, size = 'md', className }: InstitutionLogoProps) => {
    const [failed, setFailed] = useState(false);
    const hasFile = LOGO_FILES.has(institution.id) && !failed;

    return (
        <span
            role="img"
            aria-label={institution.name}
            className={cn('shrink-0 inline-flex items-center justify-center font-extrabold tracking-tight overflow-hidden', SIZES[size], className)}
            style={hasFile ? { background: '#FFFFFF' } : { background: institution.bg, color: institution.fg }}
        >
            {hasFile ? (
                <img src={`/logos/${institution.id}.svg`} alt="" className="w-full h-full object-contain p-1" onError={() => setFailed(true)} />
            ) : (
                institution.short
            )}
        </span>
    );
};

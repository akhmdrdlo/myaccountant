import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

/** Format tunggal untuk nominal: "Rp1.250.000" (tanpa spasi). */
export function formatRupiah(amount: number): string {
    return rupiahFormatter.format(Math.round(amount)).replace(/\s/g, '');
}

/** Format ringkas untuk chart & badge: "Rp1,2 jt", "Rp350 rb". */
export function formatRupiahShort(amount: number): string {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '−' : '';
    if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
    if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
    if (abs >= 1_000) return `${sign}Rp${Math.round(abs / 1_000)} rb`;
    return `${sign}Rp${abs}`;
}

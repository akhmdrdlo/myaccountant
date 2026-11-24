// Satu peta ikon kategori untuk seluruh aplikasi (formulir, mutasi, beranda).
import {
    ArrowLeftRight, Briefcase, Bus, Coffee, CreditCard, Gift, HandCoins, Home, Laptop, MoreHorizontal,
    ShoppingBag, SlidersHorizontal, Sparkles, Utensils, Wallet, Zap, type LucideIcon,
} from 'lucide-react';

const MAP: [RegExp, LucideIcon][] = [
    [/makan weekend/i, Coffee],
    [/makan|food|resto|kuliner/i, Utensils],
    [/transport|bensin|ojek/i, Bus],
    [/jajan|hobi|belanja|hiburan/i, ShoppingBag],
    [/utilitas|listrik|tagihan|internet|pulsa/i, Zap],
    [/kos|sewa|rumah/i, Home],
    [/cicilan|paylater|kredit/i, CreditCard],
    [/transfer|tarik tunai/i, ArrowLeftRight],
    [/utang|piutang/i, HandCoins],
    [/penyesuaian|koreksi/i, SlidersHorizontal],
    [/gaji|salary/i, Briefcase],
    [/bonus|thr/i, Gift],
    [/freelance|proyek/i, Laptop],
    [/investasi|dividen/i, Sparkles],
    [/tabungan|dompet/i, Wallet],
];

export function categoryIcon(category: string): LucideIcon {
    return MAP.find(([re]) => re.test(category))?.[1] ?? MoreHorizontal;
}

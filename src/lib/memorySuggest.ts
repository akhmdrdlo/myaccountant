// Tawarkan menyimpan kebiasaan kategori merchant ke memori AI setelah pengguna
// mengoreksinya beberapa kali. Hanya tawaran: disimpan kalau pengguna menekan "Ingat".
import { toast } from 'sonner';
import { AI_ENABLED } from './ai';
import { insertMemory } from '../hooks/useAiMemory';

const OFFER_AFTER = 2; // koreksi ke-2 untuk merchant + kategori yang sama

// Kunci memuat nama pengguna, jadi hitungan tidak tercampur antar akun di HP yang sama
const storeKey = () => `rplanner_merchant_memo:${localStorage.getItem('rplanner_username') ?? 'anon'}`;

type Counts = Record<string, number>; // "<merchant>|<kategori>" → jumlah koreksi; -1 = sudah ditawarkan

function read(): Counts {
    try { return JSON.parse(localStorage.getItem(storeKey()) ?? '{}') as Counts; } catch { return {}; }
}

export function offerMerchantMemory(merchant: string, category: string) {
    if (!AI_ENABLED) return;
    const name = merchant.trim().replace(/\s+/g, ' ').slice(0, 60);
    if (name.length < 3) return;
    const counts = read();
    const key = `${name.toLowerCase()}|${category}`;
    if (counts[key] === -1) return;
    const n = (counts[key] ?? 0) + 1;
    counts[key] = n >= OFFER_AFTER ? -1 : n;
    localStorage.setItem(storeKey(), JSON.stringify(counts));
    if (n < OFFER_AFTER) return;

    const note = `Transaksi di ${name} biasanya masuk kategori ${category}.`;
    toast(`Ingat untuk Tanya AI: "${note}"`, {
        duration: 8000,
        action: {
            label: 'Ingat',
            onClick: async () => {
                const err = await insertMemory('konteks', note);
                if (err) toast.error(err); else toast.success('Disimpan ke memori AI.');
            },
        },
    });
}

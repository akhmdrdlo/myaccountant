import { useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { claimLegacy, discardLegacy, legacyQueue } from '../../lib/offlineQueue';
import { formatRupiah } from '../../lib/utils';

/** Transaksi tertunda dari versi aplikasi lama (belum ada pemilik). Pengguna memilih kirim ke akunnya atau buang. */
export const LegacyQueueCard = () => {
    const [items, setItems] = useState(legacyQueue);
    if (items.length === 0) return null;
    const total = items.reduce((s, q) => s + (q.type === 'income' ? q.amount : -q.amount), 0);

    const discard = () => {
        if (!window.confirm(`Buang ${items.length} transaksi tertunda? Tidak bisa dibatalkan.`)) return;
        discardLegacy();
        setItems([]);
    };

    return (
        <section className="rp-card p-4" aria-labelledby="legacy-queue-title">
            <div className="flex items-start gap-3">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-rp-surface-2 text-rp-royal flex items-center justify-center">
                    <CloudUpload className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                    <p id="legacy-queue-title" className="font-semibold text-rp-ink">{items.length} transaksi belum terkirim</p>
                    <p className="text-sm text-rp-ink-2">
                        Tersimpan di HP ini dari versi sebelumnya (total <span className="rp-num">{formatRupiah(Math.abs(total))}</span>).
                        Pastikan ini catatanmu sebelum dikirim.
                    </p>
                </div>
            </div>
            <div className="mt-3 flex gap-2">
                <button onClick={discard} className="flex-1 h-11 rounded-xl border border-rp-line text-sm font-semibold text-rp-out">Buang</button>
                <button onClick={() => { claimLegacy(); setItems([]); }} className="flex-1 h-11 rounded-xl bg-rp-action hover:bg-rp-action-press text-white text-sm font-semibold">Kirim ke akunku</button>
            </div>
        </section>
    );
};

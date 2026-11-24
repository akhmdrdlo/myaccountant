import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import type { Transaction } from '../../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../lib/categories';
import { formatRupiah } from '../../lib/utils';
import { TagInput } from '../common/TagInput';

interface TransactionEditSheetProps {
    transaction: Transaction | null;
    /** Pasangan transfer (sisi lain) bila ada — ikut diubah/dihapus */
    pair?: Transaction;
    accounts: string[];
    onClose: () => void;
    onSave: (updated: Transaction, pair?: Transaction) => Promise<boolean>;
    onDelete: (ids: string[]) => Promise<boolean>;
}

const toLocalInput = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm");

export const TransactionEditSheet = ({ transaction, pair, accounts, onClose, onSave, onDelete }: TransactionEditSheetProps) => {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [account, setAccount] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [when, setWhen] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!transaction) return;
        setAmount(String(transaction.amount));
        setCategory(transaction.category);
        setAccount(transaction.account);
        setDescription(transaction.description);
        setTags(transaction.tags ?? []);
        setWhen(toLocalInput(transaction.timestamp));
    }, [transaction]);

    if (!transaction) return null;

    const isTransfer = Boolean(pair);
    const isIncome = transaction.type === 'income';
    const categories = [...new Set([transaction.category, ...(isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)])];
    const pending = transaction.status === 'pending';

    const save = async () => {
        const value = Number(amount.replace(/[^0-9]/g, ''));
        if (!value) return;
        const timestamp = new Date(when).toISOString();
        setBusy(true);
        const ok = await onSave(
            { ...transaction, amount: value, category, account, description, timestamp, tags },
            pair ? { ...pair, amount: value, timestamp } : undefined,
        );
        setBusy(false);
        if (ok) onClose();
    };

    const remove = async () => {
        const msg = isTransfer
            ? `Hapus transfer ${formatRupiah(transaction.amount)}? Kedua sisinya (keluar & masuk) akan dihapus.`
            : `Hapus transaksi ${formatRupiah(transaction.amount)} (${transaction.category})? Tindakan ini tidak bisa dibatalkan.`;
        if (!window.confirm(msg)) return;
        setBusy(true);
        const ok = await onDelete(pair ? [transaction.id, pair.id] : [transaction.id]);
        setBusy(false);
        if (ok) onClose();
    };

    const field = 'mt-1 w-full h-11 px-3 rounded-xl bg-rp-canvas border border-rp-line text-sm text-rp-ink';

    return (
        <>
            <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-label="Ubah transaksi"
                className="fixed inset-x-0 bottom-0 z-[70] max-w-md mx-auto bg-rp-surface rounded-t-3xl max-h-[90vh] overflow-y-auto p-4 pb-safe">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-rp-ink">{isTransfer ? 'Ubah transfer' : 'Ubah transaksi'}</h2>
                    <button onClick={onClose} aria-label="Tutup" className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl hover:bg-rp-surface-2">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {pending && (
                    <p className="mb-3 rounded-xl bg-rp-warn-soft text-rp-warn text-sm p-3">Transaksi ini masih menunggu terkirim. Tunggu sampai online untuk mengubahnya.</p>
                )}

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-rp-ink">
                        Nominal
                        <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-rp-ink-2">Rp</span>
                            <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="numeric" className={`${field} !mt-0 pl-10 rp-num`} />
                        </div>
                    </label>

                    {!isTransfer && (
                        <div className="grid grid-cols-2 gap-2">
                            <label className="block text-sm font-medium text-rp-ink">
                                Kategori
                                <select value={category} onChange={e => setCategory(e.target.value)} className={field}>
                                    {categories.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </label>
                            <label className="block text-sm font-medium text-rp-ink">
                                Dompet
                                <select value={account} onChange={e => setAccount(e.target.value)} className={field}>
                                    {[...new Set([transaction.account, ...accounts])].map(a => <option key={a}>{a}</option>)}
                                </select>
                            </label>
                        </div>
                    )}

                    <label className="block text-sm font-medium text-rp-ink">
                        Catatan
                        <input value={description} onChange={e => setDescription(e.target.value)} className={field} />
                    </label>

                    {!isTransfer && (
                        <div className="text-sm font-medium text-rp-ink">
                            Tag
                            <TagInput value={tags} onChange={setTags} />
                        </div>
                    )}

                    <label className="block text-sm font-medium text-rp-ink">
                        Waktu
                        <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className={field} />
                    </label>
                </div>

                <div className="flex gap-2 mt-5">
                    <button onClick={remove} disabled={busy || pending} aria-label="Hapus transaksi"
                        className="h-12 w-12 rounded-xl border border-rp-line text-rp-out flex items-center justify-center disabled:opacity-50">
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button onClick={save} disabled={busy || pending}
                        className="flex-1 h-12 rounded-xl bg-rp-action hover:bg-rp-action-press text-white font-semibold disabled:opacity-60">
                        {busy ? 'Menyimpan…' : 'Simpan perubahan'}
                    </button>
                </div>
            </div>
        </>
    );
};

/** Cari pasangan transfer: kategori transfer, nominal sama, arah berlawanan, selisih waktu < 2 menit. */
export function findTransferPair(tx: Transaction, all: Transaction[]): Transaction | undefined {
    if (tx.category !== 'Transfer / Tarik Tunai') return undefined;
    const t = new Date(tx.timestamp).getTime();
    return all.find(o =>
        o.id !== tx.id &&
        o.category === tx.category &&
        o.amount === tx.amount &&
        o.type !== tx.type &&
        Math.abs(new Date(o.timestamp).getTime() - t) < 120_000 &&
        /^Transfer (ke|dari) /.test(o.description),
    );
}

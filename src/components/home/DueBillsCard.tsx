import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useSupabase } from '../../hooks/useSupabase';
import { institutionForAccount } from '../../lib/institutions';
import { dueDateThisMonth, dueUnpaid, skipThisMonth, subscriptionTransaction } from '../../lib/subscriptions';
import { formatRupiah } from '../../lib/utils';
import type { Subscription } from '../../types';

/** Langganan yang sudah jatuh tempo bulan ini: kamu yang memutuskan sudah dibayar atau dilewati. */
export const DueBillsCard = ({ onChanged }: { onChanged: () => Promise<void> | void }) => {
    const { subscriptions, transactions, accounts } = useFinanceStore();
    const { saveTransaction } = useSupabase();
    const [busy, setBusy] = useState<string | null>(null);
    const [skipVersion, force] = useState(0);
    const [account, setAccount] = useState(() => accounts.find(a => institutionForAccount(a).kind === 'cash')?.name ?? accounts[0]?.name ?? '');

    // skipVersion ikut jadi dependensi supaya daftar dihitung ulang setelah "Lewati"
    const due = useMemo(() => dueUnpaid(subscriptions, transactions), [subscriptions, transactions, skipVersion]); // eslint-disable-line react-hooks/exhaustive-deps
    if (due.length === 0) return null;

    const paid = async (sub: Subscription) => {
        const from = account || accounts[0]?.name;
        if (!from) return toast.error('Tambahkan dompet dulu.');
        setBusy(sub.id);
        const res = await saveTransaction(subscriptionTransaction(sub, from));
        setBusy(null);
        if (!res.ok) return toast.error(`Gagal mencatat: ${res.message ?? 'coba lagi'}`);
        toast.success(`${sub.name} dicatat dari ${from}.`);
        await onChanged();
    };

    return (
        <section aria-labelledby="due-title" className="rp-card p-4 mb-6">
            <div className="flex items-center justify-between gap-2">
                <h2 id="due-title" className="flex items-center gap-2 text-sm font-semibold text-rp-ink">
                    <CalendarClock className="w-4 h-4 text-rp-warn" /> Tagihan jatuh tempo
                </h2>
                {accounts.length > 1 && (
                    <label className="text-xs text-rp-ink-2 flex items-center gap-1">
                        dari
                        <select value={account} onChange={e => setAccount(e.target.value)} aria-label="Bayar dari dompet"
                            className="h-8 px-2 rounded-lg bg-rp-canvas border border-rp-line text-xs text-rp-ink">
                            {accounts.map(a => <option key={a.name}>{a.name}</option>)}
                        </select>
                    </label>
                )}
            </div>
            <ul className="mt-2 divide-y divide-rp-line">
                {due.map(sub => (
                    <li key={sub.id} className="flex items-center gap-3 py-2.5">
                        <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-rp-ink truncate">{sub.name}</span>
                            <span className="block text-xs text-rp-ink-2 rp-num">
                                {formatRupiah(sub.amount)} · tgl {dueDateThisMonth(sub).getDate()}
                            </span>
                        </span>
                        <button onClick={() => { skipThisMonth(sub); force(n => n + 1); }}
                            className="h-9 px-3 rounded-lg text-xs font-semibold text-rp-ink-2 hover:bg-rp-surface-2">
                            Lewati
                        </button>
                        <button onClick={() => paid(sub)} disabled={busy === sub.id}
                            className="h-9 px-3 rounded-lg bg-rp-surface-2 text-rp-royal text-xs font-semibold disabled:opacity-60">
                            {busy === sub.id ? 'Mencatat…' : 'Sudah dibayar'}
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
};

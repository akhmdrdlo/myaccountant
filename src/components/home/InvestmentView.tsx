import { useState } from 'react';
import { toast } from 'sonner';
import { LineChart, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useSupabase } from '../../hooks/useSupabase';
import { localDb } from '../../services/localDb';
import { Field, MoneyInput, PrimaryButton, Sheet, fieldClass } from '../common/Sheet';
import { institutionForAccount } from '../../lib/institutions';
import { cn, formatRupiah, formatRupiahShort } from '../../lib/utils';
import type { Investment } from '../../types';

const TYPES = ['Reksadana', 'Saham', 'Emas', 'Obligasi', 'Deposito', 'Kripto', 'Lainnya'];
/** Kurs kasar USD→IDR untuk aset luar negeri dari Alpha Vantage */
const USD_IDR = 16000;

interface Draft {
    id?: string;
    name: string;
    symbol: string;
    type: string;
    averagePrice: number | '';
    totalUnits: string;
    currentPrice: number | '';
}

const emptyDraft = (): Draft => ({ name: '', symbol: '', type: 'Reksadana', averagePrice: '', totalUnits: '1', currentPrice: '' });

export const InvestmentView = () => {
    const { investments, getInvestmentTotal, accounts } = useFinanceStore();
    const { addInvestment, updateInvestment, deleteInvestment, addTransaction } = useSupabase();
    const [draft, setDraft] = useState<Draft | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const totalValue = getInvestmentTotal();
    const totalCost = investments.reduce((s, i) => s + i.averagePrice * i.totalUnits, 0);
    const profit = totalValue - totalCost;
    const pct = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    const refreshPrices = async () => {
        const metadata = (localDb.loadAllData().metadata || {}) as { alphaVantageKey?: string };
        const apiKey = metadata.alphaVantageKey || 'GWST0VV7BWSMK7AB';
        const targets = investments.filter(i => i.symbol?.trim());
        if (!targets.length) return toast.info('Isi kode saham/kripto di aset dulu (mis. BBCA.JK) supaya harganya bisa diperbarui.');

        setRefreshing(true);
        let ok = 0;
        let fail = 0;
        for (const inv of targets) {
            try {
                const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(inv.symbol!.trim())}&apikey=${apiKey}`);
                const data = await res.json();
                if (data.Note || data.Information) {
                    toast.warning('Batas API Alpha Vantage tercapai. Coba lagi beberapa menit lagi.');
                    break;
                }
                const raw = parseFloat(data['Global Quote']?.['05. price']);
                if (!raw) { fail++; continue; }
                const price = !inv.symbol!.toLowerCase().endsWith('.jk') && raw < 100_000 ? raw * USD_IDR : raw;
                const updated = { ...inv, currentPrice: price };
                useFinanceStore.setState(st => ({ investments: st.investments.map(i => (i.id === inv.id ? updated : i)) }));
                await updateInvestment(updated);
                ok++;
            } catch {
                fail++;
            }
            await new Promise(r => setTimeout(r, 500));
        }
        setRefreshing(false);
        toast.success(`Harga diperbarui: ${ok} aset${fail ? `, ${fail} gagal` : ''}.`);
    };

    return (
        <div className="space-y-5">
            <section className="relative overflow-hidden rounded-2xl bg-[#0B3C7A] text-white p-5 shadow-rp-2">
                <div aria-hidden className="absolute -top-px right-0 w-32 h-full bg-[#1F5FDB]/40" style={{ clipPath: 'polygon(55% 0, 100% 0, 100% 70%, 20% 100%, 0 100%)' }} />
                <div className="relative">
                    <p className="text-sm text-white/80">Nilai portofolio</p>
                    <p className="text-[32px] leading-tight font-bold rp-num">{formatRupiah(totalValue)}</p>
                    <p className={cn('text-sm font-semibold rp-num', profit >= 0 ? 'text-[#7FE3B4]' : 'text-[#FFB4AA]')}>
                        {profit >= 0 ? '+' : '−'}{formatRupiah(Math.abs(profit))} ({profit >= 0 ? '+' : '−'}{Math.abs(pct).toFixed(1)}%)
                    </p>
                    <p className="mt-3 pt-3 border-t border-dashed border-white/25 text-xs text-white/70 rp-num">Modal {formatRupiah(totalCost)}</p>
                </div>
            </section>

            <div className="flex gap-2">
                <button onClick={() => setDraft(emptyDraft())} className="flex-1 h-11 rounded-xl bg-rp-action hover:bg-rp-action-press text-white text-sm font-semibold flex items-center justify-center gap-1.5">
                    <Plus className="w-4 h-4" /> Tambah aset
                </button>
                <button onClick={refreshPrices} disabled={refreshing} className="h-11 px-4 rounded-xl bg-rp-surface-2 text-rp-royal text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60">
                    <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} /> Harga
                </button>
            </div>

            {investments.length === 0 ? (
                <div className="rp-card p-6 text-center">
                    <LineChart className="w-8 h-8 mx-auto text-rp-ink-2" />
                    <p className="mt-3 font-semibold text-rp-ink">Belum ada aset</p>
                    <p className="mt-1 text-sm text-rp-ink-2">Catat reksadana, saham, atau emas supaya kekayaan bersihmu terhitung lengkap.</p>
                </div>
            ) : (
                <ul className="rp-card divide-y divide-rp-line overflow-hidden">
                    {investments.map(inv => {
                        const value = inv.currentPrice * inv.totalUnits;
                        const p = value - inv.averagePrice * inv.totalUnits;
                        return (
                            <li key={inv.id}>
                                <button onClick={() => setDraft({ ...inv, symbol: inv.symbol ?? '', totalUnits: String(inv.totalUnits) })}
                                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-rp-surface-2 transition">
                                    <span className="w-10 h-10 shrink-0 rounded-xl bg-rp-surface-2 text-rp-royal flex items-center justify-center text-xs font-extrabold">
                                        {(inv.symbol || inv.name).replace(/\.jk$/i, '').slice(0, 4).toUpperCase()}
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-semibold text-rp-ink truncate">{inv.name}</span>
                                        <span className="block text-xs text-rp-ink-2 truncate rp-num">{inv.type} · {inv.totalUnits.toLocaleString('id-ID')} unit</span>
                                    </span>
                                    <span className="text-right">
                                        <span className="block text-sm font-bold text-rp-ink rp-num">{formatRupiahShort(value)}</span>
                                        <span className={cn('block text-xs font-medium rp-num', p >= 0 ? 'text-rp-in' : 'text-rp-out')}>
                                            {p >= 0 ? '+' : '−'}{formatRupiahShort(Math.abs(p))}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {draft && (
                <InvestmentSheet
                    draft={draft}
                    accounts={accounts}
                    onClose={() => setDraft(null)}
                    onSave={async (inv, payFrom) => {
                        const exists = investments.some(i => i.id === inv.id);
                        useFinanceStore.setState(st => ({
                            investments: exists ? st.investments.map(i => (i.id === inv.id ? inv : i)) : [...st.investments, inv],
                        }));
                        const ok = exists ? await updateInvestment(inv) : await addInvestment(inv);
                        if (ok && !exists && payFrom) {
                            const tx = {
                                type: 'expense' as const,
                                category: 'Investasi',
                                amount: Math.round(inv.averagePrice * inv.totalUnits),
                                description: `Beli ${inv.name}`,
                                account: payFrom,
                            };
                            // Saldo dompet langsung berkurang di layar; data lengkap ikut termuat saat refresh berikutnya
                            useFinanceStore.getState().addTransactionOptimistic({ ...tx, id: crypto.randomUUID(), timestamp: new Date().toISOString(), status: 'completed' });
                            if (!(await addTransaction(tx))) toast.error('Aset tersimpan, tapi pengurangan saldo dompet gagal dicatat.');
                        }
                        if (!ok) toast.error('Gagal menyimpan aset.');
                        else setDraft(null);
                    }}
                    onDelete={async (id) => {
                        if (!window.confirm('Hapus aset ini? Transaksi pembeliannya tetap ada.')) return;
                        useFinanceStore.setState(st => ({ investments: st.investments.filter(i => i.id !== id) }));
                        await deleteInvestment(id);
                        setDraft(null);
                    }}
                />
            )}
        </div>
    );
};

const InvestmentSheet = ({ draft, accounts, onClose, onSave, onDelete }: {
    draft: Draft;
    accounts: { name: string; institution?: string }[];
    onClose: () => void;
    onSave: (inv: Investment, payFrom?: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) => {
    const [d, setD] = useState<Draft>(draft);
    const [payFrom, setPayFrom] = useState('');
    const [busy, setBusy] = useState(false);
    const set = (patch: Partial<Draft>) => setD(prev => ({ ...prev, ...patch }));
    const units = Number(d.totalUnits.replace(',', '.')) || 0;
    const cost = (Number(d.averagePrice) || 0) * units;

    const save = async () => {
        if (!d.name.trim()) return toast.error('Isi nama aset.');
        if (!units) return toast.error('Jumlah unit harus lebih dari 0.');
        setBusy(true);
        await onSave({
            id: d.id ?? crypto.randomUUID(),
            name: d.name.trim(),
            symbol: d.symbol.trim().toUpperCase() || undefined,
            type: d.type,
            averagePrice: Number(d.averagePrice) || 0,
            totalUnits: units,
            currentPrice: Number(d.currentPrice) || Number(d.averagePrice) || 0,
        }, payFrom || undefined);
        setBusy(false);
    };

    return (
        <Sheet title={d.id ? 'Ubah aset' : 'Tambah aset'} onClose={onClose}
            footer={
                <div className="flex gap-2">
                    {d.id && (
                        <button onClick={() => onDelete(d.id!)} aria-label="Hapus aset" className="h-12 w-12 shrink-0 rounded-xl border border-rp-line text-rp-out flex items-center justify-center">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <PrimaryButton onClick={save} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</PrimaryButton>
                </div>
            }>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1" role="radiogroup" aria-label="Jenis aset">
                {TYPES.map(t => (
                    <button key={t} role="radio" aria-checked={d.type === t} onClick={() => set({ type: t })}
                        className={cn('h-9 px-3 shrink-0 rounded-full text-xs font-semibold border transition',
                            d.type === t ? 'bg-rp-royal border-rp-royal text-white' : 'border-rp-line text-rp-ink-2')}>
                        {t}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
                <Field label="Nama" className="col-span-2"><input value={d.name} onChange={e => set({ name: e.target.value })} placeholder="mis. Bank BCA" className={fieldClass} /></Field>
                <Field label="Kode"><input value={d.symbol} onChange={e => set({ symbol: e.target.value })} placeholder="BBCA.JK" className={`${fieldClass} uppercase`} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <Field label="Harga beli rata-rata"><MoneyInput value={d.averagePrice} onChange={v => set({ averagePrice: v })} /></Field>
                <Field label="Jumlah unit"><input inputMode="decimal" value={d.totalUnits} onChange={e => set({ totalUnits: e.target.value.replace(/[^0-9.,]/g, '') })} className={`${fieldClass} rp-num`} /></Field>
            </div>
            <Field label="Harga sekarang" hint="Kosongkan untuk memakai harga beli. Tombol Harga memperbarui otomatis untuk aset yang punya kode.">
                <MoneyInput value={d.currentPrice} onChange={v => set({ currentPrice: v })} />
            </Field>
            {!d.id && (
                <Field label="Dibayar dari dompet" hint={cost ? `${formatRupiah(cost)} pindah dari dompet ke aset. Tidak dihitung sebagai pengeluaran.` : undefined}>
                    <select value={payFrom} onChange={e => setPayFrom(e.target.value)} className={fieldClass}>
                        <option value="">Jangan kurangi saldo dompet</option>
                        {accounts.filter(a => institutionForAccount(a).kind !== 'paylater').map(a => <option key={a.name}>{a.name}</option>)}
                    </select>
                </Field>
            )}
        </Sheet>
    );
};

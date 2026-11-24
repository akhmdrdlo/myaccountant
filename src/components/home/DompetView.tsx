import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, Plus, Search, Trash2, X } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useSupabase } from '../../hooks/useSupabase';
import { SubviewHeader } from '../layout/SubviewHeader';
import { InstitutionLogo } from '../common/InstitutionLogo';
import {
    INSTITUTIONS, KIND_LABEL, getInstitution, institutionForAccount, isDebtKind,
    type Institution, type InstitutionKind,
} from '../../lib/institutions';
import { cn, formatRupiah } from '../../lib/utils';

interface DompetViewProps {
    onBack: () => void;
    onOpenTransactionForm?: () => void;
    /** Dipanggil setelah akun berubah supaya data dimuat ulang dari Supabase */
    onChanged?: () => Promise<void> | void;
}

type EditTarget = { mode: 'add' } | { mode: 'edit'; name: string };

const KIND_ORDER: InstitutionKind[] = ['cash', 'bank', 'ewallet', 'paylater', 'other'];

export const DompetView = ({ onBack, onChanged }: DompetViewProps) => {
    const { getAccountBalances, accounts: rawAccounts, transactions } = useFinanceStore();
    const accounts = getAccountBalances();
    const [target, setTarget] = useState<EditTarget | null>(null);

    const enriched = accounts.map(a => ({ ...a, inst: institutionForAccount(a) }));
    const assets = enriched.filter(a => !isDebtKind(a.inst.kind));
    const debts = enriched.filter(a => isDebtKind(a.inst.kind));
    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalDebts = debts.reduce((s, a) => s + a.balance, 0);

    return (
        <div>
            <SubviewHeader
                title="Dompet"
                subtitle="Kantong, rekening bank, dan e-wallet"
                onBack={onBack}
                action={
                    <button
                        onClick={() => setTarget({ mode: 'add' })}
                        className="h-11 px-4 rounded-xl bg-rp-action hover:bg-rp-action-press text-white text-sm font-semibold flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" /> Tambah
                    </button>
                }
            />

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rp-card p-4">
                    <p className="text-xs text-rp-ink-2">Total saldo</p>
                    <p className="text-lg font-bold text-rp-ink rp-num">{formatRupiah(totalAssets)}</p>
                </div>
                <div className="rp-card p-4">
                    <p className="text-xs text-rp-ink-2">Paylater & kartu kredit</p>
                    <p className={cn('text-lg font-bold rp-num', totalDebts < 0 ? 'text-rp-out' : 'text-rp-ink')}>{formatRupiah(totalDebts)}</p>
                </div>
            </div>

            {[{ title: 'Saldo', list: assets }, { title: 'Utang', list: debts }].map(({ title, list }) => list.length > 0 && (
                <section key={title} className="mb-6">
                    <h2 className="rp-section-title mb-2">{title}</h2>
                    <ul className="rp-card divide-y divide-rp-line overflow-hidden">
                        {list.map(acc => (
                            <li key={acc.name}>
                                <button
                                    onClick={() => setTarget({ mode: 'edit', name: acc.name })}
                                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-rp-surface-2 transition"
                                >
                                    <InstitutionLogo institution={acc.inst} />
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-semibold text-rp-ink truncate">{acc.name}</span>
                                        <span className="block text-xs text-rp-ink-2">{KIND_LABEL[acc.inst.kind]}</span>
                                    </span>
                                    <span className={cn('text-sm font-bold rp-num', acc.balance < 0 ? 'text-rp-out' : 'text-rp-ink')}>
                                        {formatRupiah(acc.balance)}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}

            {accounts.length <= 1 && (
                <button
                    onClick={() => setTarget({ mode: 'add' })}
                    className="w-full rp-card border-dashed p-4 text-left flex items-center gap-3"
                >
                    <span className="w-10 h-10 rounded-xl bg-rp-surface-2 text-rp-royal flex items-center justify-center"><Plus className="w-5 h-5" /></span>
                    <span>
                        <span className="block text-sm font-semibold text-rp-ink">Tambah rekening atau e-wallet</span>
                        <span className="block text-xs text-rp-ink-2">BCA, BRI, GoPay, DANA, dan lainnya</span>
                    </span>
                </button>
            )}

            {target && (
                <WalletSheet
                    target={target}
                    existing={rawAccounts}
                    usedCount={target.mode === 'edit' ? transactions.filter(t => t.account === target.name || t.toAccount === target.name).length : 0}
                    onClose={() => setTarget(null)}
                    onSaved={async () => {
                        setTarget(null);
                        await onChanged?.();
                    }}
                />
            )}
        </div>
    );
};

// ── Sheet tambah / ubah dompet ────────────────────────────────

const WalletSheet = ({ target, existing, usedCount, onClose, onSaved }: {
    target: EditTarget;
    existing: { name: string; initialBalance: number; institution?: string }[];
    usedCount: number;
    onClose: () => void;
    onSaved: () => Promise<void>;
}) => {
    const { createAccount, updateAccount, deleteAccount } = useSupabase();
    const current = target.mode === 'edit' ? existing.find(a => a.name === target.name) : undefined;

    const [step, setStep] = useState<'pick' | 'form'>(target.mode === 'add' ? 'pick' : 'form');
    const [inst, setInst] = useState<Institution>(() => current ? institutionForAccount(current) : getInstitution('cash')!);
    const [name, setName] = useState(current?.name ?? '');
    const [balance, setBalance] = useState(current ? String(current.initialBalance) : '');
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState(false);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return INSTITUTIONS.filter(i => !q || i.name.toLowerCase().includes(q) || i.aliases.some(a => a.includes(q)));
    }, [query]);

    const pick = (i: Institution) => {
        setInst(i);
        // Nama default unik: "BCA", lalu "BCA 2" jika sudah ada
        const base = i.id === 'cash' ? 'Kantong' : i.id === 'other' ? '' : i.name;
        let candidate = base;
        let n = 2;
        while (candidate && existing.some(a => a.name.toLowerCase() === candidate.toLowerCase())) candidate = `${base} ${n++}`;
        setName(candidate);
        setStep('form');
    };

    const save = async () => {
        const clean = name.trim();
        if (!clean) return toast.error('Isi nama dompet dulu.');
        const dup = existing.some(a => a.name.toLowerCase() === clean.toLowerCase() && a.name !== current?.name);
        if (dup) return toast.error('Nama dompet sudah dipakai.');
        const payload = { name: clean, initialBalance: Number(balance.replace(/[^0-9-]/g, '')) || 0, institution: inst.id };

        setBusy(true);
        const ok = current ? await updateAccount(current.name, payload) : await createAccount(payload);
        setBusy(false);
        if (!ok) return toast.error('Gagal menyimpan dompet. Cek koneksi lalu coba lagi.');
        toast.success(current ? 'Dompet diperbarui.' : `${clean} ditambahkan.`);
        await onSaved();
    };

    const remove = async () => {
        if (!current) return;
        if (existing.length <= 1) return toast.error('Minimal harus ada satu dompet.');
        const msg = usedCount > 0
            ? `"${current.name}" dipakai di ${usedCount} transaksi. Transaksinya tetap ada tapi tidak lagi masuk saldo dompet mana pun. Hapus?`
            : `Hapus dompet "${current.name}"?`;
        if (!window.confirm(msg)) return;
        setBusy(true);
        const ok = await deleteAccount(current.name);
        setBusy(false);
        if (!ok) return toast.error('Gagal menghapus dompet.');
        await onSaved();
    };

    return (
        <>
            <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-label={current ? 'Ubah dompet' : 'Tambah dompet'}
                className="fixed inset-x-0 bottom-0 z-[70] max-w-md mx-auto bg-rp-surface rounded-t-3xl max-h-[88vh] flex flex-col">
                <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                    {step === 'form' && !current && (
                        <button onClick={() => setStep('pick')} aria-label="Pilih ulang" className="w-11 h-11 -ml-2 flex items-center justify-center rounded-xl hover:bg-rp-surface-2">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    <h2 className="flex-1 text-lg font-bold text-rp-ink">
                        {current ? 'Ubah dompet' : step === 'pick' ? 'Pilih jenis dompet' : 'Detail dompet'}
                    </h2>
                    <button onClick={onClose} aria-label="Tutup" className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl hover:bg-rp-surface-2">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {step === 'pick' ? (
                    <div className="flex-1 overflow-y-auto px-4 pb-6">
                        <label className="relative block mb-4">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-rp-ink-2" />
                            <input
                                autoFocus
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Cari bank atau e-wallet"
                                className="w-full h-11 pl-9 pr-3 rounded-xl bg-rp-canvas border border-rp-line text-sm text-rp-ink placeholder:text-rp-ink-2"
                            />
                        </label>
                        {KIND_ORDER.map(kind => {
                            const items = filtered.filter(i => i.kind === kind);
                            if (!items.length) return null;
                            return (
                                <section key={kind} className="mb-4">
                                    <h3 className="text-xs font-semibold text-rp-ink-2 mb-2">{KIND_LABEL[kind]}</h3>
                                    <div className="grid grid-cols-4 gap-2">
                                        {items.map(i => (
                                            <button key={i.id} onClick={() => pick(i)}
                                                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-rp-surface-2 active:scale-95 transition">
                                                <InstitutionLogo institution={i} size="lg" />
                                                <span className="text-[11px] font-medium text-rp-ink text-center leading-tight line-clamp-2">{i.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
                        <button onClick={() => setStep('pick')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-rp-canvas border border-rp-line text-left">
                            <InstitutionLogo institution={inst} />
                            <span className="flex-1">
                                <span className="block text-sm font-semibold text-rp-ink">{inst.name}</span>
                                <span className="block text-xs text-rp-ink-2">{KIND_LABEL[inst.kind]} · ketuk untuk ganti</span>
                            </span>
                        </button>
                        <label className="block text-sm font-medium text-rp-ink">
                            Nama dompet
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="mis. BCA Gaji, GoPay Harian"
                                className="mt-1 w-full h-11 px-3 rounded-xl bg-rp-canvas border border-rp-line text-sm text-rp-ink" />
                        </label>
                        <label className="block text-sm font-medium text-rp-ink">
                            {isDebtKind(inst.kind) ? 'Tagihan awal (isi minus, mis. -500000)' : 'Saldo awal'}
                            <div className="mt-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-rp-ink-2">Rp</span>
                                <input value={balance} onChange={e => setBalance(e.target.value)} inputMode="numeric" placeholder="0"
                                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-rp-canvas border border-rp-line text-sm text-rp-ink rp-num" />
                            </div>
                            <span className="block mt-1 text-xs text-rp-ink-2">Saldo saat dompet mulai dicatat. Transaksi setelahnya dihitung otomatis.</span>
                        </label>

                        <div className="flex gap-2 pt-2">
                            {current && (
                                <button onClick={remove} disabled={busy} aria-label="Hapus dompet"
                                    className="h-12 w-12 rounded-xl border border-rp-line text-rp-out flex items-center justify-center disabled:opacity-50">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                            <button onClick={save} disabled={busy}
                                className="flex-1 h-12 rounded-xl bg-rp-action hover:bg-rp-action-press text-white font-semibold disabled:opacity-60">
                                {busy ? 'Menyimpan…' : current ? 'Simpan perubahan' : 'Tambah dompet'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

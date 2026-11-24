import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, HandCoins, Plus, Trash2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { usePlanning } from '../../hooks/usePlanning';
import { SubviewHeader } from '../layout/SubviewHeader';
import { Field, MoneyInput, PrimaryButton, Sheet, fieldClass } from '../common/Sheet';
import { DEBT_CATEGORY } from '../../lib/categories';
import { cn, formatRupiah } from '../../lib/utils';
import type { Debt, TransactionInput } from '../../types';

interface DebtsViewProps {
    onBack: () => void;
    onChanged: () => Promise<void> | void;
    /** Catat perpindahan uang ke dompet (opsional) */
    onRecordTransaction: (input: TransactionInput) => Promise<boolean>;
}

const daysUntil = (iso: string) => Math.ceil((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);

export const DebtsView = ({ onBack, onChanged, onRecordTransaction }: DebtsViewProps) => {
    const { debts } = useFinanceStore();
    const [tab, setTab] = useState<'open' | 'settled'>('open');
    const [editing, setEditing] = useState<Debt | 'new' | null>(null);
    const [settling, setSettling] = useState<Debt | null>(null);

    const open = debts.filter(d => !d.settledAt);
    const owedToMe = open.filter(d => d.direction === 'owed').reduce((s, d) => s + d.amount, 0);
    const iOwe = open.filter(d => d.direction === 'owe').reduce((s, d) => s + d.amount, 0);

    const list = useMemo(() => {
        const items = debts.filter(d => (tab === 'open' ? !d.settledAt : !!d.settledAt));
        return items.sort((a, b) => {
            if (tab === 'settled') return (b.settledAt ?? '').localeCompare(a.settledAt ?? '');
            // Yang jatuh tempo paling dekat di atas
            const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return da - db;
        });
    }, [debts, tab]);

    return (
        <div>
            <SubviewHeader
                title="Utang & piutang"
                subtitle="Pinjam-meminjam dengan teman dan keluarga"
                onBack={onBack}
                action={
                    <button onClick={() => setEditing('new')} className="h-11 px-4 rounded-xl bg-rp-action hover:bg-rp-action-press text-white text-sm font-semibold flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> Catat
                    </button>
                }
            />

            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rp-card p-4">
                    <p className="text-xs text-rp-ink-2">Mereka utang ke kamu</p>
                    <p className="mt-1 text-lg font-bold text-rp-in rp-num">{formatRupiah(owedToMe)}</p>
                </div>
                <div className="rp-card p-4">
                    <p className="text-xs text-rp-ink-2">Kamu utang</p>
                    <p className="mt-1 text-lg font-bold text-rp-out rp-num">{formatRupiah(iOwe)}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 p-1 bg-rp-surface-2 rounded-xl mb-4" role="tablist">
                {(['open', 'settled'] as const).map(t => (
                    <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                        className={cn('min-h-[40px] rounded-lg text-sm font-semibold', tab === t ? 'bg-rp-surface text-rp-ink shadow-rp-1' : 'text-rp-ink-2')}>
                        {t === 'open' ? `Belum lunas (${open.length})` : 'Lunas'}
                    </button>
                ))}
            </div>

            {list.length === 0 ? (
                <div className="rp-card p-6 text-center">
                    <HandCoins className="w-8 h-8 mx-auto text-rp-ink-2" />
                    <p className="mt-3 font-semibold text-rp-ink">{tab === 'open' ? 'Tidak ada utang yang berjalan' : 'Belum ada yang lunas'}</p>
                    {tab === 'open' && <p className="mt-1 text-sm text-rp-ink-2">Catat waktu kamu meminjamkan atau meminjam uang, biar nggak lupa siapa utang ke siapa.</p>}
                </div>
            ) : (
                <ul className="rp-card divide-y divide-rp-line overflow-hidden">
                    {list.map(d => {
                        const due = d.dueDate && !d.settledAt ? daysUntil(d.dueDate) : null;
                        return (
                            <li key={d.id} className="flex items-center gap-3 p-4">
                                <button onClick={() => setEditing(d)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                                    <span className={cn('w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold',
                                        d.direction === 'owed' ? 'bg-rp-in-soft text-rp-in' : 'bg-rp-out-soft text-rp-out')}>
                                        {d.person.slice(0, 2).toUpperCase()}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-rp-ink truncate">{d.person}</span>
                                        <span className="block text-xs text-rp-ink-2 truncate">
                                            {d.direction === 'owed' ? 'Utang ke kamu' : 'Kamu utang'}
                                            {d.note ? ` · ${d.note}` : ''}
                                        </span>
                                        {due !== null && (
                                            <span className={cn('block text-xs font-medium', due < 0 ? 'text-rp-out' : due <= 3 ? 'text-rp-warn' : 'text-rp-ink-2')}>
                                                {due < 0 ? `Lewat ${-due} hari` : due === 0 ? 'Jatuh tempo hari ini' : `Jatuh tempo ${due} hari lagi`}
                                            </span>
                                        )}
                                    </span>
                                </button>
                                <span className={cn('text-sm font-bold rp-num', d.direction === 'owed' ? 'text-rp-in' : 'text-rp-out')}>
                                    {d.direction === 'owed' ? '+' : '−'}{formatRupiah(d.amount)}
                                </span>
                                {!d.settledAt && (
                                    <button onClick={() => setSettling(d)} aria-label={`Tandai lunas utang ${d.person}`}
                                        className="w-10 h-10 shrink-0 rounded-xl border border-rp-line text-rp-in flex items-center justify-center hover:bg-rp-in-soft">
                                        <Check className="w-4 h-4" />
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {editing && (
                <DebtSheet
                    debt={editing === 'new' ? undefined : editing}
                    onClose={() => setEditing(null)}
                    onSaved={async () => { setEditing(null); await onChanged(); }}
                    onRecordTransaction={onRecordTransaction}
                />
            )}
            {settling && (
                <SettleSheet
                    debt={settling}
                    onClose={() => setSettling(null)}
                    onDone={async () => { setSettling(null); await onChanged(); }}
                    onRecordTransaction={onRecordTransaction}
                />
            )}
        </div>
    );
};

const AccountSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
    const accounts = useFinanceStore(s => s.accounts);
    return (
        <select value={value} onChange={e => onChange(e.target.value)} className={fieldClass}>
            <option value="">Jangan catat ke dompet</option>
            {accounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
        </select>
    );
};

const DebtSheet = ({ debt, onClose, onSaved, onRecordTransaction }: {
    debt?: Debt;
    onClose: () => void;
    onSaved: () => Promise<void>;
    onRecordTransaction: DebtsViewProps['onRecordTransaction'];
}) => {
    const { saveDebt, deleteDebt } = usePlanning();
    const [direction, setDirection] = useState<Debt['direction']>(debt?.direction ?? 'owed');
    const [person, setPerson] = useState(debt?.person ?? '');
    const [amount, setAmount] = useState<number | ''>(debt?.amount ?? '');
    const [note, setNote] = useState(debt?.note ?? '');
    const [dueDate, setDueDate] = useState(debt?.dueDate ?? '');
    const [account, setAccount] = useState('');
    const [busy, setBusy] = useState(false);

    const save = async () => {
        if (!person.trim() || !amount) return toast.error('Isi nama dan nominal dulu.');
        setBusy(true);
        const ok = await saveDebt({ id: debt?.id, person, direction, amount, note, dueDate: dueDate || undefined, settledAt: debt?.settledAt });
        if (ok && !debt && account) {
            await onRecordTransaction({
                type: direction === 'owed' ? 'expense' : 'income',
                category: DEBT_CATEGORY,
                amount,
                account,
                description: direction === 'owed' ? `Pinjamkan ke ${person.trim()}` : `Pinjam dari ${person.trim()}`,
            });
        }
        setBusy(false);
        if (!ok) return toast.error('Gagal menyimpan. Sudah jalankan migrasi 20261124030000?');
        toast.success('Tersimpan.');
        await onSaved();
    };

    const remove = async () => {
        if (!debt || !window.confirm(`Hapus catatan utang ${debt.person}?`)) return;
        if (await deleteDebt(debt.id)) await onSaved();
    };

    return (
        <Sheet title={debt ? 'Ubah catatan' : 'Catat utang / piutang'} onClose={onClose}
            footer={
                <div className="flex gap-2">
                    {debt && (
                        <button onClick={remove} aria-label="Hapus" className="h-12 w-12 shrink-0 rounded-xl border border-rp-line text-rp-out flex items-center justify-center">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <PrimaryButton onClick={save} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</PrimaryButton>
                </div>
            }>
            <div className="grid grid-cols-2 p-1 bg-rp-surface-2 rounded-xl">
                {([['owed', 'Dia utang ke aku'], ['owe', 'Aku utang ke dia']] as const).map(([v, label]) => (
                    <button key={v} onClick={() => setDirection(v)}
                        className={cn('min-h-[44px] rounded-lg text-sm font-semibold', direction === v ? 'bg-rp-surface text-rp-ink shadow-rp-1' : 'text-rp-ink-2')}>
                        {label}
                    </button>
                ))}
            </div>
            <Field label="Nama"><input value={person} onChange={e => setPerson(e.target.value)} placeholder="mis. Budi" className={fieldClass} /></Field>
            <Field label="Nominal"><MoneyInput value={amount} onChange={setAmount} /></Field>
            <Field label="Catatan (opsional)"><input value={note} onChange={e => setNote(e.target.value)} placeholder="mis. talangin makan siang" className={fieldClass} /></Field>
            <Field label="Jatuh tempo (opsional)" hint="Kamu akan diingatkan sehari sebelumnya.">
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={fieldClass} />
            </Field>
            {!debt && (
                <Field label={direction === 'owed' ? 'Uangnya keluar dari dompet' : 'Uangnya masuk ke dompet'}
                    hint="Saldo dompet ikut berubah, tapi tidak dihitung sebagai pengeluaran/pemasukan.">
                    <AccountSelect value={account} onChange={setAccount} />
                </Field>
            )}
        </Sheet>
    );
};

const SettleSheet = ({ debt, onClose, onDone, onRecordTransaction }: {
    debt: Debt;
    onClose: () => void;
    onDone: () => Promise<void>;
    onRecordTransaction: DebtsViewProps['onRecordTransaction'];
}) => {
    const { saveDebt } = usePlanning();
    const [account, setAccount] = useState('');
    const [busy, setBusy] = useState(false);

    const settle = async () => {
        setBusy(true);
        const ok = await saveDebt({ ...debt, settledAt: new Date().toISOString() });
        if (ok && account) {
            await onRecordTransaction({
                type: debt.direction === 'owed' ? 'income' : 'expense',
                category: DEBT_CATEGORY,
                amount: debt.amount,
                account,
                description: debt.direction === 'owed' ? `Pelunasan dari ${debt.person}` : `Bayar utang ke ${debt.person}`,
            });
        }
        setBusy(false);
        if (!ok) return toast.error('Gagal menyimpan.');
        toast.success(`Utang ${debt.person} lunas.`);
        await onDone();
    };

    return (
        <Sheet title="Tandai lunas" onClose={onClose}
            footer={<PrimaryButton onClick={settle} disabled={busy}>{busy ? 'Menyimpan…' : 'Lunas'}</PrimaryButton>}>
            <p className="text-sm text-rp-ink">
                {debt.direction === 'owed' ? `${debt.person} sudah bayar` : `Kamu sudah bayar ke ${debt.person}`}{' '}
                <span className="font-semibold rp-num">{formatRupiah(debt.amount)}</span>.
            </p>
            <Field label={debt.direction === 'owed' ? 'Uangnya masuk ke' : 'Dibayar dari'}>
                <AccountSelect value={account} onChange={setAccount} />
            </Field>
        </Sheet>
    );
};

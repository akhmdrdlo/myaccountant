import { useState } from 'react';
import { toast } from 'sonner';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { usePlanning } from '../../hooks/usePlanning';
import { SubviewHeader } from '../layout/SubviewHeader';
import { InstitutionLogo } from '../common/InstitutionLogo';
import { Field, MoneyInput, PrimaryButton, Sheet, fieldClass } from '../common/Sheet';
import { institutionForAccount } from '../../lib/institutions';
import { inPeriod } from '../../lib/period';
import { cn, formatRupiah } from '../../lib/utils';
import type { Installment, TransactionInput } from '../../types';

interface InstallmentsViewProps {
    onBack: () => void;
    onChanged: () => Promise<void> | void;
    onRecordTransaction: (input: TransactionInput) => Promise<boolean>;
}

export const InstallmentsView = ({ onBack, onChanged, onRecordTransaction }: InstallmentsViewProps) => {
    const { installments, transactions, period, accounts } = useFinanceStore();
    const { saveInstallment } = usePlanning();
    const [editing, setEditing] = useState<Installment | 'new' | null>(null);
    const [paying, setPaying] = useState<string | null>(null);

    const active = installments.filter(i => i.paidMonths < i.totalMonths);
    const done = installments.filter(i => i.paidMonths >= i.totalMonths);
    const perMonth = active.reduce((s, i) => s + i.monthlyAmount, 0);
    const remaining = active.reduce((s, i) => s + i.monthlyAmount * (i.totalMonths - i.paidMonths), 0);

    const paidThisPeriod = (i: Installment) =>
        transactions.some(t => inPeriod(t.timestamp, period) && t.description.startsWith(`Cicilan ${i.name}`));

    const pay = async (i: Installment) => {
        const account = i.account ?? accounts.find(a => institutionForAccount(a).kind === 'cash')?.name ?? accounts[0]?.name;
        if (!account) return toast.error('Tambahkan dompet dulu.');
        setPaying(i.id);
        const next = i.paidMonths + 1;
        const recorded = await onRecordTransaction({
            type: 'expense',
            category: 'Cicilan',
            amount: i.monthlyAmount,
            account,
            description: `Cicilan ${i.name} (${next}/${i.totalMonths})`,
        });
        const ok = recorded && (await saveInstallment({ ...i, paidMonths: next }));
        setPaying(null);
        if (!ok) return toast.error('Gagal mencatat pembayaran.');
        toast.success(next >= i.totalMonths ? `${i.name} lunas.` : `Cicilan ${i.name} ke-${next} tercatat.`);
        await onChanged();
    };

    return (
        <div>
            <SubviewHeader
                title="Cicilan & paylater"
                subtitle="Tagihan bulanan yang ada ujungnya"
                onBack={onBack}
                action={
                    <button onClick={() => setEditing('new')} className="h-11 px-4 rounded-xl bg-rp-action hover:bg-rp-action-press text-white text-sm font-semibold flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> Tambah
                    </button>
                }
            />

            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rp-card p-4">
                    <p className="text-xs text-rp-ink-2">Bayar tiap bulan</p>
                    <p className="mt-1 text-lg font-bold text-rp-ink rp-num">{formatRupiah(perMonth)}</p>
                </div>
                <div className="rp-card p-4">
                    <p className="text-xs text-rp-ink-2">Sisa total</p>
                    <p className="mt-1 text-lg font-bold text-rp-out rp-num">{formatRupiah(remaining)}</p>
                </div>
            </div>

            {installments.length === 0 ? (
                <div className="rp-card p-6 text-center">
                    <CreditCard className="w-8 h-8 mx-auto text-rp-ink-2" />
                    <p className="mt-3 font-semibold text-rp-ink">Belum ada cicilan</p>
                    <p className="mt-1 text-sm text-rp-ink-2">Masukkan SPayLater, kredit HP, atau cicilan motor. Jatah harianmu otomatis dipotong tagihan yang jatuh tempo sebelum gajian.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {[...active, ...done].map(i => {
                        const finished = i.paidMonths >= i.totalMonths;
                        const paid = paidThisPeriod(i);
                        const pct = (i.paidMonths / i.totalMonths) * 100;
                        const inst = institutionForAccount({ name: i.account ?? i.name });
                        return (
                            <li key={i.id} className={cn('rp-card p-4', finished && 'opacity-70')}>
                                <button onClick={() => setEditing(i)} className="w-full flex items-center gap-3 text-left">
                                    <InstitutionLogo institution={inst} />
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-semibold text-rp-ink truncate">{i.name}</span>
                                        <span className="block text-xs text-rp-ink-2">
                                            {finished ? 'Lunas' : `Tanggal ${i.dueDay} · sisa ${i.totalMonths - i.paidMonths} bulan`}
                                        </span>
                                    </span>
                                    <span className="text-sm font-bold text-rp-ink rp-num">{formatRupiah(i.monthlyAmount)}</span>
                                </button>
                                <div className="mt-3 flex items-center gap-3">
                                    <div className="flex-1">
                                        <div className="h-2 rounded-full bg-rp-surface-2 overflow-hidden">
                                            <div className="h-full bg-rp-royal rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                        <p className="mt-1 text-xs text-rp-ink-2 rp-num">{i.paidMonths}/{i.totalMonths} bulan terbayar</p>
                                    </div>
                                    {!finished && (
                                        <button
                                            onClick={() => pay(i)}
                                            disabled={paid || paying === i.id}
                                            className={cn('h-10 px-3 rounded-xl text-sm font-semibold shrink-0',
                                                paid ? 'bg-rp-in-soft text-rp-in' : 'bg-rp-surface-2 text-rp-royal disabled:opacity-60')}
                                        >
                                            {paid ? 'Sudah dibayar' : paying === i.id ? 'Mencatat…' : 'Bayar bulan ini'}
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {editing && (
                <InstallmentSheet
                    installment={editing === 'new' ? undefined : editing}
                    onClose={() => setEditing(null)}
                    onSaved={async () => { setEditing(null); await onChanged(); }}
                />
            )}
        </div>
    );
};

const InstallmentSheet = ({ installment, onClose, onSaved }: {
    installment?: Installment;
    onClose: () => void;
    onSaved: () => Promise<void>;
}) => {
    const { saveInstallment, deleteInstallment } = usePlanning();
    const accounts = useFinanceStore(s => s.accounts);
    const [name, setName] = useState(installment?.name ?? '');
    const [monthly, setMonthly] = useState<number | ''>(installment?.monthlyAmount ?? '');
    const [total, setTotal] = useState(String(installment?.totalMonths ?? 12));
    const [paid, setPaid] = useState(String(installment?.paidMonths ?? 0));
    const [dueDay, setDueDay] = useState(String(installment?.dueDay ?? 5));
    const [account, setAccount] = useState(installment?.account ?? '');
    const [busy, setBusy] = useState(false);

    const save = async () => {
        const totalMonths = Number(total);
        const paidMonths = Number(paid);
        const day = Number(dueDay);
        if (!name.trim() || !monthly) return toast.error('Isi nama dan nominal per bulan.');
        if (!(totalMonths >= 1 && totalMonths <= 360)) return toast.error('Tenor 1–360 bulan.');
        if (!(paidMonths >= 0 && paidMonths <= totalMonths)) return toast.error('Bulan terbayar tidak boleh melebihi tenor.');
        if (!(day >= 1 && day <= 31)) return toast.error('Tanggal jatuh tempo 1–31.');
        setBusy(true);
        const ok = await saveInstallment({ id: installment?.id, name, monthlyAmount: monthly, totalMonths, paidMonths, dueDay: day, account: account || undefined });
        setBusy(false);
        if (!ok) return toast.error('Gagal menyimpan. Sudah jalankan migrasi 20261124030000?');
        await onSaved();
    };

    const remove = async () => {
        if (!installment || !window.confirm(`Hapus cicilan ${installment.name}? Transaksi pembayaran yang sudah tercatat tetap ada.`)) return;
        if (await deleteInstallment(installment.id)) await onSaved();
    };

    return (
        <Sheet title={installment ? 'Ubah cicilan' : 'Tambah cicilan'} onClose={onClose}
            footer={
                <div className="flex gap-2">
                    {installment && (
                        <button onClick={remove} aria-label="Hapus" className="h-12 w-12 shrink-0 rounded-xl border border-rp-line text-rp-out flex items-center justify-center">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <PrimaryButton onClick={save} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</PrimaryButton>
                </div>
            }>
            <Field label="Nama"><input value={name} onChange={e => setName(e.target.value)} placeholder="mis. SPayLater HP, Motor Vario" className={fieldClass} /></Field>
            <Field label="Bayar per bulan"><MoneyInput value={monthly} onChange={setMonthly} /></Field>
            <div className="grid grid-cols-3 gap-2">
                <Field label="Tenor"><input inputMode="numeric" value={total} onChange={e => setTotal(e.target.value.replace(/\D/g, ''))} className={`${fieldClass} rp-num`} /></Field>
                <Field label="Sudah bayar"><input inputMode="numeric" value={paid} onChange={e => setPaid(e.target.value.replace(/\D/g, ''))} className={`${fieldClass} rp-num`} /></Field>
                <Field label="Tgl tempo"><input inputMode="numeric" value={dueDay} onChange={e => setDueDay(e.target.value.replace(/\D/g, ''))} className={`${fieldClass} rp-num`} /></Field>
            </div>
            <Field label="Dibayar dari" hint="Pilih akun paylater-nya kalau cicilan ini memang tagihan paylater.">
                <select value={account} onChange={e => setAccount(e.target.value)} className={fieldClass}>
                    <option value="">Pilih saat bayar (dompet tunai)</option>
                    {accounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                </select>
            </Field>
        </Sheet>
    );
};

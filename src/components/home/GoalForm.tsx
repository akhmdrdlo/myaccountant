import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Goal } from '../../types';
import { Field, MoneyInput, PrimaryButton, Sheet, fieldClass } from '../common/Sheet';

interface GoalFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Goal;
    onSubmit: (goal: Goal) => void;
    onDelete?: (id: string) => void;
    defaultAmount?: number;
    /** Nama akun yang bisa ditautkan; saldo akun itu menjadi jumlah terkumpul. */
    accounts?: string[];
}

export const GoalForm = ({ isOpen, onClose, initialData, onSubmit, onDelete, defaultAmount = 0, accounts = [] }: GoalFormProps) => {
    const [name, setName] = useState('');
    const [target, setTarget] = useState<number | ''>('');
    const [current, setCurrent] = useState<number | ''>('');
    const [deadline, setDeadline] = useState('');
    const [linkedAccount, setLinkedAccount] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setName(initialData?.name ?? '');
        setTarget(initialData?.targetAmount || '');
        setCurrent(initialData ? initialData.currentAmount || '' : defaultAmount || '');
        setDeadline(initialData?.deadline ?? '');
        setLinkedAccount(initialData?.linkedAccount ?? '');
    }, [isOpen, initialData, defaultAmount]);

    if (!isOpen) return null;

    const save = () => {
        if (!name.trim()) return toast.error('Isi nama barangnya dulu.');
        if (!target) return toast.error('Isi harga targetnya.');
        onSubmit({
            id: initialData?.id || crypto.randomUUID(),
            name: name.trim(),
            targetAmount: target,
            currentAmount: linkedAccount ? 0 : Number(current) || 0,
            deadline: deadline || undefined,
            color: initialData?.color,
            linkedAccount: linkedAccount || undefined,
        });
        onClose();
    };

    return (
        <Sheet title={initialData ? 'Ubah wishlist' : 'Wishlist baru'} onClose={onClose}
            footer={
                <div className="flex gap-2">
                    {initialData && onDelete && (
                        <button onClick={() => { if (window.confirm(`Hapus "${initialData.name}"?`)) { onDelete(initialData.id); onClose(); } }}
                            aria-label="Hapus" className="h-12 w-12 shrink-0 rounded-xl border border-rp-line text-rp-out flex items-center justify-center">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <PrimaryButton onClick={save}>Simpan</PrimaryButton>
                </div>
            }>
            <Field label="Barang yang diincar"><input value={name} onChange={e => setName(e.target.value)} placeholder="mis. Laptop baru" className={fieldClass} /></Field>
            <Field label="Harga"><MoneyInput value={target} onChange={setTarget} /></Field>
            <Field label="Uangnya dari" hint={linkedAccount ? 'Terkumpul otomatis mengikuti saldo dompet ini.' : 'Isi manual berapa yang sudah terkumpul.'}>
                <select value={linkedAccount} onChange={e => setLinkedAccount(e.target.value)} className={fieldClass}>
                    <option value="">Isi manual</option>
                    {accounts.map(a => <option key={a} value={a}>Saldo {a}</option>)}
                </select>
            </Field>
            {!linkedAccount && <Field label="Sudah terkumpul"><MoneyInput value={current} onChange={setCurrent} /></Field>}
            <Field label="Target tanggal (opsional)" hint="Diisi supaya Rplanner bisa hitung berapa yang perlu disisihkan per bulan.">
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={fieldClass} />
            </Field>
        </Sheet>
    );
};

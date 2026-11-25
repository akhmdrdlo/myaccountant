import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { AI_ENABLED, AiError, aiReadReceipt } from '../../lib/ai';
import { cn, formatRupiah } from '../../lib/utils';
import type { TransactionInput } from '../../types';
import { useFinanceStore } from '../../store/useFinanceStore';
import { institutionForAccount } from '../../lib/institutions';
import { findRule } from '../../lib/merchantRules';
import { categoryIcon } from '../../lib/categoryIcons';
import { TagInput } from '../common/TagInput';
import { InstitutionLogo } from '../common/InstitutionLogo';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../lib/categories';

interface TransactionFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Partial<TransactionInput>;
    onSubmit: (data: TransactionInput) => Promise<boolean>;
    loading?: boolean;
    accounts?: { name: string; balance: number }[];
}

type FormType = 'expense' | 'income' | 'transfer' | 'adjustment';

const TYPES: { id: FormType; label: string }[] = [
    { id: 'expense', label: 'Keluar' },
    { id: 'income', label: 'Masuk' },
    { id: 'transfer', label: 'Transfer' },
    { id: 'adjustment', label: 'Koreksi' },
];

// Tebakan kategori dari kata di catatan (dipakai bila belum ada aturan merchant)
const KEYWORD_MAP: Record<string, string> = {
    makan: 'Makan Weekday', nasi: 'Makan Weekday', warteg: 'Makan Weekday', kfc: 'Makan Weekday', mcd: 'Makan Weekday',
    bakso: 'Makan Weekday', soto: 'Makan Weekday', kopi: 'Makan Weekday',
    gojek: 'Transport', goride: 'Transport', grab: 'Transport', bensin: 'Transport', parkir: 'Transport', tol: 'Transport',
    listrik: 'Utilitas', token: 'Utilitas', wifi: 'Utilitas', pulsa: 'Utilitas',
    snack: 'Jajan/Hobi', indomaret: 'Jajan/Hobi', alfamart: 'Jajan/Hobi', kos: 'Kos (Tabungan)', cicilan: 'Cicilan',
};

const shortLabel = (c: string) => c.replace(' (Tabungan)', '').replace('Transfer / Tarik Tunai', 'Tarik tunai').replace('Makan ', 'Makan ');

export const TransactionForm = ({ isOpen, onClose, initialData, onSubmit, accounts = [] }: TransactionFormProps) => {
    const storeAccounts = useFinanceStore(s => s.accounts);
    const storeExpense = useFinanceStore(s => s.expenseCategories);
    const storeIncome = useFinanceStore(s => s.incomeCategories);
    const merchantRules = useFinanceStore(s => s.merchantRules);

    const accountNames = storeAccounts.length ? storeAccounts.map(a => a.name) : ['Kantong Utama'];
    const expenseCats = [...new Set([...EXPENSE_CATEGORIES, ...(storeExpense ?? []).filter(c => !/^(Makanan & Minuman|Transportasi|Belanja|Hiburan|Tagihan)$/.test(c))])]
        .filter(c => c !== 'Transfer / Tarik Tunai');
    const incomeCats = [...new Set([...INCOME_CATEGORIES, ...(storeIncome ?? [])])].filter(c => c !== 'Transfer / Tarik Tunai');

    const [type, setType] = useState<FormType>('expense');
    const [amount, setAmount] = useState<number | ''>('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [account, setAccount] = useState('');
    const [toAccount, setToAccount] = useState('');
    const [showMore, setShowMore] = useState(false);
    const [saving, setSaving] = useState(false);
    const [scanning, setScanning] = useState(false);
    const categoryTouched = useRef(false);
    const amountRef = useRef<HTMLInputElement>(null);

    // Isi awal setiap kali dibuka
    useEffect(() => {
        if (!isOpen) return;
        const defaultAcc = storeAccounts.find(a => institutionForAccount(a).kind === 'cash')?.name ?? accountNames[0] ?? '';
        const d = initialData ?? {};
        setType((d.type as FormType) || 'expense');
        setAmount(d.amount ? Math.round(d.amount) : '');
        setCategory(d.category || '');
        setDescription(d.description || '');
        setTags(d.tags ?? []);
        setAccount(d.account || defaultAcc);
        setToAccount(d.toAccount || accountNames.find(a => a !== (d.account || defaultAcc)) || '');
        setShowMore(Boolean(d.description || d.tags?.length));
        categoryTouched.current = Boolean(d.category);
        setTimeout(() => amountRef.current?.focus(), 250);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialData]);

    // Saran kategori dari catatan: aturan yang dipelajari dulu, lalu kata kunci
    useEffect(() => {
        if (!isOpen || type !== 'expense' || categoryTouched.current || !description) return;
        const learned = findRule(merchantRules, description);
        if (learned) return setCategory(learned.category);
        const lower = description.toLowerCase();
        const hit = Object.entries(KEYWORD_MAP).find(([k]) => lower.includes(k));
        if (hit) setCategory(hit[1]);
    }, [description, type, isOpen, merchantRules]);

    const handleScanReceipt = async (file: File) => {
        setScanning(true);
        try {
            const receipt = await aiReadReceipt(file);
            if (!receipt) return toast.error('Struk tidak terbaca. Coba foto lebih dekat dan terang.');
            setType('expense');
            setAmount(receipt.total);
            setCategory(receipt.category);
            categoryTouched.current = true;
            setDescription(receipt.merchant);
            setShowMore(true);
            toast.success(`Terbaca ${receipt.merchant || 'struk'}: ${formatRupiah(receipt.total)}. Cek lalu simpan.`);
        } catch (err) {
            toast.error(err instanceof AiError ? err.message : 'Gagal membaca struk.');
        } finally {
            setScanning(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return toast.error('Isi nominalnya dulu.');
        if ((type === 'expense' || type === 'income') && !category) return toast.error('Pilih kategori dulu.');
        if (type === 'transfer' && (!toAccount || toAccount === account)) {
            return toast.error(accountNames.length < 2 ? 'Tambahkan dompet kedua dulu di menu Dompet.' : 'Pilih dompet tujuan.');
        }

        let finalType: TransactionInput['type'] = type;
        let finalAmount = amount;
        let finalCategory = category;
        let finalDescription = description.trim();

        if (type === 'adjustment') {
            // Pengguna mengisi saldo sebenarnya; yang dicatat adalah selisihnya
            const current = accounts.find(a => a.name === account)?.balance ?? 0;
            const diff = amount - current;
            if (diff === 0) {
                toast.info('Saldo sudah sama, tidak ada yang diubah.');
                return onClose();
            }
            finalType = diff > 0 ? 'income' : 'expense';
            finalAmount = Math.abs(diff);
            finalCategory = 'Penyesuaian Saldo';
            finalDescription ||= `Koreksi saldo ${diff > 0 ? '+' : '−'}${formatRupiah(Math.abs(diff))}`;
        } else if (type === 'transfer') {
            finalCategory = 'Transfer';
        }

        setSaving(true);
        const ok = await onSubmit({
            type: finalType,
            amount: finalAmount,
            category: finalCategory,
            description: finalDescription,
            account,
            toAccount: type === 'transfer' ? toAccount : undefined,
            tags: type === 'expense' || type === 'income' ? tags : undefined,
        });
        setSaving(false);
        if (ok) onClose();
    };

    const currentBalance = accounts.find(a => a.name === account)?.balance;
    const tone = type === 'income' ? 'text-rp-in' : type === 'expense' ? 'text-rp-out' : 'text-rp-ink';

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />}

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Catat transaksi"
                className={cn(
                    'fixed inset-x-0 bottom-0 z-[70] max-w-md mx-auto bg-rp-surface rounded-t-3xl shadow-rp-2 max-h-[92vh] flex flex-col transition-transform duration-200 ease-out',
                    isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none',
                )}
            >
                <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-rp-line" aria-hidden />

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                    {/* Kepala: tipe + aksi */}
                    <div className="flex items-center gap-2 px-4 pt-2">
                        <div className="flex-1 grid grid-cols-4 p-1 bg-rp-surface-2 rounded-xl" role="tablist" aria-label="Jenis transaksi">
                            {TYPES.map(t => (
                                <button key={t.id} type="button" role="tab" aria-selected={type === t.id}
                                    onClick={() => { setType(t.id); if (t.id !== type) { setCategory(''); categoryTouched.current = false; } }}
                                    className={cn('h-9 rounded-lg text-[13px] font-semibold transition',
                                        type === t.id ? 'bg-rp-surface text-rp-ink shadow-rp-1' : 'text-rp-ink-2')}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={onClose} aria-label="Tutup" className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-rp-ink-2 hover:bg-rp-surface-2">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                        {/* Nominal: fokus utama */}
                        <label className="block pt-5 pb-4 text-center">
                            <span className="block text-xs font-medium text-rp-ink-2">
                                {type === 'adjustment' ? `Saldo ${account} sebenarnya` : 'Nominal'}
                            </span>
                            <span className={cn('mt-1 flex items-baseline justify-center gap-1 font-bold rp-num', tone)}>
                                <span className="text-xl opacity-70">Rp</span>
                                <input
                                    ref={amountRef}
                                    inputMode="numeric"
                                    aria-label="Nominal"
                                    value={amount === '' ? '' : amount.toLocaleString('id-ID')}
                                    onChange={e => {
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                                        setAmount(digits ? Number(digits) : '');
                                    }}
                                    placeholder="0"
                                    style={{ width: `${Math.max(1, (amount === '' ? 1 : amount.toLocaleString('id-ID').length)) + 0.5}ch` }}
                                    className="bg-transparent text-[40px] leading-tight outline-none text-center placeholder:text-rp-line min-w-[2ch] max-w-full"
                                />
                            </span>
                            {type === 'adjustment' && currentBalance !== undefined && (
                                <span className="block text-xs text-rp-ink-2 rp-num">Tercatat sekarang {formatRupiah(currentBalance)}</span>
                            )}
                        </label>

                        {/* Dompet */}
                        <div className="flex items-center gap-2">
                            <AccountPicker label={type === 'income' ? 'Ke' : 'Dari'} value={account} options={accountNames} onChange={setAccount} storeAccounts={storeAccounts} />
                            {type === 'transfer' && (
                                <>
                                    <ArrowRight className="w-4 h-4 text-rp-ink-2 shrink-0" />
                                    <AccountPicker label="Ke" value={toAccount} options={accountNames.filter(a => a !== account)} onChange={setToAccount} storeAccounts={storeAccounts} />
                                </>
                            )}
                        </div>

                        {/* Kategori */}
                        {(type === 'expense' || type === 'income') && (
                            <div className="mt-4 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Kategori">
                                {(type === 'expense' ? expenseCats : incomeCats).map(cat => {
                                    const Icon = categoryIcon(cat);
                                    const active = category === cat;
                                    return (
                                        <button key={cat} type="button" role="radio" aria-checked={active}
                                            onClick={() => { setCategory(cat); categoryTouched.current = true; }}
                                            className={cn('flex flex-col items-center gap-1 rounded-xl py-2 px-1 border transition',
                                                active ? 'border-rp-royal bg-rp-surface-2' : 'border-transparent hover:bg-rp-surface-2')}>
                                            <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
                                                active ? (type === 'income' ? 'bg-rp-in text-white' : 'bg-rp-royal text-white') : 'bg-rp-canvas text-rp-ink-2')}>
                                                <Icon className="w-5 h-5" />
                                            </span>
                                            <span className={cn('text-[11px] leading-tight text-center line-clamp-2', active ? 'text-rp-ink font-semibold' : 'text-rp-ink-2')}>
                                                {shortLabel(cat)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Catatan (selalu) + tag (dilipat) */}
                        <input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={type === 'transfer' ? 'Catatan transfer (opsional)' : 'Catatan, mis. Kopi Kenangan'}
                            className="mt-4 w-full h-11 px-3 rounded-xl bg-rp-canvas border border-rp-line text-sm text-rp-ink placeholder:text-rp-ink-2"
                        />
                        {(type === 'expense' || type === 'income') && (
                            showMore ? (
                                <div className="mt-3"><TagInput value={tags} onChange={setTags} /></div>
                            ) : (
                                <button type="button" onClick={() => setShowMore(true)} className="mt-2 h-9 inline-flex items-center gap-1 text-sm font-medium text-rp-royal">
                                    Tambah tag <ChevronDown className="w-4 h-4" />
                                </button>
                            )
                        )}
                    </div>

                    {/* Aksi bawah */}
                    <div className="flex gap-2 px-4 pt-3 pb-safe border-t border-rp-line">
                        {AI_ENABLED && type === 'expense' && (
                            <label className={cn('h-12 px-3 shrink-0 flex items-center gap-1.5 rounded-xl bg-rp-surface-2 text-rp-royal text-sm font-semibold cursor-pointer', scanning && 'opacity-60 pointer-events-none')}>
                                <Camera className="w-5 h-5" />
                                {scanning ? 'Membaca…' : 'Struk'}
                                <input type="file" accept="image/*" capture="environment" className="sr-only"
                                    onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleScanReceipt(f); }} />
                            </label>
                        )}
                        <button type="submit" disabled={saving}
                            className="flex-1 h-12 rounded-xl bg-rp-action hover:bg-rp-action-press text-white font-semibold disabled:opacity-60 active:scale-[0.98] transition">
                            {saving ? 'Menyimpan…' : type === 'transfer' ? 'Pindahkan' : type === 'adjustment' ? 'Samakan saldo' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

const AccountPicker = ({ label, value, options, onChange, storeAccounts }: {
    label: string;
    value: string;
    options: string[];
    onChange: (v: string) => void;
    storeAccounts: { name: string; institution?: string }[];
}) => {
    const inst = institutionForAccount(storeAccounts.find(a => a.name === value) ?? { name: value || 'Lainnya' });
    return (
        <label className="relative flex-1 min-w-0 flex items-center gap-2 h-12 pl-2 pr-8 rounded-xl bg-rp-canvas border border-rp-line">
            <InstitutionLogo institution={inst} size="sm" />
            <span className="min-w-0">
                <span className="block text-[11px] leading-none text-rp-ink-2">{label}</span>
                <span className="block text-sm font-semibold text-rp-ink truncate">{value || 'Pilih dompet'}</span>
            </span>
            <ChevronDown className="absolute right-2.5 w-4 h-4 text-rp-ink-2 pointer-events-none" />
            <select value={value} onChange={e => onChange(e.target.value)} aria-label={`Dompet ${label.toLowerCase()}`}
                className="absolute inset-0 opacity-0 cursor-pointer">
                {!options.includes(value) && <option value="">Pilih dompet</option>}
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </label>
    );
};

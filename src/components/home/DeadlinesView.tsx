import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useSupabase } from '../../hooks/useSupabase';
import { SubviewHeader } from '../layout/SubviewHeader';
import { Field, MoneyInput, PrimaryButton, Sheet, fieldClass } from '../common/Sheet';
import { cn, formatRupiah, formatRupiahShort } from '../../lib/utils';
import type { Subscription } from '../../types';
import { isAutoSubEnabled, setAutoSub } from '../../lib/subscriptions';

interface DeadlinesViewProps {
    onBack: () => void;
    /** Buka layar cicilan / utang / wishlist dari item terkait */
    onOpenView?: (view: string) => void;
}

type Kind = 'subscription' | 'installment' | 'debt' | 'goal';
interface Item { key: string; kind: Kind; name: string; amount: number; date: Date; note: string; sub?: Subscription }

const KIND_LABEL: Record<Kind, string> = { subscription: 'Langganan', installment: 'Cicilan', debt: 'Utang', goal: 'Wishlist' };
const KIND_VIEW: Partial<Record<Kind, string>> = { installment: 'cicilan', debt: 'utang', goal: 'goals' };
const SUB_CATEGORIES = ['Hiburan', 'Internet', 'Produktivitas', 'Rumah Tangga', 'Lainnya'];

/** Tanggal "hari ke-N" berikutnya mulai hari ini; tanggal 31 di bulan pendek jatuh di hari terakhir. */
function nextDate(day: number, from = new Date()): Date {
    const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    for (let k = 0; k < 2; k++) {
        const last = new Date(today.getFullYear(), today.getMonth() + k + 1, 0).getDate();
        const d = new Date(today.getFullYear(), today.getMonth() + k, Math.min(day, last));
        if (d >= today) return d;
    }
    return today;
}

export const DeadlinesView = ({ onBack, onOpenView }: DeadlinesViewProps) => {
    const { subscriptions, installments, debts, goals, period, getAccountBalance } = useFinanceStore();
    const [editing, setEditing] = useState<Subscription | 'new' | null>(null);

    const items = useMemo<Item[]>(() => {
        const list: Item[] = [
            ...subscriptions.map(s => ({ key: `s-${s.id}`, kind: 'subscription' as const, name: s.name, amount: s.amount, date: nextDate(s.billingDate), note: `tiap tgl ${s.billingDate}`, sub: s })),
            ...installments.filter(i => i.paidMonths < i.totalMonths).map(i => ({
                key: `i-${i.id}`, kind: 'installment' as const, name: i.name, amount: i.monthlyAmount, date: nextDate(i.dueDay), note: `ke-${i.paidMonths + 1} dari ${i.totalMonths}`,
            })),
            ...debts.filter(d => d.direction === 'owe' && !d.settledAt && d.dueDate).map(d => ({
                key: `d-${d.id}`, kind: 'debt' as const, name: `Ke ${d.person}`, amount: d.amount, date: new Date(`${d.dueDate}T00:00`), note: d.note ?? 'utang',
            })),
            ...goals.filter(g => g.deadline).map(g => {
                const cur = g.linkedAccount ? getAccountBalance(g.linkedAccount) : g.currentAmount;
                return { key: `g-${g.id}`, kind: 'goal' as const, name: g.name, amount: Math.max(0, g.targetAmount - cur), date: new Date(`${g.deadline!.slice(0, 10)}T00:00`), note: 'sisa yang perlu dikumpulkan' };
            }).filter(g => g.amount > 0 && !isNaN(g.date.getTime())),
        ];
        return list.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [subscriptions, installments, debts, goals, getAccountBalance]);

    const beforePayday = items.filter(i => i.date < period.end && i.kind !== 'goal');
    const later = items.filter(i => !beforePayday.includes(i));
    const dueTotal = beforePayday.reduce((s, i) => s + i.amount, 0);

    return (
        <div>
            <SubviewHeader
                title="Tagihan"
                subtitle="Semua yang perlu dibayar, urut tanggal"
                onBack={onBack}
                action={
                    <button onClick={() => setEditing('new')} className="h-11 px-4 rounded-xl bg-rp-action hover:bg-rp-action-press text-white text-sm font-semibold flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> Langganan
                    </button>
                }
            />

            <AutoSubToggle />

            <section className="rp-card p-4 mb-5 flex items-center justify-between">
                <div>
                    <p className="text-sm text-rp-ink-2">Harus dibayar sebelum gajian</p>
                    <p className="text-2xl font-bold text-rp-ink rp-num">{formatRupiah(dueTotal)}</p>
                </div>
                <p className="text-right text-xs text-rp-ink-2 rp-num">{beforePayday.length} tagihan<br />{period.daysLeft} hari lagi</p>
            </section>

            {items.length === 0 ? (
                <div className="rp-card p-6 text-center">
                    <CalendarClock className="w-8 h-8 mx-auto text-rp-ink-2" />
                    <p className="mt-3 font-semibold text-rp-ink">Belum ada tagihan</p>
                    <p className="mt-1 text-sm text-rp-ink-2">Tambahkan langganan seperti Netflix, internet, atau kos. Rplanner mencatatnya otomatis tiap bulan dan mengingatkan sehari sebelumnya.</p>
                </div>
            ) : (
                <>
                    {[{ title: 'Sebelum gajian', list: beforePayday }, { title: 'Setelahnya', list: later }].map(g => g.list.length > 0 && (
                        <section key={g.title} className="mb-5">
                            <h2 className="rp-section-title mb-2">{g.title}</h2>
                            <ul className="rp-card divide-y divide-rp-line overflow-hidden">
                                {g.list.map(it => {
                                    const days = Math.round((it.date.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
                                    return (
                                        <li key={it.key}>
                                            <button
                                                onClick={() => (it.sub ? setEditing(it.sub) : KIND_VIEW[it.kind] && onOpenView?.(KIND_VIEW[it.kind]!))}
                                                className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-rp-surface-2 transition"
                                            >
                                                <span className={cn('w-11 h-11 shrink-0 rounded-xl flex flex-col items-center justify-center leading-none',
                                                    days <= 1 ? 'bg-rp-warn-soft text-rp-warn' : 'bg-rp-surface-2 text-rp-royal')}>
                                                    <span className="text-base font-bold rp-num">{it.date.getDate()}</span>
                                                    <span className="text-[10px] font-semibold uppercase">{it.date.toLocaleDateString('id-ID', { month: 'short' })}</span>
                                                </span>
                                                <span className="flex-1 min-w-0">
                                                    <span className="block text-sm font-semibold text-rp-ink truncate">{it.name}</span>
                                                    <span className="block text-xs text-rp-ink-2 truncate">
                                                        {KIND_LABEL[it.kind]} · {days === 0 ? 'hari ini' : days === 1 ? 'besok' : days < 0 ? 'lewat' : `${days} hari lagi`} · {it.note}
                                                    </span>
                                                </span>
                                                <span className="text-sm font-bold text-rp-ink rp-num">{formatRupiahShort(it.amount)}</span>
                                                <ChevronRight className="w-4 h-4 text-rp-ink-2 shrink-0" />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </>
            )}

            {editing && <SubscriptionSheet sub={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
        </div>
    );
};

const SubscriptionSheet = ({ sub, onClose }: { sub?: Subscription; onClose: () => void }) => {
    const { subscriptions, setSubscriptions } = useFinanceStore();
    const { addSubscription, deleteSubscription } = useSupabase();
    const [name, setName] = useState(sub?.name ?? '');
    const [amount, setAmount] = useState<number | ''>(sub?.amount ?? '');
    const [day, setDay] = useState(String(sub?.billingDate ?? new Date().getDate()));
    const [category, setCategory] = useState(sub?.category ?? 'Hiburan');
    const [busy, setBusy] = useState(false);

    const save = async () => {
        const d = Number(day);
        if (!name.trim() || !amount) return toast.error('Isi nama dan nominal.');
        if (!(d >= 1 && d <= 31)) return toast.error('Tanggal tagihan 1–31.');
        setBusy(true);
        const next: Subscription = { id: crypto.randomUUID(), name: name.trim(), amount, billingDate: d, category };
        // Tidak ada endpoint update: ubah = hapus lama + tambah baru
        if (sub) await deleteSubscription(sub.id);
        const ok = await addSubscription(next);
        setBusy(false);
        if (!ok) return toast.error('Gagal menyimpan langganan.');
        setSubscriptions([...subscriptions.filter(s => s.id !== sub?.id), next]);
        onClose();
    };

    const remove = async () => {
        if (!sub || !window.confirm(`Hapus langganan ${sub.name}?`)) return;
        if (await deleteSubscription(sub.id)) {
            setSubscriptions(subscriptions.filter(s => s.id !== sub.id));
            onClose();
        }
    };

    return (
        <Sheet title={sub ? 'Ubah langganan' : 'Langganan baru'} onClose={onClose}
            footer={
                <div className="flex gap-2">
                    {sub && (
                        <button onClick={remove} aria-label="Hapus" className="h-12 w-12 shrink-0 rounded-xl border border-rp-line text-rp-out flex items-center justify-center">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <PrimaryButton onClick={save} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</PrimaryButton>
                </div>
            }>
            <Field label="Nama"><input value={name} onChange={e => setName(e.target.value)} placeholder="mis. Netflix, IndiHome, Kos" className={fieldClass} /></Field>
            <div className="grid grid-cols-3 gap-2">
                <Field label="Nominal / bulan" className="col-span-2"><MoneyInput value={amount} onChange={setAmount} /></Field>
                <Field label="Tanggal"><input inputMode="numeric" value={day} onChange={e => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))} className={`${fieldClass} rp-num`} /></Field>
            </div>
            <Field label="Jenis" hint="Tercatat otomatis sebagai pengeluaran setiap bulan pada tanggalnya.">
                <select value={category} onChange={e => setCategory(e.target.value)} className={fieldClass}>
                    {SUB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
            </Field>
        </Sheet>
    );
};

/** Pencatatan langganan otomatis: mati secara bawaan, berlaku di perangkat ini. */
const AutoSubToggle = () => {
    const [on, setOn] = useState(isAutoSubEnabled);
    return (
        <button
            role="switch"
            aria-checked={on}
            onClick={() => { setAutoSub(!on); setOn(!on); toast.success(!on ? 'Langganan akan dicatat otomatis saat jatuh tempo.' : 'Langganan yang jatuh tempo akan ditanyakan dulu di beranda.'); }}
            className="w-full rp-card p-4 mb-4 flex items-center gap-3 text-left"
        >
            <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-rp-ink">Catat langganan otomatis</span>
                <span className="block text-xs text-rp-ink-2">{on ? 'Dicatat dari dompet tunai saat jatuh tempo.' : 'Mati: kamu konfirmasi dulu di beranda.'}</span>
            </span>
            <span className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${on ? 'bg-rp-royal' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
            </span>
        </button>
    );
};

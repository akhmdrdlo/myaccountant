import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, Inbox, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { TransactionDraft } from '../../hooks/useDrafts';
import { SubviewHeader } from '../layout/SubviewHeader';
import { cn, formatRupiah } from '../../lib/utils';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../lib/categories';
import { guessInstitution, institutionForAccount } from '../../lib/institutions';
import { findRule } from '../../lib/merchantRules';
import { useFinanceStore } from '../../store/useFinanceStore';

type AccountOption = { name: string; institution?: string };

export interface DraftConfirmation {
    category: string;
    account: string;
}

interface DraftInboxProps {
    drafts: TransactionDraft[];
    accounts: AccountOption[];
    onConfirm: (draft: TransactionDraft, value: DraftConfirmation) => Promise<boolean>;
    onDismiss: (draft: TransactionDraft) => void;
    onBack: () => void;
    onOpenSetup: () => void;
}

export function matchAccount(hint: string | undefined, accounts: AccountOption[]): string {
    const inst = guessInstitution(hint);
    if (inst) {
        const byInst = accounts.find(a => institutionForAccount(a).id === inst.id);
        if (byInst) return byInst.name;
    }
    if (hint) {
        const h = hint.toLowerCase();
        const byName = accounts.find(a => a.name.toLowerCase().includes(h));
        if (byName) return byName.name;
    }
    return accounts.find(a => institutionForAccount(a).kind !== 'cash')?.name ?? accounts[0]?.name ?? 'Kantong Utama';
}

export const DraftInbox = ({ drafts, accounts, onConfirm, onDismiss, onBack, onOpenSetup }: DraftInboxProps) => (
    <div>
        <SubviewHeader
            title="Transaksi terdeteksi"
            subtitle="Cek dulu, lalu simpan ke catatan"
            onBack={onBack}
        />

        {drafts.length === 0 ? (
            <div className="rp-card p-6 text-center">
                <Inbox className="w-8 h-8 mx-auto text-rp-ink-2" />
                <p className="mt-3 font-semibold text-rp-ink">Belum ada yang perlu dikonfirmasi</p>
                <p className="mt-1 text-sm text-rp-ink-2">Transaksi dari notifikasi bank, email, atau menu Bagikan akan muncul di sini.</p>
                <button onClick={onOpenSetup} className="mt-4 h-11 px-4 rounded-xl bg-rp-surface-2 text-rp-royal text-sm font-semibold">
                    Atur catat otomatis
                </button>
            </div>
        ) : (
            <ul className="space-y-3">
                {drafts.map(d => (
                    <DraftCard key={d.id} draft={d} accounts={accounts} onConfirm={onConfirm} onDismiss={onDismiss} />
                ))}
            </ul>
        )}
    </div>
);

const SOURCE_LABEL: Record<string, string> = {
    notification: 'Notifikasi',
    email: 'Email',
    share: 'Dibagikan',
    shortcut: 'Shortcut',
};

const DraftCard = ({ draft, accounts, onConfirm, onDismiss }: {
    draft: TransactionDraft;
    accounts: AccountOption[];
    onConfirm: DraftInboxProps['onConfirm'];
    onDismiss: DraftInboxProps['onDismiss'];
}) => {
    // Aturan yang dipelajari dari koreksimu didahulukan
    const rule = useFinanceStore(st => findRule(st.merchantRules, draft.merchant));
    const [category, setCategory] = useState(rule?.category ?? draft.category);
    const [account, setAccount] = useState(() =>
        rule?.account && accounts.some(a => a.name === rule.account) ? rule.account : matchAccount(draft.accountHint, accounts));
    const [saving, setSaving] = useState(false);
    const isIncome = draft.type === 'income';
    const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    return (
        <li className="rp-card p-4">
            <div className="flex items-start gap-3">
                <span className={cn('w-10 h-10 shrink-0 rounded-xl flex items-center justify-center', isIncome ? 'bg-rp-in-soft text-rp-in' : 'bg-rp-out-soft text-rp-out')}>
                    {isIncome ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </span>
                <div className="flex-1 min-w-0">
                    <p className={cn('text-lg font-bold rp-num', isIncome ? 'text-rp-in' : 'text-rp-out')}>
                        {isIncome ? '+' : '−'}{formatRupiah(draft.amount)}
                    </p>
                    <p className="text-sm text-rp-ink truncate">{draft.merchant ?? draft.accountHint ?? 'Tanpa keterangan'}</p>
                    <p className="text-xs text-rp-ink-2">
                        {SOURCE_LABEL[draft.source] ?? draft.source}
                        {draft.accountHint ? ` · ${draft.accountHint}` : ''}
                        {' · '}
                        {formatDistanceToNow(new Date(draft.occurredAt), { addSuffix: true, locale: localeId })}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
                <label className="text-xs text-rp-ink-2">
                    Kategori
                    <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-xl bg-rp-canvas border border-rp-line text-sm text-rp-ink">
                        {[...new Set([draft.category, ...categories])].map(c => <option key={c}>{c}</option>)}
                    </select>
                </label>
                <label className="text-xs text-rp-ink-2">
                    Akun
                    <select value={account} onChange={e => setAccount(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-xl bg-rp-canvas border border-rp-line text-sm text-rp-ink">
                        {accounts.map(a => <option key={a.name}>{a.name}</option>)}
                    </select>
                </label>
            </div>

            <div className="flex gap-2 mt-3">
                <button
                    onClick={() => onDismiss(draft)}
                    className="h-11 px-4 rounded-xl border border-rp-line text-sm font-semibold text-rp-ink-2 flex items-center gap-1.5"
                >
                    <X className="w-4 h-4" /> Abaikan
                </button>
                <button
                    disabled={saving}
                    onClick={async () => {
                        setSaving(true);
                        const ok = await onConfirm(draft, { category, account });
                        if (!ok) setSaving(false);
                    }}
                    className="flex-1 h-11 rounded-xl bg-rp-action hover:bg-rp-action-press disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                >
                    <Check className="w-4 h-4" /> {saving ? 'Menyimpan…' : 'Simpan'}
                </button>
            </div>
        </li>
    );
};

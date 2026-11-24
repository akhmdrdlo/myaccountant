import { useMemo, useState } from 'react';
import { Hash, X } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';

interface TagInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
}

export const normalizeTag = (t: string) => t.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, ' ').slice(0, 30);

/** Input label bebas, dengan saran dari tag yang pernah dipakai. */
export const TagInput = ({ value, onChange }: TagInputProps) => {
    const transactions = useFinanceStore(s => s.transactions);
    const [draft, setDraft] = useState('');

    const known = useMemo(() => {
        const count = new Map<string, number>();
        for (const t of transactions) for (const tag of t.tags ?? []) count.set(tag, (count.get(tag) ?? 0) + 1);
        return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
    }, [transactions]);

    const add = (raw: string) => {
        const tag = normalizeTag(raw);
        if (tag && !value.includes(tag) && value.length < 5) onChange([...value, tag]);
        setDraft('');
    };

    const q = normalizeTag(draft);
    const suggestions = known.filter(t => !value.includes(t) && (!q || t.includes(q))).slice(0, 5);

    return (
        <div>
            <div className="mt-1 flex flex-wrap items-center gap-2 min-h-[44px] px-3 py-1.5 rounded-xl bg-rp-canvas border border-rp-line focus-within:ring-2 focus-within:ring-rp-royal">
                <Hash className="w-4 h-4 text-rp-ink-2 shrink-0" />
                {value.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-rp-surface-2 text-xs font-medium text-rp-royal">
                        {t}
                        <button type="button" onClick={() => onChange(value.filter(x => x !== t))} aria-label={`Hapus tag ${t}`}
                            className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-rp-surface">
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                <input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                        if ((e.key === 'Enter' || e.key === ',') && draft.trim()) {
                            e.preventDefault();
                            add(draft);
                        } else if (e.key === 'Backspace' && !draft && value.length) {
                            onChange(value.slice(0, -1));
                        }
                    }}
                    onBlur={() => draft.trim() && add(draft)}
                    placeholder={value.length ? '' : 'mis. liburan bali'}
                    aria-label="Tambah tag"
                    className="flex-1 min-w-[100px] bg-transparent text-sm text-rp-ink placeholder:text-rp-ink-2 outline-none"
                />
            </div>
            {suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {suggestions.map(t => (
                        <button key={t} type="button" onClick={() => add(t)}
                            className="h-8 px-3 rounded-full border border-rp-line text-xs text-rp-ink-2 hover:bg-rp-surface-2">
                            #{t}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

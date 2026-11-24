import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface TransactionDraft {
    id: string;
    source: string;
    externalId: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    accountHint?: string;
    merchant?: string;
    confidence: number;
    occurredAt: string;
}

interface DraftRow {
    id: string;
    source: string;
    external_id: string;
    type: 'income' | 'expense';
    amount: number | string;
    category: string;
    account_hint: string | null;
    merchant: string | null;
    confidence: number;
    occurred_at: string;
}

const mapRow = (r: DraftRow): TransactionDraft => ({
    id: r.id,
    source: r.source,
    externalId: r.external_id,
    type: r.type,
    amount: Number(r.amount),
    category: r.category,
    accountHint: r.account_hint ?? undefined,
    merchant: r.merchant ?? undefined,
    confidence: r.confidence,
    occurredAt: r.occurred_at,
});

/** Draft transaksi hasil deteksi otomatis. `available=false` jika tabel belum dimigrasi. */
export const useDrafts = (enabled: boolean) => {
    const [drafts, setDrafts] = useState<TransactionDraft[]>([]);
    const [available, setAvailable] = useState(true);

    const refresh = useCallback(async () => {
        const { data, error } = await supabase
            .from('transaction_drafts')
            .select('*')
            .order('occurred_at', { ascending: false })
            .limit(50);
        if (error) {
            setAvailable(false);
            return;
        }
        setAvailable(true);
        setDrafts((data as DraftRow[]).map(mapRow));
    }, []);

    useEffect(() => {
        if (!enabled) return;
        refresh();

        const channel = supabase
            .channel('drafts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transaction_drafts' }, () => refresh())
            .subscribe();

        const onVisible = () => document.visibilityState === 'visible' && refresh();
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [enabled, refresh]);

    const removeDraft = useCallback(async (id: string) => {
        setDrafts(d => d.filter(x => x.id !== id));
        await supabase.from('transaction_drafts').delete().eq('id', id);
    }, []);

    return { drafts, available, refresh, removeDraft };
};

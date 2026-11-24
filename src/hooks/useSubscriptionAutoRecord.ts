import { useEffect, useRef } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useSupabase } from './useSupabase';
import { institutionForAccount } from '../lib/institutions';

const CATEGORY_MAP: Record<string, string> = {
    'Internet': 'Utilitas',
    'Hiburan': 'Jajan/Hobi',
    'Produktivitas': 'Jajan/Hobi',
    'Rumah Tangga': 'Jajan/Hobi',
    'Lainnya': 'Lainnya'
};

/**
 * Mencatat langganan yang sudah jatuh tempo bulan ini.
 * Idempoten: tiap langganan per bulan punya external_id `sub:{id}:{yyyy-mm}`,
 * dan database menolak duplikat (unique user_id+source+external_id).
 * Jalan sekali per sesi setelah data termuat.
 */
export const useSubscriptionAutoRecord = (onRecorded?: () => void) => {
    const { subscriptions, transactions, loading, accounts } = useFinanceStore();
    const { addTransaction } = useSupabase();
    const ranRef = useRef(false);

    useEffect(() => {
        if (ranRef.current || loading || subscriptions.length === 0 || accounts.length === 0) return;
        ranRef.current = true;

        (async () => {
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const account = accounts.find(a => institutionForAccount(a).kind === 'cash')?.name ?? accounts[0].name;
            let recorded = 0;

            for (const sub of subscriptions) {
                if (now.getDate() < sub.billingDate) continue;

                // Data lama (sebelum ada external_id) dikenali dari deskripsinya
                const legacyPaid = transactions.some(t => {
                    const d = new Date(t.timestamp);
                    return t.description === `Auto Sub: ${sub.name}` && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
                if (legacyPaid) continue;

                const ok = await addTransaction({
                    type: 'expense',
                    amount: sub.amount,
                    category: CATEGORY_MAP[sub.category] || 'Lainnya',
                    description: `Auto Sub: ${sub.name}`,
                    account,
                    source: 'subscription',
                    externalId: `sub:${sub.id}:${monthKey}`,
                });
                if (ok) recorded++;
            }

            if (recorded > 0) onRecorded?.();
        })();
    }, [subscriptions, transactions, loading, accounts, addTransaction, onRecorded]);
};

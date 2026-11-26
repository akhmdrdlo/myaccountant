import { useEffect, useRef } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useSupabase } from './useSupabase';
import { institutionForAccount } from '../lib/institutions';
import { dueUnpaid, isAutoSubEnabled, subscriptionTransaction } from '../lib/subscriptions';

/**
 * Pencatatan langganan otomatis. MATI secara bawaan: tanpa izin pengguna, langganan
 * yang jatuh tempo ditampilkan di beranda untuk dikonfirmasi (lihat DueBillsCard).
 * Bila dinyalakan di layar Tagihan, jalan sekali per sesi setelah data benar-benar termuat.
 */
export const useSubscriptionAutoRecord = (onRecorded?: () => void) => {
    const { subscriptions, transactions, loading, accounts } = useFinanceStore();
    const { addTransaction } = useSupabase();
    const ranRef = useRef(false);
    const sawLoading = useRef(false);

    useEffect(() => {
        if (loading) sawLoading.current = true;
        // Tunggu sampai data dari server selesai dimuat sekali, supaya transaksi yang sudah ada ikut dicek
        if (ranRef.current || loading || !sawLoading.current || !isAutoSubEnabled()) return;
        if (subscriptions.length === 0 || accounts.length === 0) return;
        ranRef.current = true;

        (async () => {
            const account = accounts.find(a => institutionForAccount(a).kind === 'cash')?.name ?? accounts[0].name;
            let recorded = 0;
            for (const sub of dueUnpaid(subscriptions, transactions)) {
                if (await addTransaction(subscriptionTransaction(sub, account))) recorded++;
            }
            if (recorded > 0) onRecorded?.();
        })();
    }, [subscriptions, transactions, loading, accounts, addTransaction, onRecorded]);
};

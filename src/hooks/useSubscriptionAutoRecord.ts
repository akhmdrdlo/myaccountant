import { useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import type { TransactionInput } from '../types';

const CATEGORY_MAP: Record<string, string> = {
    'Internet': 'Utilitas',
    'Hiburan': 'Jajan/Hobi',
    'Produktivitas': 'Jajan/Hobi',
    'Rumah Tangga': 'Jajan/Hobi',
    'Lainnya': 'Lainnya'
};

export const useSubscriptionAutoRecord = () => {
    const { subscriptions, transactions, loading } = useFinanceStore();
    const { addTransaction } = useGoogleSheets();

    useEffect(() => {
        if (loading || subscriptions.length === 0 || transactions.length === 0) return;

        const checkAndRecord = async () => {
            const now = new Date();
            const currentDay = now.getDate();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            for (const sub of subscriptions) {
                // 1. Is it due? (Today >= Billing Date)
                if (currentDay >= sub.billingDate) {

                    // 2. Check if already paid THIS MONTH
                    // Look for transaction with description "Auto Sub: {Name}" in current month
                    const isPaid = transactions.some(t => {
                        const tDate = new Date(t.timestamp);
                        const isSameMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
                        const isAutoSub = t.description === `Auto Sub: ${sub.name}`;
                        return isSameMonth && isAutoSub;
                    });

                    if (!isPaid) {
                        console.log(`Auto-recording subscription: ${sub.name}`);

                        // 3. Create Transaction
                        const newTx: TransactionInput = {
                            type: 'expense',
                            amount: sub.amount,
                            category: CATEGORY_MAP[sub.category] || 'Lainnya',
                            description: `Auto Sub: ${sub.name}`,
                            account: 'Cash', // User requested 'Cash'
                        };

                        // We use the hook's function directly. 
                        // Note: In a real app, we might want to batch this or ask for confirmation,
                        // but "Auto" implies automatic.
                        await addTransaction(newTx);

                        // Small delay to prevent race conditions if multiple subs trigger at once
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }
        };

        checkAndRecord();

    }, [subscriptions, transactions, loading, addTransaction]);
};

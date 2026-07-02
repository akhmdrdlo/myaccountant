import { useState, useCallback } from 'react';
import type { Transaction, TransactionInput, Goal, Budget, Subscription, Investment } from '../types';
import { localDb } from '../services/localDb';

export const useGoogleSheets = () => {
    const [loading, setLoading] = useState(false);
    const [error] = useState<string | null>(null);

    const fetchTransactions = useCallback(async (): Promise<{ transactions: Transaction[], metadata?: any, goals?: Goal[], budgets?: Budget[], subscriptions?: Subscription[], investments?: Investment[] }> => {
        setLoading(true);
        // Add a micro-delay to simulate fetch behavior nicely
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
            const data = await localDb.syncWithBackend();
            console.log(`[localDb] Loaded: ${data.transactions.length} tx, ${data.goals.length} goals, ${data.subscriptions.length} subs, ${data.investments.length} investments`);
            return data;
        } catch (err: any) {
            console.error("Fetch Error:", err);
            return { transactions: [] };
        } finally {
            setLoading(false);
        }
    }, []);

    const addTransaction = useCallback(async (transaction: TransactionInput & { id?: string }) => {
        try {
            const current = localDb.loadAllData();
            const newTx: Transaction = {
                id: transaction.id || crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                status: 'completed',
                type: transaction.type,
                category: transaction.category,
                amount: transaction.amount,
                description: transaction.description || '',
                account: transaction.account,
                toAccount: transaction.toAccount
            };
            
            const updated = [newTx, ...current.transactions];
            localDb.saveTransactions(updated);
            return true;
        } catch (err) {
            console.error("Error adding transaction:", err);
            return false;
        }
    }, []);

    const addGoal = useCallback(async (goal: Goal) => {
        try {
            const current = localDb.loadAllData();
            const updated = [...current.goals, goal];
            localDb.saveGoals(updated);
            return true;
        } catch (err) {
            console.error("Error adding goal:", err);
            return false;
        }
    }, []);

    const updateGoal = useCallback(async (goal: Goal) => {
        try {
            const current = localDb.loadAllData();
            const updated = current.goals.map(g => g.id === goal.id ? goal : g);
            localDb.saveGoals(updated);
            return true;
        } catch (err) {
            console.error("Error updating goal:", err);
            return false;
        }
    }, []);

    const deleteGoal = useCallback(async (id: string) => {
        try {
            const current = localDb.loadAllData();
            const updated = current.goals.filter(g => g.id !== id);
            localDb.saveGoals(updated);
            return true;
        } catch (err) {
            console.error("Error deleting goal:", err);
            return false;
        }
    }, []);

    const saveBudgets = useCallback(async (budgets: Budget[]) => {
        try {
            localDb.saveBudgets(budgets);
            return true;
        } catch (err) {
            console.error("Error saving budgets:", err);
            return false;
        }
    }, []);

    const addSubscription = useCallback(async (sub: Subscription) => {
        try {
            const current = localDb.loadAllData();
            const updated = [...current.subscriptions, sub];
            localDb.saveSubscriptions(updated);
            return true;
        } catch (err) {
            console.error("Error adding subscription:", err);
            return false;
        }
    }, []);

    const deleteSubscription = useCallback(async (id: string) => {
        try {
            const current = localDb.loadAllData();
            const updated = current.subscriptions.filter(s => s.id !== id);
            localDb.saveSubscriptions(updated);
            return true;
        } catch (err) {
            console.error("Error deleting subscription:", err);
            return false;
        }
    }, []);

    const addInvestment = useCallback(async (inv: Investment) => {
        try {
            const current = localDb.loadAllData();
            const updated = [...current.investments, inv];
            localDb.saveInvestments(updated);
            return true;
        } catch (err) {
            console.error("Error adding investment:", err);
            return false;
        }
    }, []);

    const updateInvestment = useCallback(async (inv: Investment) => {
        try {
            const current = localDb.loadAllData();
            const updated = current.investments.map(i => i.id === inv.id ? inv : i);
            localDb.saveInvestments(updated);
            return true;
        } catch (err) {
            console.error("Error updating investment:", err);
            return false;
        }
    }, []);

    const deleteInvestment = useCallback(async (id: string) => {
        try {
            const current = localDb.loadAllData();
            const updated = current.investments.filter(i => i.id !== id);
            localDb.saveInvestments(updated);
            return true;
        } catch (err) {
            console.error("Error deleting investment:", err);
            return false;
        }
    }, []);

    return {
        fetchTransactions,
        addTransaction,
        addGoal,
        updateGoal,
        deleteGoal,
        saveBudgets,
        addSubscription,
        deleteSubscription,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        loading,
        error
    };
};

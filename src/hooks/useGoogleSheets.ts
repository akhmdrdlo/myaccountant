import { useState, useCallback } from 'react';
import axios from 'axios';
import type { Transaction, TransactionInput, ApiResponse, Goal, Budget, Subscription } from '../types';

// TODO: User needs to provide this URL. Using placeholder for now.
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';

// Mock Data for development/demo
const MOCK_TRANSACTIONS: Transaction[] = [
    { id: '1', timestamp: new Date().toISOString(), type: 'income', category: 'Gaji', amount: 5000000, description: 'Gaji Bulanan', account: 'Bank BTN', status: 'completed' },
];

export const useGoogleSheets = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = useCallback(async (): Promise<{ transactions: Transaction[], metadata?: any, goals?: Goal[], budgets?: Budget[], subscriptions?: Subscription[] }> => {
        setLoading(true);
        setError(null);

        if (!GOOGLE_SCRIPT_URL) {
            console.warn("Google Script URL is not set. Using Mock Data.");
            await new Promise(resolve => setTimeout(resolve, 1000));
            setLoading(false);
            return {
                transactions: MOCK_TRANSACTIONS,
                goals: [],
                budgets: [],
                subscriptions: [] // Mock empty or some defaults if you want
            };
        }

        try {
            const response = await axios.get<ApiResponse<Transaction[]>>(GOOGLE_SCRIPT_URL);
            if (response.data.status === 'success' && response.data.data) {
                // ... (Transaction cleaning logic remains same, condensed for brevity) ...
                const cleanData = response.data.data.filter(item => item.amount).map(item => ({
                    ...item,
                    id: item.id || crypto.randomUUID(),
                    timestamp: item.timestamp || new Date().toISOString()
                }));

                const goals = response.data.goals ? response.data.goals.map((g: any) => ({
                    id: g.id || crypto.randomUUID(),
                    name: g.name,
                    targetAmount: Number(g.target_amount) || 0,
                    currentAmount: !isNaN(Number(g.current_amount)) && g.current_amount !== '' ? Number(g.current_amount) : g.current_amount,
                    deadline: g.deadline,
                    color: g.color
                })) : [];

                const budgets = response.data.budgets ? response.data.budgets.map((b: any) => ({
                    category: b.category,
                    limit: Number(b.limit) || 0
                })) : [];

                // New: Parse Subscriptions
                // API should return 'subscriptions' key
                const subscriptions: Subscription[] = (response.data as any).subscriptions ? (response.data as any).subscriptions.map((s: any) => ({
                    id: s.id || crypto.randomUUID(),
                    name: s.name,
                    amount: Number(s.amount) || 0,
                    billingDate: Number(s.billing_date) || 1,
                    category: s.category || 'General'
                })) : [];

                return {
                    transactions: cleanData,
                    metadata: response.data.metadata,
                    goals,
                    budgets,
                    subscriptions
                };
            } else {
                return { transactions: [] };
            }
        } catch (err: any) {
            console.error("Fetch Error:", err);
            return { transactions: [] };
        } finally {
            setLoading(false);
        }
    }, []);

    // Helper to send data to GAS
    const sendToGas = async (action: string, payload: any) => {
        if (!GOOGLE_SCRIPT_URL) return true;

        try {
            const formData = new URLSearchParams();
            formData.append('action', action);
            formData.append('data', JSON.stringify(payload));

            // Legacy/Robustness: Append individual fields too
            Object.keys(payload).forEach(key => {
                const value = (payload as any)[key];
                if (value !== undefined && value !== null) formData.append(key, String(value));
            });

            await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: formData });
            return true;
        } catch (error) {
            console.error(`Error ${action}:`, error);
            return false;
        }
    };

    const addGoal = useCallback((goal: Goal) => sendToGas('addGoal', goal), []);
    const updateGoal = useCallback((goal: Goal) => sendToGas('updateGoal', goal), []);
    const deleteGoal = useCallback((id: string) => sendToGas('deleteGoal', { id }), []);
    const saveBudgets = useCallback((budgets: Budget[]) => sendToGas('saveBudgets', budgets), []);
    const addTransaction = useCallback((transaction: TransactionInput & { id?: string }) => sendToGas('addTransaction', transaction), []);

    // New Subscription Actions
    const addSubscription = useCallback((sub: Subscription) => sendToGas('addSubscription', sub), []);
    const deleteSubscription = useCallback((id: string) => sendToGas('deleteSubscription', { id }), []);

    return {
        fetchTransactions,
        addTransaction,
        addGoal,
        updateGoal,
        deleteGoal,
        saveBudgets,
        addSubscription,
        deleteSubscription,
        loading,
        error
    };
};

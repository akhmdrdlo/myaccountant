import { create } from 'zustand';
import type { Transaction, Goal, Budget, Subscription, Investment } from '../types';

interface FinanceStore {
    transactions: Transaction[];
    accounts: { name: string; initialBalance: number; color?: string; icon?: string }[];
    balance: number;
    monthlyIncome: number;
    monthlyExpense: number;
    dailySafeLimit: number;
    expenseCategories: string[];
    incomeCategories: string[];
    goals: Goal[];
    budgets: Budget[];
    subscriptions: Subscription[];
    investments: Investment[];
    loading: boolean;
    error: string | null;

    setTransactions: (transactions: Transaction[]) => void;
    setMetadata: (metadata: any) => void;
    addTransactionOptimistic: (transaction: Transaction) => void;
    removeTransactionOptimistic: (id: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    getAccountBalances: () => { name: string; balance: number; color: string; icon?: string }[];
    getSeabankBalance: () => number;
    setGoals: (goals: Goal[]) => void;
    setBudgets: (budgets: Budget[]) => void;
    setSubscriptions: (subscriptions: Subscription[]) => void;
    setInvestments: (investments: Investment[]) => void;
    getInvestmentTotal: () => number;
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
    transactions: [],
    accounts: [],
    balance: 0,
    loading: false,
    error: null,

    monthlyIncome: 0,
    monthlyExpense: 0,
    dailySafeLimit: 0,
    expenseCategories: [],
    incomeCategories: [],
    goals: [],
    budgets: [],
    subscriptions: [],
    investments: [],

    setTransactions: (transactions) => {
        set((state: FinanceStore) => {
            // Calculate totals
            const totalIncome = transactions.reduce((acc, curr) => curr.type === 'income' ? acc + curr.amount : acc, 0);
            const totalExpense = transactions.reduce((acc, curr) => curr.type === 'expense' ? acc + curr.amount : acc, 0);

            // Initial Balance (Sum of all accounts' initial balances)
            const totalInitial = state.accounts.reduce((acc, curr) => acc + (curr.initialBalance || 0), 0);

            const balance = totalInitial + totalIncome - totalExpense;

            // Analytics (Current Month)
            const now = new Date();
            const monthlyTx = transactions.filter(t => {
                const d = new Date(t.timestamp);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });

            const monthlyIncome = monthlyTx.reduce((acc, curr) =>
                curr.type === 'income' && !['transfer / tarik tunai', 'penyesuaian saldo'].includes(curr.category.toLowerCase()) ? acc + curr.amount : acc, 0);
            const monthlyExpense = monthlyTx.reduce((acc, curr) =>
                curr.type === 'expense' && !['transfer / tarik tunai', 'penyesuaian saldo'].includes(curr.category.toLowerCase()) ? acc + curr.amount : acc, 0);

            // Daily Safe Limit Logic
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);
            const dailySafeLimit = balance > 0 ? balance / daysRemaining : 0;

            return { transactions, balance, monthlyIncome, monthlyExpense, dailySafeLimit };
        });
    },

    setMetadata: (metadata: any) => {
        set((state: FinanceStore) => {
            // Recalculate balance with new initial balances
            const accounts = metadata.accounts || [];
            const expenseCategories = metadata.expenseCategories || [];
            const incomeCategories = metadata.incomeCategories || [];

            const totalInitial = accounts.reduce((acc: number, curr: any) => acc + (curr.initialBalance || 0), 0);
            const totalIncome = state.transactions.reduce((acc, curr) => curr.type === 'income' ? acc + curr.amount : acc, 0);
            const totalExpense = state.transactions.reduce((acc, curr) => curr.type === 'expense' ? acc + curr.amount : acc, 0);

            const balance = totalInitial + totalIncome - totalExpense;

            // Recalculate Safe Limit
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);
            const dailySafeLimit = balance > 0 ? balance / daysRemaining : 0;

            return {
                accounts,
                expenseCategories,
                incomeCategories,
                balance,
                dailySafeLimit
            };
        });
    },

    addTransactionOptimistic: (transaction) => {
        set((state: FinanceStore) => {
            const newTransactions = [transaction, ...state.transactions];
            const newBalance = transaction.type === 'income'
                ? state.balance + transaction.amount
                : state.balance - transaction.amount;
            return { transactions: newTransactions, balance: newBalance };
        });
    },

    removeTransactionOptimistic: (id) => {
        // Useful for rollback on error
        set((state: FinanceStore) => {
            const txToRemove = state.transactions.find(t => t.id === id);
            if (!txToRemove) return state;

            const newTransactions = state.transactions.filter(t => t.id !== id);
            const newBalance = txToRemove.type === 'income'
                ? state.balance - txToRemove.amount
                : state.balance + txToRemove.amount;

            return { transactions: newTransactions, balance: newBalance };
        });
    },

    setLoading: (loading: boolean) => set({ loading }),
    setError: (error: string | null) => set({ error }),

    getAccountBalances: () => {
        const state = get();
        const accounts = state.accounts;
        const transactions = state.transactions;

        // Map internal account names to display colors
        // Bank BTN (Blue/Yellow), BRI (Blue/Orange), Seabank (Orange), Cash (Purple)
        const getColor = (acc: { name: string; color?: string }) => {
            if (acc.color) return acc.color;
            const low = acc.name.toLowerCase();
            if (low.includes('btn')) return "from-blue-600 to-yellow-500";
            if (low.includes('bri')) return "from-blue-700 to-orange-500";
            if (low.includes('seabank')) return "from-orange-500 to-red-500";
            if (low.includes('cash')) return "from-purple-600 to-indigo-600";
            return "from-gray-700 to-gray-900";
        };

        return accounts.map((acc: { name: string; initialBalance: number; color?: string; icon?: string }) => {
            const accIncome = transactions
                .filter((t: Transaction) => 
                    (t.account === acc.name && t.type === 'income') ||
                    (t.toAccount === acc.name && t.type === 'transfer')
                )
                .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

            const accExpense = transactions
                .filter((t: Transaction) => 
                    (t.account === acc.name && t.type === 'expense') ||
                    (t.account === acc.name && t.type === 'transfer')
                )
                .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

            return {
                name: acc.name,
                balance: (acc.initialBalance || 0) + accIncome - accExpense,
                color: getColor(acc),
                icon: acc.icon
            };
        });
    },

    getSeabankBalance: () => {
        const state = get();
        const seabankAcc = state.accounts.find(a => a.name.toLowerCase().includes('seabank'));
        if (!seabankAcc) return 0;

        const accIncome = state.transactions
            .filter((t: Transaction) => 
                (t.account === seabankAcc.name && t.type === 'income') ||
                (t.toAccount === seabankAcc.name && t.type === 'transfer')
            )
            .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

        const accExpense = state.transactions
            .filter((t: Transaction) => 
                (t.account === seabankAcc.name && t.type === 'expense') ||
                (t.account === seabankAcc.name && t.type === 'transfer')
            )
            .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

        return (seabankAcc.initialBalance || 0) + accIncome - accExpense;
    },

    setGoals: (goals) => set({ goals }),
    setBudgets: (budgets) => set({ budgets }),
    setSubscriptions: (subscriptions) => set({ subscriptions }),
    setInvestments: (investments) => set({ investments }),
    getInvestmentTotal: () => {
        const { investments } = get();
        return investments.reduce((sum, inv) => sum + (inv.currentPrice * inv.totalUnits), 0);
    },
}));

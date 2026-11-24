import { create } from 'zustand';
import type { Transaction, Goal, Budget, Subscription, Investment, Debt, Installment, MerchantRule } from '../types';
import { getPeriod, inPeriod, isNeutralCategory, type Period } from '../lib/period';

export interface AccountMeta {
    id?: string;
    name: string;
    initialBalance: number;
    /** id dari src/lib/institutions.ts */
    institution?: string;
    color?: string;
    icon?: string;
}

const PAYDAY_KEY = 'rplanner_payday';

interface FinanceStore {
    transactions: Transaction[];
    accounts: AccountMeta[];
    /** Total semua dompet (termasuk paylater yang bernilai minus) */
    balance: number;
    /** Pemasukan & pengeluaran di periode gajian berjalan (nama lama dipertahankan) */
    monthlyIncome: number;
    monthlyExpense: number;
    /** Saldo dibagi sisa hari periode — versi sederhana; lihat lib/safeToSpend untuk versi lengkap */
    dailySafeLimit: number;
    /** Tanggal gajian (1 = bulan kalender) */
    payday: number;
    period: Period;
    expenseCategories: string[];
    incomeCategories: string[];
    goals: Goal[];
    budgets: Budget[];
    subscriptions: Subscription[];
    investments: Investment[];
    debts: Debt[];
    installments: Installment[];
    merchantRules: MerchantRule[];
    loading: boolean;
    error: string | null;

    setTransactions: (transactions: Transaction[]) => void;
    setMetadata: (metadata: { accounts?: AccountMeta[]; expenseCategories?: string[]; incomeCategories?: string[] } & Record<string, unknown>) => void;
    setPayday: (payday: number) => void;
    addTransactionOptimistic: (transaction: Transaction) => void;
    removeTransactionOptimistic: (id: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    getAccountBalances: () => { name: string; balance: number; color: string; icon?: string; institution?: string }[];
    /** Saldo satu akun berdasarkan nama (0 jika tidak ada). */
    getAccountBalance: (name?: string) => number;
    setGoals: (goals: Goal[]) => void;
    setBudgets: (budgets: Budget[]) => void;
    setSubscriptions: (subscriptions: Subscription[]) => void;
    setInvestments: (investments: Investment[]) => void;
    setDebts: (debts: Debt[]) => void;
    setInstallments: (installments: Installment[]) => void;
    setMerchantRules: (rules: MerchantRule[]) => void;
    getInvestmentTotal: () => number;
}

/** Semua angka turunan dihitung di sini supaya konsisten. */
function derive(transactions: Transaction[], accounts: AccountMeta[], payday: number) {
    const live = transactions.filter(t => t.status !== 'failed');
    const totalIncome = live.reduce((s, t) => (t.type === 'income' ? s + t.amount : s), 0);
    const totalExpense = live.reduce((s, t) => (t.type === 'expense' ? s + t.amount : s), 0);
    const totalInitial = accounts.reduce((s, a) => s + (a.initialBalance || 0), 0);
    const balance = totalInitial + totalIncome - totalExpense;

    const period = getPeriod(payday);
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    for (const t of live) {
        if (!inPeriod(t.timestamp, period) || isNeutralCategory(t.category)) continue;
        if (t.type === 'income') monthlyIncome += t.amount;
        if (t.type === 'expense') monthlyExpense += t.amount;
    }
    const dailySafeLimit = balance > 0 ? balance / period.daysLeft : 0;
    return { balance, period, monthlyIncome, monthlyExpense, dailySafeLimit };
}

const initialPayday = Number(localStorage.getItem(PAYDAY_KEY)) || 1;

export const useFinanceStore = create<FinanceStore>((set, get) => ({
    transactions: [],
    accounts: [],
    balance: 0,
    loading: false,
    error: null,
    monthlyIncome: 0,
    monthlyExpense: 0,
    dailySafeLimit: 0,
    payday: initialPayday,
    period: getPeriod(initialPayday),
    expenseCategories: [],
    incomeCategories: [],
    goals: [],
    budgets: [],
    subscriptions: [],
    investments: [],
    debts: [],
    installments: [],
    merchantRules: [],

    setTransactions: (transactions) =>
        set(state => ({ transactions, ...derive(transactions, state.accounts, state.payday) })),

    setMetadata: (metadata) =>
        set(state => {
            const accounts = metadata.accounts || [];
            return {
                accounts,
                expenseCategories: metadata.expenseCategories || [],
                incomeCategories: metadata.incomeCategories || [],
                ...derive(state.transactions, accounts, state.payday),
            };
        }),

    setPayday: (payday) => {
        localStorage.setItem(PAYDAY_KEY, String(payday));
        set(state => ({ payday, ...derive(state.transactions, state.accounts, payday) }));
    },

    addTransactionOptimistic: (transaction) =>
        set(state => {
            const transactions = [transaction, ...state.transactions];
            return { transactions, ...derive(transactions, state.accounts, state.payday) };
        }),

    removeTransactionOptimistic: (id) =>
        set(state => {
            const transactions = state.transactions.filter(t => t.id !== id);
            return { transactions, ...derive(transactions, state.accounts, state.payday) };
        }),

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    getAccountBalances: () => {
        const { accounts, transactions } = get();
        return accounts.map(acc => {
            let bal = acc.initialBalance || 0;
            for (const t of transactions) {
                if (t.status === 'failed') continue;
                if (t.account === acc.name && t.type === 'income') bal += t.amount;
                if (t.account === acc.name && (t.type === 'expense' || t.type === 'transfer')) bal -= t.amount;
                if (t.toAccount === acc.name && t.type === 'transfer') bal += t.amount;
            }
            return {
                name: acc.name,
                balance: bal,
                color: acc.color || 'from-gray-700 to-gray-900',
                icon: acc.icon,
                institution: acc.institution,
            };
        });
    },

    getAccountBalance: (name) => {
        if (!name) return 0;
        return get().getAccountBalances().find(a => a.name === name)?.balance ?? 0;
    },

    setGoals: (goals) => set({ goals }),
    setBudgets: (budgets) => set({ budgets }),
    setSubscriptions: (subscriptions) => set({ subscriptions }),
    setInvestments: (investments) => set({ investments }),
    setDebts: (debts) => set({ debts }),
    setInstallments: (installments) => set({ installments }),
    setMerchantRules: (merchantRules) => set({ merchantRules }),
    getInvestmentTotal: () => get().investments.reduce((sum, inv) => sum + inv.currentPrice * inv.totalUnits, 0),
}));

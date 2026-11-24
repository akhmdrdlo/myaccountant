import type { Transaction, Goal, Budget, Subscription, Investment } from '../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/categories';

export const INITIAL_METADATA = {
    // Akun baru hanya punya satu kantong; dompet lain ditambah sendiri lewat menu Dompet.
    accounts: [
        { name: 'Kantong Utama', initialBalance: 0, institution: 'cash' }
    ] as { name: string; initialBalance: number; institution?: string }[],
    expenseCategories: EXPENSE_CATEGORIES,
    incomeCategories: INCOME_CATEGORIES
};

export const INITIAL_BUDGETS: Budget[] = [];

export const INITIAL_GOALS: Goal[] = [];

export const INITIAL_SUBSCRIPTIONS: Subscription[] = [];

export const INITIAL_INVESTMENTS: Investment[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

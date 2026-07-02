import type { Transaction, Goal, Budget, Subscription, Investment } from '../types';

export const INITIAL_METADATA = {
    accounts: [
        { name: 'Cash', initialBalance: 0 },
        { name: 'Bank Mandiri', initialBalance: 0 },
        { name: 'Gopay', initialBalance: 0 }
    ],
    expenseCategories: [
        'Makanan & Minuman',
        'Transportasi',
        'Belanja',
        'Hiburan',
        'Tagihan',
        'Lainnya'
    ],
    incomeCategories: [
        'Gaji',
        'Bonus',
        'Freelance',
        'Lainnya'
    ]
};

export const INITIAL_BUDGETS: Budget[] = [];

export const INITIAL_GOALS: Goal[] = [];

export const INITIAL_SUBSCRIPTIONS: Subscription[] = [];

export const INITIAL_INVESTMENTS: Investment[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

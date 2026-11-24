export interface Transaction {
    id: string;
    timestamp: string;
    type: 'income' | 'expense' | 'transfer' | 'adjustment';
    category: string;
    amount: number;
    description: string;
    account: string; // e.g., 'Bank BTN', 'Cash', 'Gopay'
    toAccount?: string; // For transfers
    status: 'pending' | 'completed' | 'failed';
    /** Label bebas lintas kategori, mis. 'liburan bali' */
    tags?: string[];
}

export type TransactionInput = Omit<Transaction, 'id' | 'timestamp' | 'status'>;

export interface ApiResponse<T> {
    status: 'success' | 'error';
    data?: T;
    goals?: any[];
    budgets?: any[];
    investments?: any[];
    metadata?: {
        accounts?: { name: string; initialBalance: number }[];
        expenseCategories?: string[];
        incomeCategories?: string[];
    };
    message?: string;
    id?: string;
}

export interface Investment {
    id: string;
    name: string;
    symbol?: string;
    type: string;
    averagePrice: number;
    totalUnits: number;
    currentPrice: number;
    color?: string;
}

export interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    color?: string;
    /** Jika diisi, jumlah terkumpul = saldo akun ini. */
    linkedAccount?: string;
}

export interface Budget {
    category: string;
    limit: number;
    color?: string;
    icon?: string;
}

export interface Subscription {
    id: string;
    name: string;
    amount: number;
    billingDate: number;
    category: string;
}

export interface Debt {
    id: string;
    person: string;
    /** 'owe' = aku berutang; 'owed' = orang lain berutang ke aku */
    direction: 'owe' | 'owed';
    amount: number;
    note?: string;
    dueDate?: string;
    settledAt?: string;
    createdAt: string;
}

export interface Installment {
    id: string;
    name: string;
    account?: string;
    monthlyAmount: number;
    totalMonths: number;
    paidMonths: number;
    dueDay: number;
}

export interface MerchantRule {
    merchantKey: string;
    category: string;
    account?: string;
    hits: number;
}

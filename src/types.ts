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
}

export type TransactionInput = Omit<Transaction, 'id' | 'timestamp' | 'status'>;

export interface ApiResponse<T> {
    status: 'success' | 'error';
    data?: T;
    goals?: any[];
    budgets?: any[];
    metadata?: {
        accounts?: { name: string; initialBalance: number }[];
        expenseCategories?: string[];
        incomeCategories?: string[];
    };
    message?: string;
    id?: string;
}

export interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number | string; // Allow formula strings
    deadline?: string;
    color?: string;
}

export interface Budget {
    category: string;
    limit: number;
}

export interface Subscription {
    id: string;
    name: string;
    amount: number;
    billingDate: number;
    category: string;
}

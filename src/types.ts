export interface Transaction {
    id: string;
    timestamp: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
    account: string; // e.g., 'Bank BTN', 'Cash', 'Gopay'
    status: 'pending' | 'completed' | 'failed';
}

export type TransactionInput = Omit<Transaction, 'id' | 'timestamp' | 'status'>;

export interface ApiResponse<T> {
    status: 'success' | 'error';
    data?: T;
    metadata?: {
        accounts: { name: string; initialBalance: number }[];
        expenseCategories: string[];
        incomeCategories: string[];
    };
    message?: string;
    id?: string;
}

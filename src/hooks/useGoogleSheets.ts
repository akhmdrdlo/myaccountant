import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import type { Transaction, TransactionInput, ApiResponse } from '../types';

// TODO: User needs to provide this URL. Using placeholder for now.
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';

// Mock Data for development/demo
const MOCK_TRANSACTIONS: Transaction[] = [
    { id: '1', timestamp: new Date().toISOString(), type: 'income', category: 'Gaji', amount: 5000000, description: 'Gaji Bulanan', account: 'Bank BTN', status: 'completed' },
    { id: '2', timestamp: new Date(Date.now() - 86400000).toISOString(), type: 'expense', category: 'Makan', amount: 25000, description: 'Nasi Goreng', account: 'Cash', status: 'completed' },
    { id: '3', timestamp: new Date(Date.now() - 172800000).toISOString(), type: 'expense', category: 'Transport', amount: 15000, description: 'Ojek Online', account: 'Gopay', status: 'completed' },
];

export const useGoogleSheets = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = useCallback(async (): Promise<{ transactions: Transaction[], metadata?: any }> => {
        setLoading(true);
        setError(null);

        if (!GOOGLE_SCRIPT_URL) {
            console.warn("Google Script URL is not set. Using Mock Data.");
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            setLoading(false);
            return { transactions: MOCK_TRANSACTIONS };
        }

        try {
            const response = await axios.get<ApiResponse<Transaction[]>>(GOOGLE_SCRIPT_URL);
            if (response.data.status === 'success' && response.data.data) {
                // Filter out invalid dates
                const cleanData = response.data.data.filter(item => {
                    if (!item.amount) return false; // Ensure amount exists

                    // Handle missing timestamp (default to now?) or valid date check
                    if (!item.timestamp) return true; // Let validDate helper handle it later or treat as valid? 
                    // Actually let's try to parse it. 
                    // Support standard formats if Google Sheets returns formatted text like "18/12/2024"
                    const d = new Date(item.timestamp);
                    if (!isNaN(d.getTime())) return true;

                    // Fallback for "dd/mm/yyyy" which JS hates
                    const parts = String(item.timestamp).split('/');
                    if (parts.length === 3) {
                        const d2 = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // yyyy-mm-dd
                        if (!isNaN(d2.getTime())) {
                            item.timestamp = d2.toISOString(); // Normalize it!
                            return true;
                        }
                    }

                    return false;
                });

                // Ensure ID exists
                const finalData = cleanData.map(item => ({
                    ...item,
                    id: item.id || crypto.randomUUID(),
                    timestamp: item.timestamp || new Date().toISOString()
                }));

                return { transactions: finalData, metadata: response.data.metadata };
            } else {
                // Fallback if data is weird
                return { transactions: [] };
            }
        } catch (err: any) {
            console.error("Fetch Error:", err);
            // Return empty or mock on error? Let's return empty to avoid confusion in prod.
            return { transactions: [] };
        } finally {
            setLoading(false);
        }
    }, []);

    const addTransaction = useCallback(async (transaction: TransactionInput & { id?: string }): Promise<boolean> => {
        if (!GOOGLE_SCRIPT_URL) {
            console.warn("Google Script URL is not set. Mocking success.");
            await new Promise(resolve => setTimeout(resolve, 800));
            return true;
        }

        // Don't set global loading here to allow optimistic UI in the store?
        // Or set it locally for the form? Let's return promise for store handling.
        try {
            // Use no-cors or simple POST? Google Apps Script simple triggers need correct headers.
            // Usually axios post to GAS web app works with redirects handling.
            // Note: text/plain is often needed to avoid simple request preflight triggers if CORS not handled perfectly.
            // The GAS script specifically handles JSON/Parameter parsing.
            // We will try standard JSON post.

            // Use URLSearchParams to send as 'application/x-www-form-urlencoded'
            // This avoids CORS preflight (OPTIONS) triggers and works with e.parameter in GAS.
            const formData = new URLSearchParams();
            formData.append('account', transaction.account);
            formData.append('type', transaction.type);
            formData.append('category', transaction.category);
            formData.append('amount', transaction.amount.toString());
            // Format date as dd/MM/yyyy HH:mm:ss for Google Sheet (Indonesian Locale)
            const formattedDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss');
            formData.append('date', formattedDate);
            formData.append('description', transaction.description);
            formData.append('id', transaction.id || crypto.randomUUID());
            formData.append('status', 'completed');
            formData.append('action', 'addTransaction');
            // Use same format for timestamp if it maps to the Date column
            formData.append('timestamp', formattedDate);

            console.log("🚀 Sending Transaction (Form Data):", Object.fromEntries(formData));

            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                // No custom Content-Type needed, fetch sets it to application/x-www-form-urlencoded
                body: formData
            });

            const data = await response.json();
            console.log("✅ GAS Response:", data);

            if (data.status === 'success') {
                return true;
            } else {
                console.error("❌ GAS Error Details:", data);
                throw new Error(data.message || 'Failed to add');
            }
        } catch (err: any) {
            console.error("Add Transaction Error:", err);
            // setError(err.message); // Optional
            return false;
        }
    }, []);

    return {
        fetchTransactions,
        addTransaction,
        loading,
        error
    };
};

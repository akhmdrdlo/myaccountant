import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Transaction, TransactionInput, Goal, Budget, Subscription, Investment } from '../types';
import { INITIAL_METADATA } from '../services/initialSeed';

export const useSupabase = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getUserId = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id;
    };

    const fetchTransactions = useCallback(async (): Promise<{
        transactions: Transaction[],
        metadata?: any,
        goals?: Goal[],
        budgets?: Budget[],
        subscriptions?: Subscription[],
        investments?: Investment[]
    }> => {
        setLoading(true);
        setError(null);
        try {
            const userId = await getUserId();
            if (!userId) {
                console.warn("User is not authenticated. Cannot fetch data.");
                return { transactions: [] };
            }

            // Fetch in parallel
            const [
                transactionsRes,
                accountsRes,
                goalsRes,
                budgetsRes,
                subscriptionsRes,
                investmentsRes
            ] = await Promise.all([
                supabase.from('transactions').select('*').order('timestamp', { ascending: false }),
                supabase.from('accounts').select('*').order('name'),
                supabase.from('goals').select('*').order('name'),
                supabase.from('budgets').select('*'),
                supabase.from('subscriptions').select('*').order('billing_date'),
                supabase.from('investments').select('*').order('name')
            ]);

            if (transactionsRes.error) throw transactionsRes.error;
            if (accountsRes.error) throw accountsRes.error;
            if (goalsRes.error) throw goalsRes.error;
            if (budgetsRes.error) throw budgetsRes.error;
            if (subscriptionsRes.error) throw subscriptionsRes.error;
            if (investmentsRes.error) throw investmentsRes.error;

            let accountsData = accountsRes.data || [];

            // Auto-seeding default accounts if database is empty for this user
            if (accountsData.length === 0) {
                const defaultAccounts = INITIAL_METADATA.accounts.map(acc => ({
                    user_id: userId,
                    name: acc.name,
                    initial_balance: acc.initialBalance
                }));
                const insertRes = await supabase.from('accounts').insert(defaultAccounts).select();
                if (insertRes.error) {
                    console.error("Failed to seed initial accounts:", insertRes.error);
                } else {
                    accountsData = insertRes.data || [];
                }
            }

            // Map database snake_case fields to frontend camelCase structures
            const transactions: Transaction[] = (transactionsRes.data || []).map(tx => ({
                id: tx.id,
                timestamp: tx.timestamp,
                type: tx.type as any,
                category: tx.category,
                amount: Number(tx.amount),
                description: tx.description || '',
                account: tx.account,
                toAccount: tx.to_account || undefined,
                status: tx.status as any
            }));

            const accounts = accountsData.map(acc => ({
                name: acc.name,
                initialBalance: Number(acc.initial_balance)
            }));

            const goals: Goal[] = (goalsRes.data || []).map(g => ({
                id: g.id,
                name: g.name,
                targetAmount: Number(g.target_amount),
                currentAmount: Number(g.current_amount),
                deadline: g.deadline || undefined,
                color: g.color || undefined
            }));

            const budgets: Budget[] = (budgetsRes.data || []).map(b => ({
                category: b.category,
                limit: Number(b.limit),
                color: b.color || undefined,
                icon: b.icon || undefined
            }));

            const subscriptions: Subscription[] = (subscriptionsRes.data || []).map(s => ({
                id: s.id,
                name: s.name,
                amount: Number(s.amount),
                billingDate: Number(s.billing_date),
                category: s.category
            }));

            const investments: Investment[] = (investmentsRes.data || []).map(i => ({
                id: i.id,
                name: i.name,
                symbol: i.symbol || undefined,
                type: i.type,
                averagePrice: Number(i.average_price),
                totalUnits: Number(i.total_units),
                currentPrice: Number(i.current_price),
                color: i.color || undefined
            }));

            return {
                transactions,
                metadata: {
                    accounts,
                    expenseCategories: INITIAL_METADATA.expenseCategories,
                    incomeCategories: INITIAL_METADATA.incomeCategories
                },
                goals,
                budgets,
                subscriptions,
                investments
            };
        } catch (err: any) {
            console.error("Fetch Supabase error:", err);
            setError(err.message || 'Gagal memuat data dari Supabase.');
            return { transactions: [] };
        } finally {
            setLoading(false);
        }
    }, []);

    const addTransaction = useCallback(async (transaction: TransactionInput & { id?: string }) => {
        try {
            const userId = await getUserId();
            if (!userId) return false;

            const newTx = {
                id: transaction.id || undefined, // let database generate UUID if not specified
                user_id: userId,
                type: transaction.type,
                category: transaction.category,
                amount: transaction.amount,
                description: transaction.description || '',
                account: transaction.account,
                to_account: transaction.toAccount || null,
                status: 'completed'
            };

            const { error } = await supabase.from('transactions').insert([newTx]);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Error adding transaction to Supabase:", err);
            return false;
        }
    }, []);

    const addGoal = useCallback(async (goal: Goal) => {
        try {
            const userId = await getUserId();
            if (!userId) return false;

            const { error } = await supabase.from('goals').insert([{
                id: goal.id,
                user_id: userId,
                name: goal.name,
                target_amount: goal.targetAmount,
                current_amount: goal.currentAmount,
                deadline: goal.deadline || null,
                color: goal.color || null
            }]);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Error adding goal to Supabase:", err);
            return false;
        }
    }, []);

    const updateGoal = useCallback(async (goal: Goal) => {
        try {
            const userId = await getUserId();
            if (!userId) return false;

            const { error } = await supabase.from('goals')
                .update({
                    name: goal.name,
                    target_amount: goal.targetAmount,
                    current_amount: goal.currentAmount,
                    deadline: goal.deadline || null,
                    color: goal.color || null
                })
                .eq('id', goal.id)
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Error updating goal in Supabase:", err);
            return false;
        }
    }, []);

    const deleteGoal = useCallback(async (id: string) => {
        try {
            const userId = await getUserId();
            if (!userId) return false;

            const { error } = await supabase.from('goals')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Error deleting goal in Supabase:", err);
            return false;
        }
    }, []);

    const saveBudgets = useCallback(async (budgets: Budget[]) => {
        try {
            const userId = await getUserId();
            if (!userId) return false;

            // Delete existing user budgets and insert new ones
            const { error: deleteError } = await supabase.from('budgets')
                .delete()
                .eq('user_id', userId);

            if (deleteError) throw deleteError;

            if (budgets.length > 0) {
                const newBudgets = budgets.map(b => ({
                    user_id: userId,
                    category: b.category,
                    limit: b.limit,
                    color: b.color || null,
                    icon: b.icon || null
                }));

                const { error: insertError } = await supabase.from('budgets').insert(newBudgets);
                if (insertError) throw insertError;
            }

            return true;
        } catch (err) {
            console.error("Error saving budgets to Supabase:", err);
            return false;
        }
    }, []);

    const addSubscription = useCallback(async (sub: Subscription) => {
        try {
            const userId = await getUserId();
            if (!userId) return false;

            const { error } = await supabase.from('subscriptions').insert([{
                id: sub.id,
                user_id: userId,
                name: sub.name,
                amount: sub.amount,
                billing_date: sub.billingDate,
                category: sub.category
            }]);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Error adding subscription to Supabase:", err);
            return false;
        }
    }, []);

    const deleteSubscription = useCallback(async (id: string) => {
        try {
            const userId = await getUserId();
            if (!userId) return false;

            const { error } = await supabase.from('subscriptions')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Error deleting subscription in Supabase:", err);
            return false;
        }
    }, []);

    const addInvestment = useCallback(async (inv: Investment) => {
        try {
            const userId = await getUserId();
            if (!userId) return false;

            const { error } = await supabase.from('investments').insert([{
                id: inv.id,
                user_id: userId,
                name: inv.name,
                symbol: inv.symbol || null,
                type: inv.type,
                average_price: inv.averagePrice,
                total_units: inv.totalUnits,
                current_price: inv.currentPrice,
                color: inv.color || null
            }]);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Error adding investment to Supabase:", err);
            return false;
        }
    }, []);

    const updateInvestment = useCallback(async (inv: Investment) => {
        try {
            const userId = await getUserId();
            if (!userId) return false;

            const { error } = await supabase.from('investments')
                .update({
                    name: inv.name,
                    symbol: inv.symbol || null,
                    type: inv.type,
                    average_price: inv.averagePrice,
                    total_units: inv.totalUnits,
                    current_price: inv.currentPrice,
                    color: inv.color || null
                })
                .eq('id', inv.id)
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Error updating investment in Supabase:", err);
            return false;
        }
    }, []);

    const deleteInvestment = useCallback(async (id: string) => {
        try {
            const userId = await getUserId();
            if (!userId) return false;

            const { error } = await supabase.from('investments')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Error deleting investment in Supabase:", err);
            return false;
        }
    }, []);

    const fetchProfile = useCallback(async (): Promise<{ username: string; email?: string; phone?: string; avatar_url?: string } | null> => {
        try {
            const userId = await getUserId();
            if (!userId) return null;

            const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw error;
            }
            return {
                username: data.username,
                email: data.email || undefined,
                phone: data.phone || undefined,
                avatar_url: data.avatar_url || undefined
            };
        } catch (err) {
            console.error("Error fetching profile from Supabase:", err);
            return null;
        }
    }, []);

    const updateProfile = useCallback(async (profile: { phone?: string; email?: string; avatar_url?: string }): Promise<boolean> => {
        try {
            const userId = await getUserId();
            if (!userId) return false;

            const { error } = await supabase.from('profiles')
                .update({
                    phone: profile.phone || null,
                    email: profile.email || null,
                    avatar_url: profile.avatar_url || null
                })
                .eq('id', userId);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Error updating profile in Supabase:", err);
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
        fetchProfile,
        updateProfile,
        loading,
        error
    };
};

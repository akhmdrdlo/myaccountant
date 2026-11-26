import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Transaction, TransactionInput, Goal, Budget, Subscription, Investment } from '../types';
import { INITIAL_METADATA } from '../services/initialSeed';

export interface SaveResult {
    ok: boolean;
    /** true = gagal karena jaringan; aman untuk diantrekan dan dikirim ulang */
    offline: boolean;
    message?: string;
}

const isNetworkError = (msg = '') => /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|ERR_INTERNET|ERR_NETWORK/i.test(msg);

export const useSupabase = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getUserId = async () => {
        // Sesi lokal dulu (tanpa jaringan, diperbarui otomatis oleh supabase-js); getUser() hanya cadangan
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) return session.user.id;
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id;
    };

    const fetchTransactions = useCallback(async (): Promise<{
        transactions: Transaction[],
        metadata?: any,
        goals?: Goal[],
        budgets?: Budget[],
        subscriptions?: Subscription[],
        investments?: Investment[],
        /** true jika gagal memuat (offline / error) — data lama jangan ditimpa */
        failed?: boolean
    }> => {
        setLoading(true);
        setError(null);
        try {
            const userId = await getUserId();
            if (!userId) {
                console.warn("User is not authenticated. Cannot fetch data.");
                return { transactions: [], failed: true };
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
                    initial_balance: acc.initialBalance,
                    institution: acc.institution ?? null
                }));
                let insertRes = await supabase.from('accounts').insert(defaultAccounts).select();
                if (insertRes.error) {
                    // Kolom institution belum ada (migrasi belum dijalankan) — simpan tanpa kolom itu
                    insertRes = await supabase.from('accounts').insert(defaultAccounts.map(({ institution: _i, ...rest }) => rest)).select();
                }
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
                status: tx.status as any,
                tags: Array.isArray(tx.tags) ? tx.tags : []
            }));

            const accounts = accountsData.map(acc => ({
                id: acc.id,
                name: acc.name,
                initialBalance: Number(acc.initial_balance),
                institution: acc.institution ?? undefined
            }));

            const goals: Goal[] = (goalsRes.data || []).map(g => ({
                id: g.id,
                name: g.name,
                targetAmount: Number(g.target_amount),
                currentAmount: Number(g.current_amount),
                deadline: g.deadline || undefined,
                color: g.color || undefined,
                linkedAccount: g.linked_account || undefined
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
            return { transactions: [], failed: true };
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Simpan transaksi. Jika `externalId` diisi (transaksi otomatis), insert bersifat idempoten:
     * memanggil dua kali dengan source+externalId yang sama tidak membuat duplikat.
     */
    /**
     * Simpan transaksi dan laporkan alasannya bila gagal:
     * `offline` = jaringan putus (boleh diantrekan), selain itu server menolak (jangan diantrekan, tampilkan pesannya).
     */
    const saveTransaction = useCallback(async (transaction: TransactionInput & { id?: string; source?: string; externalId?: string; timestamp?: string }): Promise<SaveResult> => {
        if (!navigator.onLine) return { ok: false, offline: true, message: 'Tidak ada koneksi internet.' };
        try {
            const userId = await getUserId();
            if (!userId) return { ok: false, offline: false, message: 'Sesi login berakhir. Keluar lalu masuk lagi.' };

            const newTx: Record<string, unknown> = {
                // id dibuat di klien: kunci bernilai undefined dikirim sebagai NULL oleh supabase-js dan ditolak kolom id
                id: transaction.id || crypto.randomUUID(),
                user_id: userId,
                type: transaction.type,
                category: transaction.category,
                amount: Math.round(transaction.amount),
                description: transaction.description || '',
                account: transaction.account,
                to_account: transaction.toAccount || null,
                status: 'completed'
            };
            if (transaction.tags?.length) newTx.tags = transaction.tags;
            if (transaction.timestamp) newTx.timestamp = transaction.timestamp;

            if (transaction.externalId) {
                newTx.source = transaction.source ?? 'auto';
                newTx.external_id = transaction.externalId;
            }
            const write = () => transaction.externalId
                ? supabase.from('transactions').upsert([newTx], { onConflict: 'user_id,source,external_id', ignoreDuplicates: true })
                : supabase.from('transactions').insert([newTx]);

            let { error } = await write();
            if (error && newTx.tags && /tags/.test(error.message)) {
                // Kolom tags belum dimigrasi — simpan tanpa tag
                delete newTx.tags;
                ({ error } = await write());
            }
            if (error && transaction.externalId && /source|external_id|ON CONFLICT|unique or exclusion/i.test(error.message)) {
                // Migrasi idempotensi belum dijalankan — tetap simpan sebagai insert biasa daripada kehilangan data
                delete newTx.source;
                delete newTx.external_id;
                ({ error } = await supabase.from('transactions').insert([newTx]));
            }
            if (error) {
                console.error('Supabase menolak transaksi:', error);
                return { ok: false, offline: isNetworkError(error.message), message: error.message };
            }
            return { ok: true, offline: false };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('Error adding transaction to Supabase:', err);
            return { ok: false, offline: isNetworkError(message), message };
        }
    }, []);

    /** Versi lama (boolean) untuk pemanggil yang tidak butuh alasan gagal. */
    const addTransaction = useCallback(async (transaction: Parameters<typeof saveTransaction>[0]) => (await saveTransaction(transaction)).ok, [saveTransaction]);

    const updateTransaction = useCallback(async (tx: Pick<Transaction, 'id' | 'type' | 'category' | 'amount' | 'description' | 'account' | 'timestamp' | 'tags'>) => {
        const patch: Record<string, unknown> = {
            type: tx.type,
            category: tx.category,
            amount: Math.round(tx.amount),
            description: tx.description || '',
            account: tx.account,
            timestamp: tx.timestamp,
        };
        if (tx.tags) patch.tags = tx.tags;
        let { error } = await supabase.from('transactions').update(patch).eq('id', tx.id);
        if (error && /tags/.test(error.message)) {
            delete patch.tags;
            ({ error } = await supabase.from('transactions').update(patch).eq('id', tx.id));
        }
        if (error) {
            console.error('Error updating transaction:', error);
            return false;
        }
        return true;
    }, []);

    /**
     * Impor banyak transaksi sekaligus (dari CSV mutasi). Idempoten: baris yang sudah pernah
     * diimpor dilewati berkat unique (user_id, source, external_id). Mengembalikan jumlah baris yang dikirim.
     */
    const importTransactions = useCallback(async (
        rows: { date: Date; description: string; amount: number; type: 'income' | 'expense'; category: string; externalId: string }[],
        account: string,
        onProgress?: (done: number) => void,
    ) => {
        const userId = await getUserId();
        if (!userId) return { ok: false, sent: 0 };
        let sent = 0;
        for (let i = 0; i < rows.length; i += 200) {
            const chunk = rows.slice(i, i + 200).map(r => ({
                id: crypto.randomUUID(),
                user_id: userId,
                type: r.type,
                category: r.category,
                amount: Math.round(r.amount),
                description: r.description.slice(0, 200),
                account,
                status: 'completed',
                timestamp: r.date.toISOString(),
                source: 'import',
                external_id: r.externalId,
            }));
            const { error } = await supabase.from('transactions').upsert(chunk, { onConflict: 'user_id,source,external_id', ignoreDuplicates: true });
            if (error) {
                console.error('Import error:', error);
                return { ok: false, sent };
            }
            sent += chunk.length;
            onProgress?.(sent);
        }
        return { ok: true, sent };
    }, []);

    const deleteTransactions = useCallback(async (ids: string[]) => {
        if (ids.length === 0) return true;
        const { error } = await supabase.from('transactions').delete().in('id', ids);
        if (error) {
            console.error('Error deleting transactions:', error);
            return false;
        }
        return true;
    }, []);

    /** Tambah akun baru. */
    const createAccount = useCallback(async (acc: { name: string; initialBalance: number; institution?: string }) => {
        const userId = await getUserId();
        if (!userId) return false;
        const row = { user_id: userId, name: acc.name, initial_balance: Math.round(acc.initialBalance), institution: acc.institution ?? null };
        let { error } = await supabase.from('accounts').insert(row);
        if (error && /institution/.test(error.message)) {
            ({ error } = await supabase.from('accounts').insert({ user_id: userId, name: acc.name, initial_balance: row.initial_balance }));
        }
        if (error) console.error('Error creating account:', error);
        return !error;
    }, []);

    /** Ubah akun. Jika nama berubah, transaksi lama ikut dipindah ke nama baru. */
    const updateAccount = useCallback(async (oldName: string, acc: { name: string; initialBalance: number; institution?: string }) => {
        const patch: Record<string, unknown> = { name: acc.name, initial_balance: Math.round(acc.initialBalance), institution: acc.institution ?? null };
        let { error } = await supabase.from('accounts').update(patch).eq('name', oldName);
        if (error && /institution/.test(error.message)) {
            delete patch.institution;
            ({ error } = await supabase.from('accounts').update(patch).eq('name', oldName));
        }
        if (error) { console.error('Error updating account:', error); return false; }
        if (oldName !== acc.name) {
            const [a, b, g] = await Promise.all([
                supabase.from('transactions').update({ account: acc.name }).eq('account', oldName),
                supabase.from('transactions').update({ to_account: acc.name }).eq('to_account', oldName),
                supabase.from('goals').update({ linked_account: acc.name }).eq('linked_account', oldName),
            ]);
            if (a.error || b.error) { console.error('Error renaming account in transactions:', a.error ?? b.error); return false; }
            if (g.error) console.warn('linked_account belum dimigrasi:', g.error.message);
        }
        return true;
    }, []);

    const deleteAccount = useCallback(async (name: string) => {
        const { error } = await supabase.from('accounts').delete().eq('name', name);
        if (error) console.error('Error deleting account:', error);
        return !error;
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
                color: goal.color || null,
                linked_account: goal.linkedAccount || null
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
                    color: goal.color || null,
                    linked_account: goal.linkedAccount || null
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
        saveTransaction,
        updateTransaction,
        importTransactions,
        deleteTransactions,
        createAccount,
        updateAccount,
        deleteAccount,
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

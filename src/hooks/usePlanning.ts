// Data perencanaan: tanggal gajian, utang-piutang, cicilan, aturan kategori merchant.
// Semua fungsi toleran terhadap tabel yang belum dimigrasi (mengembalikan data kosong).
import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Debt, Installment, MerchantRule } from '../types';
import { merchantKey } from '../lib/merchantRules';

async function userId() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
}

export interface PlanningData {
    payday?: number;
    debts: Debt[];
    installments: Installment[];
    merchantRules: MerchantRule[];
    /** false bila tabel belum ada (migrasi 20261124030000 belum dijalankan) */
    available: boolean;
}

export const usePlanning = () => {
    const fetchPlanning = useCallback(async (): Promise<PlanningData | null> => {
        const [settings, debts, inst, rules] = await Promise.all([
            supabase.from('user_settings').select('payday').maybeSingle(),
            supabase.from('debts').select('*').order('created_at', { ascending: false }),
            supabase.from('installments').select('*').order('created_at'),
            supabase.from('merchant_rules').select('*'),
        ]);
        // Jaringan putus → null (pakai data lama); tabel belum ada → kosong + available=false
        const failed = [settings, debts, inst, rules].find(r => r.error);
        if (failed?.error && /fetch|network/i.test(failed.error.message)) return null;
        const available = !debts.error;

        return {
            available,
            payday: settings.data?.payday ?? undefined,
            debts: (debts.data ?? []).map(d => ({
                id: d.id,
                person: d.person,
                direction: d.direction,
                amount: Number(d.amount),
                note: d.note ?? undefined,
                dueDate: d.due_date ?? undefined,
                settledAt: d.settled_at ?? undefined,
                createdAt: d.created_at,
            })),
            installments: (inst.data ?? []).map(i => ({
                id: i.id,
                name: i.name,
                account: i.account ?? undefined,
                monthlyAmount: Number(i.monthly_amount),
                totalMonths: i.total_months,
                paidMonths: i.paid_months,
                dueDay: i.due_day,
            })),
            merchantRules: (rules.data ?? []).map(r => ({
                merchantKey: r.merchant_key,
                category: r.category,
                account: r.account ?? undefined,
                hits: r.hits,
            })),
        };
    }, []);

    const savePayday = useCallback(async (payday: number) => {
        const uid = await userId();
        if (!uid) return false;
        const { error } = await supabase.from('user_settings').upsert({ user_id: uid, payday, updated_at: new Date().toISOString() });
        return !error;
    }, []);

    // ── Utang-piutang ──
    const saveDebt = useCallback(async (d: Omit<Debt, 'id' | 'createdAt'> & { id?: string }) => {
        const uid = await userId();
        if (!uid) return false;
        const row = {
            user_id: uid,
            person: d.person.trim(),
            direction: d.direction,
            amount: Math.round(d.amount),
            note: d.note?.trim() || null,
            due_date: d.dueDate || null,
            settled_at: d.settledAt ?? null,
        };
        const { error } = d.id
            ? await supabase.from('debts').update(row).eq('id', d.id)
            : await supabase.from('debts').insert(row);
        return !error;
    }, []);

    const deleteDebt = useCallback(async (id: string) => {
        const { error } = await supabase.from('debts').delete().eq('id', id);
        return !error;
    }, []);

    // ── Cicilan ──
    const saveInstallment = useCallback(async (i: Omit<Installment, 'id'> & { id?: string }) => {
        const uid = await userId();
        if (!uid) return false;
        const row = {
            user_id: uid,
            name: i.name.trim(),
            account: i.account || null,
            monthly_amount: Math.round(i.monthlyAmount),
            total_months: i.totalMonths,
            paid_months: Math.min(i.paidMonths, i.totalMonths),
            due_day: i.dueDay,
        };
        const { error } = i.id
            ? await supabase.from('installments').update(row).eq('id', i.id)
            : await supabase.from('installments').insert(row);
        return !error;
    }, []);

    const deleteInstallment = useCallback(async (id: string) => {
        const { error } = await supabase.from('installments').delete().eq('id', id);
        return !error;
    }, []);

    // ── Aturan merchant ──
    /** Ingat kategori (dan dompet) untuk merchant ini. Dipanggil saat pengguna mengoreksi kategori. */
    const learnMerchant = useCallback(async (merchant: string, category: string, account?: string) => {
        const key = merchantKey(merchant);
        if (!key) return;
        const uid = await userId();
        if (!uid) return;
        await supabase.from('merchant_rules').upsert({
            user_id: uid,
            merchant_key: key,
            category,
            account: account ?? null,
            updated_at: new Date().toISOString(),
        });
    }, []);

    const forgetMerchant = useCallback(async (key: string) => {
        await supabase.from('merchant_rules').delete().eq('merchant_key', key);
    }, []);

    return { fetchPlanning, savePayday, saveDebt, deleteDebt, saveInstallment, deleteInstallment, learnMerchant, forgetMerchant };
};

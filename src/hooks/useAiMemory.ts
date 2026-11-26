// Memori AI milik pengguna yang sedang login. Semua akses lewat RLS (tabel ai_memory).
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type MemoryKind = 'profil' | 'tujuan' | 'gaya' | 'konteks';

export interface MemoryNote {
    id: string;
    kind: MemoryKind;
    content: string;
    enabled: boolean;
}

/** Tolak teks yang tampak seperti rahasia: nomor panjang (rekening/kartu), PIN, password, OTP. */
export function looksSensitive(text: string): boolean {
    return /\b\d{8,}\b/.test(text.replace(/[\s-]/g, '')) || /\b(pin|password|kata sandi|otp|cvv|token)\b/i.test(text);
}

export const useAiMemory = () => {
    const [notes, setNotes] = useState<MemoryNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [available, setAvailable] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        // Tanpa filter user_id pun RLS hanya mengembalikan milik sendiri; filter eksplisit sebagai lapis kedua
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) { setNotes([]); setLoading(false); return; }
        const { data, error } = await supabase.from('ai_memory').select('id, kind, content, enabled').eq('user_id', uid).order('created_at');
        setAvailable(!error);
        setNotes((data ?? []) as MemoryNote[]);
        setLoading(false);
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const add = useCallback(async (kind: MemoryKind, content: string): Promise<string | null> => {
        const text = content.trim().slice(0, 280);
        if (!text) return 'Isi catatannya dulu.';
        if (looksSensitive(text)) return 'Jangan simpan nomor rekening, PIN, password, atau OTP di memori.';
        const { error } = await supabase.from('ai_memory').insert({ kind, content: text });
        if (error) return error.message;
        await refresh();
        return null;
    }, [refresh]);

    const update = useCallback(async (id: string, patch: Partial<Pick<MemoryNote, 'content' | 'enabled' | 'kind'>>) => {
        if (patch.content !== undefined && looksSensitive(patch.content)) return 'Jangan simpan nomor rekening, PIN, password, atau OTP di memori.';
        const { error } = await supabase.from('ai_memory').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) return error.message;
        await refresh();
        return null;
    }, [refresh]);

    const remove = useCallback(async (id: string) => {
        await supabase.from('ai_memory').delete().eq('id', id);
        await refresh();
    }, [refresh]);

    const removeAll = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) await supabase.from('ai_memory').delete().eq('user_id', session.user.id);
        await refresh();
    }, [refresh]);

    return { notes, loading, available, add, update, remove, removeAll, refresh };
};

import { useState } from 'react';
import { toast } from 'sonner';
import { Brain, Plus, Trash2 } from 'lucide-react';
import { SubviewHeader } from '../layout/SubviewHeader';
import { useAiMemory, type MemoryKind, type MemoryNote } from '../../hooks/useAiMemory';
import { cn } from '../../lib/utils';

const KINDS: { id: MemoryKind; label: string; hint: string }[] = [
    { id: 'profil', label: 'Tentang aku', hint: 'mis. Mahasiswa, kos di Bandung, uang saku Rp2 jt/bulan' },
    { id: 'tujuan', label: 'Tujuan', hint: 'mis. Nabung DP motor Rp5 jt sebelum Juni' },
    { id: 'gaya', label: 'Gaya jawaban', hint: 'mis. Jawab singkat, jangan ceramah' },
    { id: 'konteks', label: 'Konteks', hint: 'mis. Makan Weekend termasuk traktir pacar, jangan dianggap boros' },
];

/** "Yang AI tahu tentangku": memori milik pengguna, ikut dikirim saat bertanya ke Tanya AI. */
export const AiMemoryView = ({ onBack }: { onBack: () => void }) => {
    const { notes, loading, available, add, update, remove, removeAll } = useAiMemory();
    const [kind, setKind] = useState<MemoryKind>('profil');
    const [text, setText] = useState('');

    const submit = async () => {
        const err = await add(kind, text);
        if (err) return toast.error(err);
        setText('');
        toast.success('Disimpan ke memori.');
    };

    return (
        <div className="space-y-5">
            <SubviewHeader title="Yang AI tahu tentangku" subtitle="Dipakai Tanya AI supaya jawabannya pas buatmu" onBack={onBack} />

            {!available && (
                <p role="alert" className="rounded-xl bg-rp-warn-soft text-rp-warn text-sm p-3">
                    Jalankan migrasi <code className="font-mono">20261126010000_ai_memory.sql</code> di Supabase dulu.
                </p>
            )}

            <section className="rp-card p-4 space-y-3">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1" role="radiogroup" aria-label="Jenis catatan">
                    {KINDS.map(k => (
                        <button key={k.id} role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)}
                            className={cn('h-9 px-3 shrink-0 rounded-full text-xs font-semibold border',
                                kind === k.id ? 'bg-rp-royal border-rp-royal text-white' : 'border-rp-line text-rp-ink-2')}>
                            {k.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input value={text} onChange={e => setText(e.target.value)} maxLength={280}
                        onKeyDown={e => e.key === 'Enter' && submit()}
                        placeholder={KINDS.find(k => k.id === kind)?.hint}
                        className="flex-1 h-11 px-3 rounded-xl bg-rp-canvas border border-rp-line text-sm text-rp-ink placeholder:text-rp-ink-2" />
                    <button onClick={submit} aria-label="Simpan catatan" className="w-11 h-11 shrink-0 rounded-xl bg-rp-action text-white flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </section>

            {loading ? (
                <div className="rp-card h-24 animate-pulse" />
            ) : notes.length === 0 ? (
                <div className="rp-card p-6 text-center">
                    <Brain className="w-8 h-8 mx-auto text-rp-ink-2" />
                    <p className="mt-3 font-semibold text-rp-ink">Belum ada memori</p>
                    <p className="mt-1 text-sm text-rp-ink-2">Tulis hal yang perlu AI ingat tentangmu. AI juga bisa menyarankan saat ngobrol, tapi kamu yang memutuskan menyimpannya.</p>
                </div>
            ) : (
                <ul className="rp-card divide-y divide-rp-line overflow-hidden">
                    {notes.map(n => <MemoryRow key={n.id} note={n} onToggle={() => update(n.id, { enabled: !n.enabled })} onDelete={() => remove(n.id)} />)}
                </ul>
            )}

            <div className="text-xs text-rp-ink-2 space-y-1">
                <p>Hanya akunmu yang bisa membaca catatan ini. Catatan yang aktif ikut dikirim ke Anthropic (Claude) setiap kamu bertanya di Tanya AI.</p>
                <p>Jangan simpan nomor rekening, PIN, password, atau data orang lain.</p>
            </div>

            {notes.length > 0 && (
                <button onClick={async () => { if (window.confirm('Hapus semua memori? Tidak bisa dibatalkan.')) { await removeAll(); toast.success('Semua memori dihapus.'); } }}
                    className="w-full h-11 rounded-xl border border-rp-line text-rp-out text-sm font-semibold">
                    Hapus semua memori
                </button>
            )}
        </div>
    );
};

const MemoryRow = ({ note, onToggle, onDelete }: { note: MemoryNote; onToggle: () => void; onDelete: () => void }) => (
    <li className="flex items-start gap-3 p-4">
        <span className="flex-1 min-w-0">
            <span className="block text-xs font-semibold text-rp-royal">{KINDS.find(k => k.id === note.kind)?.label ?? note.kind}</span>
            <span className={cn('block text-sm', note.enabled ? 'text-rp-ink' : 'text-rp-ink-2 line-through')}>{note.content}</span>
        </span>
        <button onClick={onToggle} role="switch" aria-checked={note.enabled} aria-label={note.enabled ? 'Matikan sementara' : 'Aktifkan'}
            className={cn('relative mt-1 w-10 h-6 shrink-0 rounded-full transition-colors', note.enabled ? 'bg-rp-royal' : 'bg-gray-300 dark:bg-gray-600')}>
            <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', note.enabled && 'translate-x-4')} />
        </button>
        <button onClick={() => window.confirm('Hapus catatan ini?') && onDelete()} aria-label="Hapus" className="w-9 h-9 -mr-2 shrink-0 rounded-lg text-rp-ink-2 hover:text-rp-out hover:bg-rp-out-soft flex items-center justify-center">
            <Trash2 className="w-4 h-4" />
        </button>
    </li>
);

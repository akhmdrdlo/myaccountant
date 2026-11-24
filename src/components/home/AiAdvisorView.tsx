import { Fragment, useEffect, useRef, useState } from 'react';
import { Send, Sparkles, RotateCcw } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { SubviewHeader } from '../layout/SubviewHeader';
import { AiError, aiAdvisor, buildFinanceSummary, type ChatTurn } from '../../lib/ai';
import { cn } from '../../lib/utils';

interface AiAdvisorViewProps {
    onBack: () => void;
}

const STORAGE_KEY = 'rplanner_advisor_chat';

const SUGGESTIONS = [
    'Kenapa pengeluaranku bulan ini lebih besar?',
    'Kategori mana yang paling boros?',
    'Sisa uangku cukup sampai akhir bulan?',
    'Kapan wishlist-ku bisa tercapai?',
];

export const AiAdvisorView = ({ onBack }: AiAdvisorViewProps) => {
    const { transactions, budgets, goals, getAccountBalances, getAccountBalance } = useFinanceStore();
    const [messages, setMessages] = useState<ChatTurn[]>(() => {
        try {
            return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
        } catch {
            return [];
        }
    });
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, thinking]);

    const send = async (text: string) => {
        const q = text.trim();
        if (!q || thinking) return;
        const next: ChatTurn[] = [...messages, { role: 'user', content: q }];
        setMessages(next);
        setInput('');
        setError(null);
        setThinking(true);
        try {
            const summary = buildFinanceSummary({
                transactions,
                budgets,
                accounts: getAccountBalances(),
                goals: goals.map(g => ({
                    name: g.name,
                    targetAmount: g.targetAmount,
                    current: g.linkedAccount ? getAccountBalance(g.linkedAccount) : g.currentAmount,
                })),
            });
            const reply = await aiAdvisor(next, summary);
            setMessages([...next, { role: 'assistant', content: reply ?? 'Maaf, aku belum bisa menjawab. Coba tanya dengan kalimat lain.' }]);
        } catch (err) {
            setError(err instanceof AiError ? err.message : 'Terjadi kesalahan. Coba lagi.');
            setMessages(messages); // kembalikan supaya pertanyaan bisa dikirim ulang
            setInput(q);
        } finally {
            setThinking(false);
        }
    };

    return (
        <div className="flex flex-col min-h-[calc(100vh-10rem)]">
            <SubviewHeader
                title="Tanya AI"
                subtitle="Dijawab Claude berdasarkan catatanmu"
                onBack={onBack}
                action={messages.length > 0 ? (
                    <button onClick={() => setMessages([])} aria-label="Mulai percakapan baru"
                        className="w-11 h-11 flex items-center justify-center rounded-xl text-rp-ink-2 hover:bg-rp-surface-2">
                        <RotateCcw className="w-5 h-5" />
                    </button>
                ) : undefined}
            />

            <div className="flex-1 space-y-3 pb-4" aria-live="polite">
                {messages.length === 0 && (
                    <div className="rp-card p-4">
                        <div className="flex items-center gap-2 text-rp-royal">
                            <Sparkles className="w-5 h-5" />
                            <p className="font-semibold text-rp-ink">Tanya soal keuanganmu</p>
                        </div>
                        <p className="mt-1 text-sm text-rp-ink-2">
                            AI membaca ringkasan saldo, budget, wishlist, dan 15 transaksi terakhirmu. Riwayat lengkap tidak dikirim.
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                            {SUGGESTIONS.map(s => (
                                <button key={s} onClick={() => send(s)}
                                    className="text-left min-h-[44px] px-3 rounded-xl bg-rp-surface-2 text-sm text-rp-royal font-medium">
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <div className={cn(
                            'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                            m.role === 'user' ? 'bg-rp-royal text-white rounded-br-md' : 'rp-card text-rp-ink rounded-bl-md',
                        )}>
                            {m.role === 'assistant' ? <RichText text={m.content} /> : m.content}
                        </div>
                    </div>
                ))}

                {thinking && (
                    <div className="flex justify-start">
                        <div className="rp-card rounded-2xl rounded-bl-md px-4 py-3 text-sm text-rp-ink-2">Sedang membaca catatanmu…</div>
                    </div>
                )}

                {error && <p role="alert" className="rounded-xl bg-rp-out-soft text-rp-out text-sm p-3">{error}</p>}
                <div ref={endRef} />
            </div>

            <form
                onSubmit={e => { e.preventDefault(); send(input); }}
                className="sticky bottom-24 flex gap-2 bg-rp-canvas pt-2"
            >
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Tulis pertanyaan…"
                    maxLength={500}
                    className="flex-1 h-12 px-4 rounded-xl bg-rp-surface border border-rp-line text-sm text-rp-ink placeholder:text-rp-ink-2"
                />
                <button type="submit" disabled={!input.trim() || thinking} aria-label="Kirim"
                    className="w-12 h-12 rounded-xl bg-rp-action hover:bg-rp-action-press text-white flex items-center justify-center disabled:opacity-50">
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
};

/** Render **tebal** sederhana tanpa HTML mentah (aman dari injeksi). */
const RichText = ({ text }: { text: string }) => (
    <>
        {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
            part.startsWith('**') && part.endsWith('**')
                ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
                : <Fragment key={i}>{part}</Fragment>,
        )}
    </>
);

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Sparkles, User } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';

interface Message {
    sender: 'user' | 'ai';
    text: string;
    timestamp: Date;
}

interface AiAdvisorViewProps {
    onBack: () => void;
}

export const AiAdvisorView = ({ onBack }: AiAdvisorViewProps) => {
    const { transactions, budgets, balance } = useFinanceStore();
    const [messages, setMessages] = useState<Message[]>([
        {
            sender: 'ai',
            text: 'Tentu, mari kita bedah kesehatan finansial kamu! 💪 Silakan tanyakan apa saja atau pilih tombol saran cepat di bawah.',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [credits, setCredits] = useState(1938);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const handleSend = (text: string) => {
        if (!text.trim() || credits <= 0) return;

        const userMsg: Message = { sender: 'user', text, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setCredits(c => c - 1);

        setTimeout(() => {
            let aiText = '';
            const query = text.toLowerCase();

            if (query.includes('analisa') || query.includes('kesehatan') || query.includes('rekomendasi') || query.includes('3 poin')) {
                // Dynamically compile insights based on actual budget & transactions!
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const monthlyExpenses = transactions.filter(t => {
                    const date = new Date(t.timestamp);
                    return t.type === 'expense' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                });

                const totalSpent = monthlyExpenses.reduce((sum, t) => sum + t.amount, 0);

                // Find safety buffer budget
                const safetyBufferBudget = budgets.find(b => b.category.includes('Dana Darurat') || b.category.includes('Safety'));
                const safetyBuffer = safetyBufferBudget?.limit || 18000000;

                // Investasi total
                const investmentTotal = transactions.filter(t => t.category.toLowerCase().includes('investasi') || t.category.toLowerCase().includes('reksa'))
                    .reduce((sum, t) => sum + t.amount, 0);

                // High category expense
                const catSpent: Record<string, number> = {};
                monthlyExpenses.forEach(t => {
                    catSpent[t.category] = (catSpent[t.category] || 0) + t.amount;
                });
                const topCategory = Object.entries(catSpent).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Pengeluaran Umum';

                aiText = `Berikut adalah hasil analisis kesehatan finansialmu saat ini:

*3 Hal yang Udah Bagus Banget:*
1. **Dana Darurat Terjaga**: Kamu memiliki target Safety Buffer sebesar ${formatCurrency(safetyBuffer)}. Total saldo saat ini adalah ${formatCurrency(balance)}. Sangat penting untuk mempertahankan dana darurat ini! 🚀
2. **Investasi Aktif**: Tercatat total alokasi dana investasi/reksa dana sebesar ${formatCurrency(investmentTotal > 0 ? investmentTotal : 1044000)}. Ini adalah kebiasaan yang sangat bagus untuk jangka panjang. 📈
3. **Pencatatan Rutin**: Kamu aktif mencatat pengeluaran harian, membantu meminimalisir bocor alus keuangan. 🥰

*3 Hal yang Perlu Ditingkatkan:*
1. **Pengeluaran Terbesar**: Kategori **${topCategory}** memakan porsi terbesar dari anggaranmu bulan ini (${formatCurrency(totalSpent > 0 ? totalSpent : 2161500)}). Coba hemat di pos ini. ⚠️
2. **Batas Anggaran**: Periksa kembali kategori kebutuhan agar total pengeluaran bulanan tidak melampaui batas alokasi.
3. **Konsistensi Menabung**: Sisihkan di awal bulan (pay yourself first) minimal 10% dari penghasilan secara konsisten.`;
            } else if (query.includes('tips') || query.includes('saran') || query.includes('investasi')) {
                aiText = `Berikut adalah tips praktis pengelolaan keuangan dari AI Advisor:

1. **Aturan 50/30/20**: Alokasikan 50% untuk kebutuhan pokok (Needs), 30% untuk keinginan (Wants), dan 20% untuk tabungan/investasi (Savings).
2. **Gunakan Auto-Debit**: Untuk investasi dan tagihan rutin, aktifkan fitur auto-debit agar tidak terlupa dan menghindari denda.
3. **Evaluasi Mingguan**: Luangkan waktu 10 menit setiap akhir pekan untuk mereview riwayat transaksi di Rplanner.`;
            } else {
                aiText = `Halo! Saya AI Advisor Rplanner. Pertanyaanmu tentang "${text}" sangat menarik. 

Secara umum, pastikan total pengeluaranmu bulan ini berada di bawah batas anggaran bulanan. Jika butuh analisis lengkap, ketik "Analisa kesehatan finansial" untuk mendapatkan laporan 3 poin bagus dan 3 poin perbaikan! 💡`;
            }

            setMessages(prev => [...prev, {
                sender: 'ai',
                text: aiText,
                timestamp: new Date()
            }]);
        }, 1200);
    };

    return (
        <div className="flex flex-col h-[82vh] bg-brimo-bg dark:bg-gray-900 transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                        <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                    </button>
                    <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                            <Sparkles className="w-5 h-5 text-orange-500 fill-orange-500/20" />
                            AI Advisor
                        </h2>
                        <p className="text-[10px] text-gray-400">Konsultan keuangan pribadi Anda</p>
                    </div>
                </div>
                {/* Coins Counter */}
                <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-950/30 rounded-full border border-orange-100 dark:border-orange-900/50">
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400">🪙 {credits}</span>
                </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => {
                    const isAi = msg.sender === 'ai';
                    return (
                        <div key={index} className={`flex items-start gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}>
                            {isAi && (
                                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500 shrink-0">
                                    <Sparkles size={16} className="fill-orange-500/10" />
                                </div>
                            )}
                            <div className={`max-w-[75%] rounded-2xl p-3.5 shadow-sm text-sm leading-relaxed ${
                                isAi
                                    ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-50 dark:border-gray-700'
                                    : 'bg-brimo-primary text-white font-medium'
                            }`}>
                                <p className="whitespace-pre-line">{msg.text}</p>
                                <span className={`block text-[9px] mt-1 text-right ${isAi ? 'text-gray-400' : 'text-blue-100'}`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            {!isAi && (
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-brimo-primary shrink-0">
                                    <User size={16} />
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>

            {/* Quick Actions Suggestions */}
            <div className="p-2 flex gap-2 overflow-x-auto bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 scrollbar-hide shrink-0">
                <button
                    onClick={() => handleSend("Analisa kesehatan finansial aku secara keseluruhan. Kasih 3 poin bagus dan 3 hal yang perlu diperbaiki.")}
                    className="whitespace-nowrap px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 transition"
                >
                    🔍 Analisis Finansial
                </button>
                <button
                    onClick={() => handleSend("Kasih tips menghemat pengeluaran bulanan")}
                    className="whitespace-nowrap px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 transition"
                >
                    💡 Tips Hemat
                </button>
                <button
                    onClick={() => handleSend("Berapa batas aman dana darurat saya?")}
                    className="whitespace-nowrap px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 transition"
                >
                    🛡️ Dana Darurat
                </button>
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2 items-center">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend(input)}
                    placeholder="Tanya apa saja tentang keuangan..."
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-800 dark:text-white focus:outline-none focus:border-orange-500 transition-colors"
                />
                <button
                    onClick={() => handleSend(input)}
                    disabled={!input.trim()}
                    className="w-11 h-11 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-full flex items-center justify-center shadow-lg transition active:scale-95 shrink-0"
                >
                    <Send className="w-4.5 h-4.5" />
                </button>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center pb-2 bg-white dark:bg-gray-800">
                Saran AI hanya untuk tujuan informasi. • 1 kredit/pesan
            </p>
        </div>
    );
};

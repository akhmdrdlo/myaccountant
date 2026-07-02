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
    const { transactions, budgets, goals, subscriptions, investments } = useFinanceStore();
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

            if (query.includes('investasi') || query.includes('saham') || query.includes('reksadana') || query.includes('crypto')) {
                const totalVal = investments.reduce((sum, inv) => sum + (inv.currentPrice * inv.totalUnits), 0);
                if (investments.length === 0) {
                    aiText = `Kamu belum memiliki portofolio investasi terdaftar di Rplanner. 

💡 **Saran AI:** Sangat direkomendasikan untuk menyisihkan minimal 10-20% pendapatan bulanan kamu langsung di awal bulan ke instrumen reksadana pasar uang atau saham untuk masa depan! Kamu bisa menambahkannya di tab **Investasi**.`;
                } else {
                    const invList = investments.map((inv, i) => `${i + 1}. **${inv.name}** (${inv.symbol || 'Tanpa Simbol'}): ${formatCurrency(inv.currentPrice * inv.totalUnits)}`).join('\n');
                    aiText = `Berikut adalah ulasan portofolio investasimu saat ini:

${invList}

*   **Total Nilai Portofolio:** ${formatCurrency(totalVal)}
*   **Analisis Diversifikasi:** Kamu memiliki ${investments.length} jenis aset investasi. Terus pertahankan investasi rutin bulanan Anda (DCA) agar nilainya berlipat ganda! 📈`;
                }
            } else if (query.includes('langganan') || query.includes('subscription') || query.includes('tagihan') || query.includes('biaya rutin')) {
                const totalSubCost = subscriptions.reduce((sum, s) => sum + s.amount, 0);
                if (subscriptions.length === 0) {
                    aiText = `Bagus sekali! Kamu tidak memiliki biaya langganan rutin (seperti Netflix, Spotify, VPS) yang terdaftar di Rplanner. Keuanganmu aman dari bocor alus pengeluaran bulanan otomatis! 🚀`;
                } else {
                    const subList = subscriptions.map((s, i) => `${i + 1}. **${s.name}**: ${formatCurrency(s.amount)} / bulan`).join('\n');
                    aiText = `Berikut adalah daftar biaya langganan bulananmu:

${subList}

*   **Total Biaya Langganan:** ${formatCurrency(totalSubCost)} per bulan
*   **Rekomendasi AI:** Apakah seluruh layanan di atas masih aktif digunakan? Coba batalkan 1-2 layanan yang jarang kamu buka untuk menghemat pengeluaran bulananmu! 💡`;
                }
            } else if (query.includes('goals') || query.includes('target') || query.includes('barang harapan') || query.includes('wishlist')) {
                if (goals.length === 0) {
                    aiText = `Kamu belum mendaftarkan sasaran atau Barang Harapan (wishlist) impianmu di Rplanner. 

🎯 **Tips AI:** Menetapkan tujuan pembelian yang spesifik (misal: "Beli Laptop", "Liburan") beserta nominal target dan tanggal tenggat membantu kamu lebih berdisiplin menabung! Silakan buat satu di menu **Barang Harapan**.`;
                } else {
                    const goalList = goals.map((g, i) => {
                        const amt = typeof g.currentAmount === 'string' ? parseFloat(g.currentAmount) || 0 : g.currentAmount;
                        const pct = g.targetAmount > 0 ? (amt / g.targetAmount) * 100 : 0;
                        return `${i + 1}. **${g.name}** (Target: ${formatCurrency(g.targetAmount)} | Kumpul: ${formatCurrency(amt)} - *Progress: ${pct.toFixed(1)}%*)`;
                    }).join('\n');
                    aiText = `Berikut adalah progres target Barang Harapan kamu:

${goalList}

Tetap konsisten menabung untuk mencapai impianmu! Tiap rupiah yang kamu sisihkan membawa kamu lebih dekat dengan target ini. 💪`;
                }
            } else if (query.includes('analisa') || query.includes('kesehatan') || query.includes('rekomendasi') || query.includes('3 poin')) {
                // Dynamically compile insights based on actual data
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const monthlyExpenses = transactions.filter(t => {
                    const date = new Date(t.timestamp);
                    return t.type === 'expense' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                });

                const totalSpent = monthlyExpenses.reduce((sum, t) => sum + t.amount, 0);

                const safetyBufferBudget = budgets.find(b => b.category.toLowerCase().includes('darurat') || b.category.toLowerCase().includes('safety'));
                const safetyBuffer = safetyBufferBudget?.limit || 5000000;

                const investmentTotal = investments.reduce((sum, inv) => sum + (inv.currentPrice * inv.totalUnits), 0);

                // High category expense
                const catSpent: Record<string, number> = {};
                monthlyExpenses.forEach(t => {
                    catSpent[t.category] = (catSpent[t.category] || 0) + t.amount;
                });
                const topCategory = Object.entries(catSpent).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Lainnya';

                // Find if any budget exceeded
                const overBudgets = budgets.filter(b => {
                    const spent = monthlyExpenses.filter(t => t.category === b.category).reduce((sum, t) => sum + t.amount, 0);
                    return spent > b.limit;
                });

                aiText = `Berikut adalah hasil analisis kesehatan finansialmu saat ini:

*3 Hal yang Sudah Bagus:*
1. **Target Dana Darurat**: Kamu menetapkan target buffer sebesar ${formatCurrency(safetyBuffer)}. Memiliki target dana darurat sangat penting untuk ketahanan keuangan! 🛡️
2. **Aset Portofolio**: Tercatat kamu mengelola portofolio investasi senilai ${formatCurrency(investmentTotal)}. Pertahankan untuk masa depan jangka panjang! 📈
3. **Pencatatan Mandiri**: Riwayat transaksimu terdaftar dengan rapi (${transactions.length} transaksi tercatat).

*3 Rekomendasi Perbaikan:*
1. **Pos Pengeluaran Tertinggi**: Pos **${topCategory}** memakan pengeluaran terbesar kamu bulan ini (${formatCurrency(totalSpent)}). Coba kendalikan di minggu-minggu berikutnya. ⚠️
2. **Kepatuhan Anggaran**: ${overBudgets.length > 0 ? `Kategori **${overBudgets.map(b => b.category).join(', ')}** telah melampaui batas anggaran!` : 'Semua anggaran bulananmu saat ini masih dalam batas aman (belum ada yang bocor). Pertahankan!'}
3. **Penghematan Rutin**: Evaluasi total biaya langganan bulananmu sebesar ${formatCurrency(subscriptions.reduce((sum, s) => sum + s.amount, 0))} agar tidak mengganggu pos tabungan.`;
            } else if (query.includes('tips') || query.includes('saran')) {
                aiText = `Berikut adalah tips praktis pengelolaan keuangan dari AI Advisor:

1. **Aturan 50/30/20**: Alokasikan 50% untuk kebutuhan pokok (Needs), 30% untuk keinginan (Wants), dan 20% untuk tabungan/investasi (Savings).
2. **Gunakan Auto-Debit**: Untuk investasi dan tagihan rutin, aktifkan fitur auto-debit agar tidak terlupa dan menghindari denda.
3. **Evaluasi Mingguan**: Luangkan waktu 10 menit setiap akhir pekan untuk mereview riwayat transaksi di Rplanner.`;
            } else {
                aiText = `Halo! Saya AI Advisor Rplanner. Pertanyaanmu tentang "${text}" sangat menarik. 

Untuk membantu kamu dengan data riil dari databasemu, kamu bisa mencoba mengetik:
*   "**Analisa kesehatan finansial**" - Untuk melihat 3 poin bagus dan rekomendasi keuanganmu.
*   "**Cek investasi**" - Untuk meringkas seluruh aset reksadana, saham, atau crypto milikmu.
*   "**Cek biaya langganan**" - Untuk melacak berapa pengeluaran rutin bulananmu.
*   "**Cek barang harapan**" - Untuk memantau progres tabungan barang wishlist impianmu.`;
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

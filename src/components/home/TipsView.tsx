import { ArrowLeft, Lightbulb, BookOpen } from 'lucide-react';

interface TipsViewProps {
    onBack: () => void;
}

const TIPS = [
    {
        title: "Terapkan Aturan Anggaran 50/30/20",
        desc: "Bagi penghasilan bersihmu menjadi 3 bagian: 50% untuk kebutuhan pokok (Kost, makan, utilitas), 30% untuk hiburan/keinginan, dan 20% tabungan atau investasi.",
        tag: "Budgeting",
        color: "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20"
    },
    {
        title: "Miliki Dana Darurat (Safety Buffer)",
        desc: "Usahakan memiliki simpanan minimal 3-6 kali rata-rata pengeluaran bulanan di rekening terpisah (misal di Seabank) untuk kebutuhan tak terduga seperti medis atau perbaikan barang.",
        tag: "Proteksi",
        color: "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/20"
    },
    {
        title: "Batasi Cicilan Maksimal 30% Pendapatan",
        desc: "Total semua cicilan bulanan (termasuk PayLater, KPR, kendaraan) sebaiknya tidak melebihi 30% dari penghasilan bulananmu agar arus kas tetap sehat.",
        tag: "Utang",
        color: "border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20"
    },
    {
        title: "Sisihkan di Awal Bulan (Pay Yourself First)",
        desc: "Kunci investasi konsisten adalah menyisihkan uang investasi langsung saat gajian tiba, bukan menginvestasikan sisa uang di akhir bulan.",
        tag: "Investasi",
        color: "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20"
    },
    {
        title: "Waspadai Bocor Alus (Langganan Rutin)",
        desc: "Periksa kembali langganan aplikasi/layanan bulananmu secara berkala. Matikan langganan yang sudah tidak digunakan secara aktif selama lebih dari sebulan.",
        tag: "Efisiensi",
        color: "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20"
    }
];

export const TipsView = ({ onBack }: TipsViewProps) => {
    return (
        <div className="flex flex-col min-h-[80vh] bg-rp-canvas dark:bg-gray-900 transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                        <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                    </button>
                    <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                            <Lightbulb className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                            Tips Finansial
                        </h2>
                        <p className="text-xs text-gray-400">Tips cerdas mengelola uang Anda</p>
                    </div>
                </div>
            </div>

            {/* Content list */}
            <div className="p-4 space-y-4">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 opacity-10">
                        <BookOpen size={120} />
                    </div>
                    <h3 className="font-bold text-base mb-1">Mulai Perjalanan Keuangan Sehat</h3>
                    <p className="text-xs text-blue-100 leading-relaxed">Ikuti panduan dan tips di bawah ini secara disiplin untuk mencapai kemandirian finansial lebih cepat!</p>
                </div>

                <div className="space-y-3">
                    {TIPS.map((tip, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md flex gap-3">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase border ${tip.color}`}>
                                        {tip.tag}
                                    </span>
                                    <span className="text-xs text-gray-400 font-bold">Tips #{idx + 1}</span>
                                </div>
                                <h4 className="font-bold text-sm text-gray-800 dark:text-white">{tip.title}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{tip.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

import { useState } from 'react';
import { toast } from 'sonner';
import { FileUp, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useSupabase } from '../../hooks/useSupabase';
import { SubviewHeader } from '../layout/SubviewHeader';
import { Field, PrimaryButton, fieldClass } from '../common/Sheet';
import { buildRows, guessColumns, parseCsv, type ColumnMap, type ImportRow } from '../../lib/statementImport';
import { cn, formatRupiah } from '../../lib/utils';

interface ImportViewProps {
    onBack: () => void;
    onDone: () => Promise<void> | void;
}

const COLS: { key: keyof ColumnMap; label: string; optional?: boolean }[] = [
    { key: 'date', label: 'Tanggal' },
    { key: 'description', label: 'Keterangan' },
    { key: 'amount', label: 'Nominal (satu kolom)', optional: true },
    { key: 'debit', label: 'Debit / keluar', optional: true },
    { key: 'credit', label: 'Kredit / masuk', optional: true },
];

export const ImportView = ({ onBack, onDone }: ImportViewProps) => {
    const { accounts, merchantRules } = useFinanceStore();
    const { importTransactions } = useSupabase();
    const [fileName, setFileName] = useState('');
    const [table, setTable] = useState<string[][]>([]);
    const [map, setMap] = useState<ColumnMap | null>(null);
    const [account, setAccount] = useState(accounts.find(a => a.institution !== 'cash')?.name ?? accounts[0]?.name ?? '');
    const [preview, setPreview] = useState<{ ok: ImportRow[]; skipped: number } | null>(null);
    const [progress, setProgress] = useState<number | null>(null);

    const header = table[0] ?? [];

    const loadFile = async (file: File) => {
        if (file.size > 5 * 1024 * 1024) return toast.error('File maksimal 5MB.');
        const rows = parseCsv(await file.text());
        if (rows.length < 2) return toast.error('File kosong atau bukan CSV.');
        // Lewati baris info di atas tabel (nama rekening, periode) — header = baris pertama yang punya kolom tanggal
        const headerIdx = rows.findIndex(r => guessColumns(r).date >= 0);
        const trimmed = headerIdx > 0 ? rows.slice(headerIdx) : rows;
        setFileName(file.name);
        setTable(trimmed);
        const guess = guessColumns(trimmed[0]);
        setMap(guess);
        setPreview(await buildRows(trimmed.slice(1), guess, merchantRules));
    };

    const updateMap = async (key: keyof ColumnMap, idx: number) => {
        if (!map) return;
        const next = { ...map, [key]: idx };
        // Satu kolom nominal ATAU pasangan debit/kredit
        if (key === 'amount' && idx >= 0) { next.debit = -1; next.credit = -1; }
        if ((key === 'debit' || key === 'credit') && idx >= 0) next.amount = -1;
        setMap(next);
        setPreview(await buildRows(table.slice(1), next, merchantRules));
    };

    const runImport = async () => {
        if (!preview?.ok.length || !account) return;
        setProgress(0);
        const res = await importTransactions(preview.ok, account, setProgress);
        setProgress(null);
        if (!res.ok) return toast.error('Impor berhenti di tengah. Sudah jalankan migrasi kolom external_id? Baris yang sudah masuk tidak akan dobel kalau diulang.');
        toast.success(`${res.sent} baris diproses. Baris yang pernah diimpor otomatis dilewati.`);
        await onDone();
    };

    const income = preview?.ok.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0) ?? 0;
    const expense = preview?.ok.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0) ?? 0;

    return (
        <div className="space-y-4">
            <SubviewHeader title="Impor mutasi rekening" subtitle="Dari file CSV internet banking" onBack={onBack} />

            <label className="rp-card border-dashed p-5 flex items-center gap-4 cursor-pointer hover:bg-rp-surface-2">
                <span className="w-12 h-12 rounded-2xl bg-rp-surface-2 text-rp-royal flex items-center justify-center shrink-0"><FileUp className="w-6 h-6" /></span>
                <span>
                    <span className="block text-sm font-semibold text-rp-ink">{fileName || 'Pilih file CSV'}</span>
                    <span className="block text-xs text-rp-ink-2">Unduh mutasi di internet banking (KlikBCA, Livin, BRImo web, dll) dalam format CSV.</span>
                </span>
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) loadFile(f); }} />
            </label>

            {map && (
                <>
                    <section className="rp-card p-4 space-y-3">
                        <h2 className="rp-section-title">Kolom</h2>
                        <p className="text-xs text-rp-ink-2">Sudah ditebak dari judul kolom. Ubah kalau ada yang salah.</p>
                        <div className="grid grid-cols-2 gap-2">
                            {COLS.map(c => (
                                <Field key={c.key} label={c.label}>
                                    <select value={map[c.key]} onChange={e => updateMap(c.key, Number(e.target.value))} className={fieldClass}>
                                        <option value={-1}>{c.optional ? 'Tidak ada' : 'Pilih kolom'}</option>
                                        {header.map((h, i) => <option key={i} value={i}>{h || `Kolom ${i + 1}`}</option>)}
                                    </select>
                                </Field>
                            ))}
                        </div>
                        <Field label="Masuk ke dompet">
                            <select value={account} onChange={e => setAccount(e.target.value)} className={fieldClass}>
                                {accounts.map(a => <option key={a.name}>{a.name}</option>)}
                            </select>
                        </Field>
                    </section>

                    {preview && (
                        <section className="rp-card p-4">
                            <div className="flex items-baseline justify-between">
                                <h2 className="rp-section-title">{preview.ok.length} transaksi terbaca</h2>
                                {preview.skipped > 0 && <span className="text-xs text-rp-ink-2">{preview.skipped} baris dilewati</span>}
                            </div>
                            <p className="mt-1 text-sm rp-num">
                                <span className="text-rp-in font-semibold">+{formatRupiah(income)}</span>
                                <span className="text-rp-ink-2"> · </span>
                                <span className="text-rp-out font-semibold">−{formatRupiah(expense)}</span>
                            </p>
                            <ul className="mt-3 divide-y divide-rp-line">
                                {preview.ok.slice(0, 8).map(r => (
                                    <li key={r.externalId} className="flex items-center gap-3 py-2.5">
                                        <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', r.type === 'income' ? 'bg-rp-in-soft text-rp-in' : 'bg-rp-out-soft text-rp-out')}>
                                            {r.type === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm text-rp-ink truncate">{r.description || '(tanpa keterangan)'}</span>
                                            <span className="block text-xs text-rp-ink-2">{r.date.toLocaleDateString('id-ID')} · {r.category}</span>
                                        </span>
                                        <span className={cn('text-sm font-semibold rp-num', r.type === 'income' ? 'text-rp-in' : 'text-rp-out')}>
                                            {r.type === 'income' ? '+' : '−'}{formatRupiah(r.amount)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            {preview.ok.length > 8 && <p className="mt-2 text-xs text-rp-ink-2">dan {preview.ok.length - 8} lainnya.</p>}
                        </section>
                    )}

                    <PrimaryButton onClick={runImport} disabled={!preview?.ok.length || progress !== null}>
                        {progress !== null ? `Mengimpor ${progress}/${preview?.ok.length}…` : `Impor ${preview?.ok.length ?? 0} transaksi`}
                    </PrimaryButton>
                    <p className="text-xs text-rp-ink-2 text-center">Aman diulang: baris yang sama tidak akan tercatat dua kali.</p>
                </>
            )}
        </div>
    );
};

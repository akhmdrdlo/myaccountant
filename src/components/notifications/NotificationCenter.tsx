import { useEffect, useState, type ReactNode } from 'react';
import { BellRing, Check, Copy, KeyRound, Mail, Share2, Smartphone, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { disablePush, enablePush, getCurrentSubscription, getPushSupport, isIOS, sendTestPush } from '../../lib/push';
import { parseBankText, type ParsedBankText } from '../../lib/parseBankText';
import { AI_ENABLED, AiError, aiParse } from '../../lib/ai';
import { SubviewHeader } from '../layout/SubviewHeader';
import { cn, formatRupiah } from '../../lib/utils';

interface Prefs {
    bill_reminder: boolean;
    budget_alert: boolean;
    daily_reminder: boolean;
    daily_hour: number;
    auto_confirm: boolean;
    notify_on_capture: boolean;
    weekly_summary: boolean;
    ai_fallback: boolean;
}

const DEFAULT_PREFS: Prefs = {
    bill_reminder: true,
    budget_alert: true,
    daily_reminder: false,
    daily_hour: 20,
    auto_confirm: false,
    notify_on_capture: true,
    weekly_summary: true,
    ai_fallback: true,
};

const MACRODROID_BODY = '{"title":"[notification_title]","text":"[notification]","app":"[app_name]"}';
const INGEST_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/ingest`;

interface NotificationCenterProps {
    onBack: () => void;
    onCreateDraft: (parsed: ParsedBankText, rawKey: string) => Promise<boolean>;
}

export const NotificationCenter = ({ onBack, onCreateDraft }: NotificationCenterProps) => {
    const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
    const [dbReady, setDbReady] = useState(true);
    const [pushOn, setPushOn] = useState(false);
    const [busy, setBusy] = useState(false);
    const [tokenHint, setTokenHint] = useState<string | null>(null);
    const [freshToken, setFreshToken] = useState<string | null>(null);
    const support = getPushSupport();

    useEffect(() => {
        (async () => {
            setPushOn(Boolean(await getCurrentSubscription()) && Notification.permission === 'granted');
            const [{ data: p, error: pErr }, { data: t }] = await Promise.all([
                supabase.from('notification_prefs').select('*').maybeSingle(),
                supabase.from('ingest_tokens').select('token_hint').maybeSingle(),
            ]);
            if (pErr) { setDbReady(false); return; }
            if (p) setPrefs({ ...DEFAULT_PREFS, ...p });
            setTokenHint(t?.token_hint ?? null);
        })();
    }, []);

    const savePrefs = async (patch: Partial<Prefs>) => {
        const next = { ...prefs, ...patch };
        setPrefs(next);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase.from('notification_prefs').upsert({
            user_id: user.id,
            ...next,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
            updated_at: new Date().toISOString(),
        });
        if (error) toast.error('Pengaturan gagal disimpan.');
    };

    const togglePush = async () => {
        setBusy(true);
        try {
            if (pushOn) {
                await disablePush();
                setPushOn(false);
                toast.success('Notifikasi di perangkat ini dimatikan.');
            } else {
                const res = await enablePush();
                if (res.ok) {
                    setPushOn(true);
                    toast.success('Notifikasi aktif di perangkat ini.');
                } else if (res.reason === 'denied') {
                    toast.error('Izin notifikasi ditolak. Aktifkan lewat pengaturan situs di browser.');
                } else {
                    toast.error(`Gagal mengaktifkan notifikasi: ${res.reason}`);
                }
            }
        } finally {
            setBusy(false);
        }
    };

    const rotateToken = async () => {
        if (tokenHint && !window.confirm('Token lama akan berhenti bekerja. Buat token baru?')) return;
        const { data, error } = await supabase.rpc('rotate_ingest_token');
        if (error || typeof data !== 'string') {
            toast.error('Gagal membuat token. Pastikan migrasi database sudah dijalankan.');
            return;
        }
        setFreshToken(data);
        setTokenHint(data.slice(-4));
    };

    return (
        <div className="space-y-6">
            <SubviewHeader title="Notifikasi & catat otomatis" onBack={onBack} />

            {!dbReady && (
                <p role="alert" className="rounded-xl bg-rp-warn-soft text-rp-warn text-sm p-3">
                    Database belum diperbarui. Jalankan <code className="font-mono">supabase/migrations/20261124000000_push_and_autocapture.sql</code> di Supabase SQL Editor dulu.
                </p>
            )}

            {/* ── Notifikasi di HP ───────────────────────────── */}
            <Section icon={BellRing} title="Notifikasi di perangkat ini">
                {support === 'needs-install' && (
                    <p className="text-sm text-rp-ink-2">
                        Di iPhone, notifikasi hanya jalan kalau Rplanner sudah dipasang: ketuk tombol <b>Bagikan</b> di Safari → <b>Tambah ke Layar Utama</b>, lalu buka Rplanner dari ikon tersebut.
                    </p>
                )}
                {support === 'unsupported' && <p className="text-sm text-rp-ink-2">Browser ini belum mendukung notifikasi push. Coba Chrome di Android atau Safari iOS 16.4+.</p>}
                {support === 'not-configured' && <p className="text-sm text-rp-ink-2">Kunci VAPID belum diisi (<code className="font-mono">VITE_VAPID_PUBLIC_KEY</code>).</p>}
                {support === 'supported' && (
                    <div className="flex gap-2">
                        <button
                            onClick={togglePush}
                            disabled={busy}
                            className={cn('flex-1 h-11 rounded-xl text-sm font-semibold transition disabled:opacity-60',
                                pushOn ? 'border border-rp-line text-rp-ink' : 'bg-rp-action hover:bg-rp-action-press text-white')}
                        >
                            {pushOn ? 'Matikan di perangkat ini' : 'Aktifkan notifikasi'}
                        </button>
                        {pushOn && (
                            <button
                                onClick={async () => {
                                    try {
                                        const n = await sendTestPush();
                                        toast.success(n ? 'Notifikasi uji terkirim.' : 'Belum ada perangkat terdaftar.');
                                    } catch {
                                        toast.error('Edge Function push-test belum di-deploy.');
                                    }
                                }}
                                className="h-11 px-4 rounded-xl bg-rp-surface-2 text-rp-royal text-sm font-semibold"
                            >
                                Kirim tes
                            </button>
                        )}
                    </div>
                )}
            </Section>

            {/* ── Pengingat ─────────────────────────────────── */}
            <Section icon={Smartphone} title="Ingatkan aku saat…">
                <Toggle label="Tagihan jatuh tempo besok" hint="Dikirim jam 08.00" checked={prefs.bill_reminder} onChange={v => savePrefs({ bill_reminder: v })} />
                <Toggle label="Budget kategori hampir habis" hint="Saat terpakai 80% dan 100%" checked={prefs.budget_alert} onChange={v => savePrefs({ budget_alert: v })} />
                <Toggle label="Ringkasan mingguan" hint="Tiap Senin 08.00, kalimatnya ditulis AI" checked={prefs.weekly_summary} onChange={v => savePrefs({ weekly_summary: v })} />
                <Toggle label="Belum mencatat hari ini" checked={prefs.daily_reminder} onChange={v => savePrefs({ daily_reminder: v })} />
                {prefs.daily_reminder && (
                    <label className="flex items-center justify-between text-sm text-rp-ink pl-1">
                        Jam pengingat
                        <select
                            value={prefs.daily_hour}
                            onChange={e => savePrefs({ daily_hour: Number(e.target.value) })}
                            className="h-11 px-3 rounded-xl bg-rp-canvas border border-rp-line rp-num"
                        >
                            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}.00</option>)}
                        </select>
                    </label>
                )}
            </Section>

            {/* ── Catat otomatis ────────────────────────────── */}
            <Section icon={Wand2} title="Catat otomatis dari bank & e-wallet">
                <p className="text-sm text-rp-ink-2">
                    Rplanner membaca nominal, arah uang, dan merchant dari teks notifikasi atau email, lalu menaruhnya di <b>Transaksi terdeteksi</b> untuk kamu konfirmasi.
                </p>

                <div className="rounded-xl bg-rp-canvas border border-rp-line p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-semibold text-rp-ink">
                            <KeyRound className="w-4 h-4 text-rp-royal" /> Token pribadi
                        </span>
                        <button onClick={rotateToken} className="h-9 px-3 rounded-lg bg-rp-surface-2 text-rp-royal text-xs font-semibold">
                            {tokenHint ? 'Buat ulang' : 'Buat token'}
                        </button>
                    </div>
                    {freshToken ? (
                        <>
                            <CopyField value={freshToken} />
                            <p className="text-xs text-rp-warn">Salin sekarang. Token ini tidak akan ditampilkan lagi.</p>
                        </>
                    ) : (
                        <p className="text-xs text-rp-ink-2">{tokenHint ? `Aktif · berakhiran …${tokenHint}` : 'Belum ada token.'}</p>
                    )}
                    <p className="text-xs text-rp-ink-2 pt-1">Alamat webhook</p>
                    <CopyField value={INGEST_URL} />
                </div>

                <Guide icon={Smartphone} title="Android: dari notifikasi bank (MacroDroid)">
                    <ol className="list-decimal pl-5 space-y-1">
                        <li>Pasang <b>MacroDroid</b> dari Play Store, beri izin <i>Akses Notifikasi</i>.</li>
                        <li>Pemicu: <b>Notifikasi Diterima</b> → pilih aplikasi bank/e-wallet kamu (BCA, BRImo, Livin, GoPay, DANA, dll).</li>
                        <li>Aksi: <b>HTTP Request</b> · metode <b>POST</b> · URL:</li>
                    </ol>
                    <div className="mt-2 space-y-2">
                        <CopyField value={INGEST_URL} />
                        <p>Header (nama lalu isinya):</p>
                        <CopyField value="x-rplanner-token" />
                        <CopyField value={freshToken ?? 'buat token dulu di atas'} />
                        <p>Content type <b>application/json</b>, body:</p>
                        <CopyField value={MACRODROID_BODY} />
                    </div>
                    <p className="mt-2">Tips: di pemicu, centang <i>abaikan notifikasi berkelanjutan</i>. Promo dan OTP otomatis diabaikan Rplanner.</p>
                    <p className="mt-2">Tasker atau aplikasi "Notification Forwarder" juga bisa, selama mengirim POST yang sama.</p>
                </Guide>

                <Guide icon={Mail} title="Semua HP: dari email notifikasi bank">
                    <p>Aktifkan notifikasi transaksi via email di aplikasi bank. Lalu teruskan otomatis ke layanan email-to-webhook (mis. CloudMailin atau Make) yang mengirim POST ke alamat webhook dengan isi <code className="font-mono">{'{"text": isi email, "app": pengirim, "source": "email"}'}</code> dan header token.</p>
                </Guide>

                <Guide icon={Smartphone} title="iPhone: Shortcuts">
                    <p>Buka <b>Shortcuts → Automation</b>, pilih pemicu <b>Message</b> (SMS dari bank) atau <b>Transaction</b> (Apple Wallet). Tambahkan aksi <b>Get Contents of URL</b>: POST ke alamat webhook, header <code className="font-mono">x-rplanner-token</code>, body JSON <code className="font-mono">{'{"text": Message, "source": "shortcut"}'}</code>.</p>
                </Guide>

                <Guide icon={Share2} title="Tanpa setup: menu Bagikan">
                    <p>Setelah Rplanner dipasang di HP, tekan lama notifikasi/SMS/email → <b>Bagikan</b> → <b>Rplanner</b>. Formulir catat langsung terisi.</p>
                </Guide>

                <Toggle
                    label="Langsung catat tanpa konfirmasi"
                    hint="Hanya jika parser sangat yakin dan nama akun cocok. Sisanya tetap jadi draft."
                    checked={prefs.auto_confirm}
                    onChange={v => savePrefs({ auto_confirm: v })}
                />
                {AI_ENABLED && (
                    <Toggle
                        label="Bantu baca pakai AI"
                        hint="Kalau format notifikasi bank tidak dikenali, teksnya dibaca Claude Haiku. Teks dikirim ke Anthropic untuk diproses."
                        checked={prefs.ai_fallback}
                        onChange={v => savePrefs({ ai_fallback: v })}
                    />
                )}
                <Toggle label="Kabari aku tiap ada transaksi terdeteksi" checked={prefs.notify_on_capture} onChange={v => savePrefs({ notify_on_capture: v })} />
            </Section>

            <ParserPlayground onCreateDraft={onCreateDraft} />

            {isIOS() && <p className="text-xs text-rp-ink-2 text-center">iOS tidak mengizinkan aplikasi web membaca notifikasi aplikasi lain; gunakan Shortcuts atau email.</p>}
        </div>
    );
};

// ── Komponen kecil ─────────────────────────────────────────────

const Section = ({ icon: Icon, title, children }: { icon: typeof BellRing; title: string; children: ReactNode }) => (
    <section className="rp-card p-4 space-y-3">
        <h2 className="rp-section-title flex items-center gap-2">
            <Icon className="w-[18px] h-[18px] text-rp-royal" /> {title}
        </h2>
        {children}
    </section>
);

const Toggle = ({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center justify-between gap-3 min-h-[44px] cursor-pointer">
        <span>
            <span className="block text-sm font-medium text-rp-ink">{label}</span>
            {hint && <span className="block text-xs text-rp-ink-2">{hint}</span>}
        </span>
        <span className="relative shrink-0">
            <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <span className="block w-11 h-6 rounded-full bg-gray-300 peer-checked:bg-rp-royal transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-rp-royal peer-focus-visible:ring-offset-2" />
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </span>
    </label>
);

const Guide = ({ icon: Icon, title, children }: { icon: typeof BellRing; title: string; children: ReactNode }) => (
    <details className="group rounded-xl border border-rp-line">
        <summary className="flex items-center gap-2 min-h-[44px] px-3 text-sm font-semibold text-rp-ink cursor-pointer list-none">
            <Icon className="w-4 h-4 text-rp-royal" />
            <span className="flex-1">{title}</span>
            <span className="text-rp-ink-2 transition-transform group-open:rotate-90" aria-hidden>›</span>
        </summary>
        <div className="px-3 pb-3 text-sm text-rp-ink-2">{children}</div>
    </details>
);

const CopyField = ({ value }: { value: string }) => {
    const [copied, setCopied] = useState(false);
    return (
        <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate text-xs font-mono bg-rp-surface border border-rp-line rounded-lg px-2 py-2 text-rp-ink">{value}</code>
            <button
                onClick={async () => {
                    await navigator.clipboard.writeText(value);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                }}
                aria-label="Salin"
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-rp-surface-2 text-rp-royal"
            >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
        </div>
    );
};

const ParserPlayground = ({ onCreateDraft }: { onCreateDraft: NotificationCenterProps['onCreateDraft'] }) => {
    const [text, setText] = useState('');
    const [aiResult, setAiResult] = useState<{ text: string; parsed: ParsedBankText | null } | null>(null);
    const [asking, setAsking] = useState(false);
    const regex = text.trim() ? parseBankText(text) : null;
    const fromAi = aiResult?.text === text ? aiResult.parsed : null;
    const parsed = regex ?? fromAi;

    const askAi = async () => {
        setAsking(true);
        try {
            const r = await aiParse(text);
            setAiResult({
                text,
                parsed: r ? { amount: r.amount, type: r.type, category: r.category, merchant: r.merchant || undefined, accountHint: r.account_hint || undefined, confidence: 0.85 } : null,
            });
            if (!r) toast.info('AI juga menilai ini bukan transaksi.');
        } catch (err) {
            toast.error(err instanceof AiError ? err.message : 'AI gagal membaca.');
        } finally {
            setAsking(false);
        }
    };

    return (
        <section className="rp-card p-4 space-y-3">
            <h2 className="rp-section-title">Coba tempel teks notifikasi</h2>
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                placeholder="Contoh: Pembayaran QRIS Rp 25.000 di KOPI KENANGAN berhasil"
                className="w-full rounded-xl bg-rp-canvas border border-rp-line p-3 text-sm text-rp-ink placeholder:text-rp-ink-2"
            />
            {text.trim() && (parsed ? (
                <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                        <p className={cn('font-bold rp-num', parsed.type === 'income' ? 'text-rp-in' : 'text-rp-out')}>
                            {parsed.type === 'income' ? '+' : '−'}{formatRupiah(parsed.amount)}
                        </p>
                        <p className="text-xs text-rp-ink-2">
                            {[parsed.merchant, parsed.accountHint, parsed.category].filter(Boolean).join(' · ')} · yakin {Math.round(parsed.confidence * 100)}%
                        </p>
                    </div>
                    <button
                        onClick={async () => {
                            if (await onCreateDraft(parsed, text)) {
                                toast.success('Masuk ke Transaksi terdeteksi.');
                                setText('');
                            }
                        }}
                        className="h-11 px-4 rounded-xl bg-rp-surface-2 text-rp-royal text-sm font-semibold"
                    >
                        Jadikan draft
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-rp-ink-2">Pola biasa tidak menemukan transaksi di teks ini.</p>
                    {AI_ENABLED && (
                        <button onClick={askAi} disabled={asking || aiResult?.text === text}
                            className="h-11 px-4 shrink-0 rounded-xl bg-rp-surface-2 text-rp-royal text-sm font-semibold disabled:opacity-50">
                            {asking ? 'Membaca…' : 'Baca pakai AI'}
                        </button>
                    )}
                </div>
            ))}
        </section>
    );
};

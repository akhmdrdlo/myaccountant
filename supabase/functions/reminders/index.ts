// POST /functions/v1/reminders — dipanggil pg_cron tiap jam (lihat migrasi, bagian 7).
// Mengirim: tagihan jatuh tempo besok, peringatan budget 80%/100%, dan pengingat harian mencatat.
import { adminClient, claimOnce, formatRupiah, json, sendPushToUser } from '../_shared/push.ts';
import { aiEnabled, aiWeeklyLine } from '../_shared/ai.ts';

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const MORNING_HOUR = 8;

function localParts(date: Date, timeZone: string) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
        }).formatToParts(date).map((p) => [p.type, p.value]),
    );
    return { y: +parts.year, m: +parts.month, d: +parts.day, h: +parts.hour, ymd: `${parts.year}-${parts.month}-${parts.day}` };
}

Deno.serve(async (req) => {
    if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return json({ error: 'unauthorized' }, 401);

    const db = adminClient();
    const now = new Date();

    // Hanya pengguna yang punya perangkat terdaftar
    const { data: subs } = await db.from('push_subscriptions').select('user_id');
    const userIds = [...new Set((subs ?? []).map((s) => s.user_id as string))];

    let sent = 0;
    for (const userId of userIds) {
        const { data: prefsRow } = await db.from('notification_prefs').select('*').eq('user_id', userId).maybeSingle();
        const prefs = {
            bill_reminder: true, budget_alert: true, daily_reminder: false, daily_hour: 20, timezone: 'Asia/Jakarta', weekly_summary: true, ai_fallback: true,
            ...(prefsRow ?? {}),
        };
        const t = localParts(now, prefs.timezone);
        // Awal periode anggaran = tanggal gajian terakhir (1 = awal bulan kalender)
        const { data: settings } = await db.from('user_settings').select('payday').eq('user_id', userId).maybeSingle();
        const payday = Number(settings?.payday ?? 1);
        const clampDay = (y: number, m0: number, d: number) => Math.min(d, new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate());
        const [py, pm0] = t.d >= clampDay(t.y, t.m - 1, payday) ? [t.y, t.m - 1] : [t.m === 1 ? t.y - 1 : t.y, (t.m + 10) % 12];
        const monthStart = new Date(Date.UTC(py, pm0, clampDay(py, pm0, payday)) - 7 * 3600_000).toISOString(); // cukup akurat untuk WIB/WITA/WIT

        // 1) Tagihan, cicilan, dan utang yang jatuh tempo besok (sekali, jam 08.00)
        if (prefs.bill_reminder && t.h === MORNING_HOUR) {
            const tomorrow = localParts(new Date(now.getTime() + 86_400_000), prefs.timezone);
            const [{ data: bills }, { data: inst }, { data: debts }] = await Promise.all([
                db.from('subscriptions').select('id, name, amount, billing_date').eq('user_id', userId).eq('billing_date', tomorrow.d),
                db.from('installments').select('id, name, monthly_amount, paid_months, total_months').eq('user_id', userId).eq('due_day', tomorrow.d),
                db.from('debts').select('id, person, amount, direction').eq('user_id', userId).is('settled_at', null).eq('due_date', tomorrow.ymd),
            ]);
            const items = [
                ...(bills ?? []).map((b) => ({ key: `bill:${b.id}`, title: `Besok bayar ${b.name}`, body: `${formatRupiah(Number(b.amount))} jatuh tempo tanggal ${tomorrow.d}. Pastikan saldonya cukup.`, url: '/?view=deadlines' })),
                ...(inst ?? []).filter((i) => i.paid_months < i.total_months).map((i) => ({
                    key: `inst:${i.id}`, title: `Besok cicilan ${i.name}`,
                    body: `${formatRupiah(Number(i.monthly_amount))}, cicilan ke-${i.paid_months + 1} dari ${i.total_months}.`, url: '/?view=cicilan',
                })),
                ...(debts ?? []).map((d) => ({
                    key: `debt:${d.id}`,
                    title: d.direction === 'owe' ? `Besok bayar utang ke ${d.person}` : `Besok ${d.person} janji bayar`,
                    body: `${formatRupiah(Number(d.amount))}${d.direction === 'owed' ? '. Jangan sungkan mengingatkan.' : '.'}`, url: '/?view=utang',
                })),
            ];
            for (const it of items) {
                if (await claimOnce(db, userId, `${it.key}:${tomorrow.ymd}`)) {
                    sent += await sendPushToUser(db, userId, { title: it.title, body: it.body, url: it.url, tag: it.key });
                }
            }
        }

        // 2) Budget kategori ≥ 80% dan ≥ 100% (sekali per ambang per bulan)
        if (prefs.budget_alert) {
            const [{ data: budgets }, { data: txs }] = await Promise.all([
                db.from('budgets').select('category, limit').eq('user_id', userId),
                db.from('transactions').select('category, amount').eq('user_id', userId).eq('type', 'expense').gte('timestamp', monthStart),
            ]);
            const spent = new Map<string, number>();
            for (const tx of txs ?? []) spent.set(tx.category, (spent.get(tx.category) ?? 0) + Number(tx.amount));

            for (const b of budgets ?? []) {
                const limit = Number(b.limit);
                if (!limit || b.category.startsWith('Dana Darurat')) continue;
                const used = spent.get(b.category) ?? 0;
                const pct = used / limit;
                const level = pct >= 1 ? 100 : pct >= 0.8 ? 80 : 0;
                if (!level) continue;
                if (await claimOnce(db, userId, `budget:${b.category}:${t.y}-${t.m}:${level}`)) {
                    sent += await sendPushToUser(db, userId, level === 100
                        ? { title: `Budget ${b.category} habis`, body: `Terpakai ${formatRupiah(used)} dari ${formatRupiah(limit)} bulan ini.`, url: '/?tab=analytics', tag: `budget-${b.category}` }
                        : { title: `Budget ${b.category} tinggal ${Math.round((1 - pct) * 100)}%`, body: `Sisa ${formatRupiah(limit - used)} untuk bulan ini.`, url: '/?tab=analytics', tag: `budget-${b.category}` });
                }
            }
        }

        // 3) Ringkasan mingguan tiap Senin 08.00 (kalimat ditulis Claude Haiku jika AI aktif)
        const weekday = new Intl.DateTimeFormat('en-US', { timeZone: prefs.timezone, weekday: 'short' }).format(now);
        if (prefs.weekly_summary !== false && weekday === 'Mon' && t.h === MORNING_HOUR && await claimOnce(db, userId, `weekly:${t.ymd}`)) {
            const since = new Date(now.getTime() - 14 * 86_400_000).toISOString();
            const { data: recent } = await db.from('transactions').select('type, category, amount, timestamp')
                .eq('user_id', userId).gte('timestamp', since);
            const cut = now.getTime() - 7 * 86_400_000;
            const isReal = (c: string) => !/^(transfer \/ tarik tunai|penyesuaian saldo)$/i.test(c);
            const sum = (fromMs: number, toMs: number, type: string) => (recent ?? [])
                .filter((r) => r.type === type && isReal(r.category) && +new Date(r.timestamp) >= fromMs && +new Date(r.timestamp) < toMs)
                .reduce((s, r) => s + Number(r.amount), 0);
            const thisOut = sum(cut, now.getTime(), 'expense');
            const lastOut = sum(cut - 7 * 86_400_000, cut, 'expense');
            const thisIn = sum(cut, now.getTime(), 'income');

            if (thisOut > 0 || thisIn > 0) {
                const byCat = new Map<string, number>();
                for (const r of recent ?? []) {
                    if (r.type === 'expense' && isReal(r.category) && +new Date(r.timestamp) >= cut) byCat.set(r.category, (byCat.get(r.category) ?? 0) + Number(r.amount));
                }
                const top = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
                const summary = [
                    `Pengeluaran 7 hari terakhir: ${formatRupiah(thisOut)} (minggu sebelumnya ${formatRupiah(lastOut)}).`,
                    `Pemasukan 7 hari terakhir: ${formatRupiah(thisIn)}.`,
                    `Kategori terbesar: ${top.map(([c, v]) => `${c} ${formatRupiah(v)}`).join(', ') || '-'}.`,
                ].join('\n');

                let body = `Keluar ${formatRupiah(thisOut)} minggu ini${lastOut ? `, ${thisOut > lastOut ? 'naik' : 'turun'} dari ${formatRupiah(lastOut)}` : ''}.`;
                if (aiEnabled() && prefs.ai_fallback !== false) {
                    try {
                        body = (await aiWeeklyLine(summary)) ?? body;
                    } catch (err) {
                        console.error('weekly AI gagal', err);
                    }
                }
                sent += await sendPushToUser(db, userId, { title: 'Ringkasan minggu ini', body, url: '/?tab=analytics', tag: 'weekly' });
            }
        }

        // 4) Pengingat harian kalau hari ini belum ada catatan
        if (prefs.daily_reminder && t.h === prefs.daily_hour) {
            const dayStart = new Date(Date.UTC(t.y, t.m - 1, t.d) - 7 * 3600_000).toISOString();
            const { count } = await db.from('transactions').select('id', { count: 'exact', head: true })
                .eq('user_id', userId).gte('timestamp', dayStart);
            if (!count && await claimOnce(db, userId, `daily:${t.ymd}`)) {
                sent += await sendPushToUser(db, userId, {
                    title: 'Hari ini belum ada catatan',
                    body: 'Ada pengeluaran yang belum dicatat? Cuma butuh 10 detik.',
                    url: '/?action=add',
                    tag: 'daily',
                });
            }
        }
    }

    // Bersihkan log lama (> 120 hari)
    await db.from('notification_log').delete().lt('sent_at', new Date(now.getTime() - 120 * 86_400_000).toISOString());

    return json({ ok: true, users: userIds.length, sent });
});

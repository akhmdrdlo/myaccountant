// Antrean transaksi yang gagal terkirim (offline / jaringan putus).
// Setiap item punya external_id `offline:<uuid>` sehingga kirim ulang tidak membuat duplikat
// (database menolak user_id+source+external_id yang sama).
import type { Transaction, TransactionInput } from '../types';

export interface QueuedTx extends TransactionInput {
    queueId: string;
    timestamp: string;
    source: 'offline';
    externalId: string;
    attempts: number;
    /** Akun yang membuat item; hanya akun ini yang boleh mengirimnya */
    owner: string;
}

const KEY = 'rplanner_offline_queue';
export const MAX_ATTEMPTS = 6;

const currentOwner = () => localStorage.getItem('rplanner_user_id') ?? '';

function readAll(): QueuedTx[] {
    try {
        return JSON.parse(localStorage.getItem(KEY) ?? '[]') as QueuedTx[];
    } catch {
        return [];
    }
}

/** Item milik akun yang sedang login saja (item tanpa pemilik dari versi lama dianggap milik siapa pun tidak jelas → tidak dikirim). */
export function readQueue(): QueuedTx[] {
    const me = currentOwner();
    return me ? readAll().filter(q => q.owner === me) : [];
}

/** Tulis ulang item milik akun ini, item akun lain dibiarkan apa adanya. */
function writeQueue(items: QueuedTx[]) {
    const me = currentOwner();
    const others = readAll().filter(q => q.owner !== me);
    localStorage.setItem(KEY, JSON.stringify([...others, ...items]));
    window.dispatchEvent(new CustomEvent('rplanner:queue', { detail: items.length }));
}

export function enqueue(input: TransactionInput & { timestamp?: string }): QueuedTx {
    const queueId = crypto.randomUUID();
    const item: QueuedTx = {
        ...input,
        queueId,
        timestamp: input.timestamp ?? new Date().toISOString(),
        source: 'offline',
        externalId: `offline:${queueId}`,
        attempts: 0,
        owner: currentOwner(),
    };
    writeQueue([...readQueue(), item]);
    return item;
}

export function removeFromQueue(queueId: string) {
    writeQueue(readQueue().filter(q => q.queueId !== queueId));
}

export function bumpAttempt(queueId: string) {
    writeQueue(readQueue().map(q => (q.queueId === queueId ? { ...q, attempts: q.attempts + 1 } : q)));
}

/** Item antrean ditampilkan sebagai transaksi "Menunggu" supaya saldo tetap benar. */
export const queuedAsTransactions = (): Transaction[] =>
    readQueue().map(q => ({
        id: q.queueId,
        timestamp: q.timestamp,
        type: q.type,
        category: q.category,
        amount: q.amount,
        description: q.description,
        account: q.account,
        toAccount: q.toAccount,
        status: 'pending',
    }));

/**
 * Kirim semua item. `send` harus idempoten (upsert dengan externalId).
 * Mengembalikan jumlah yang berhasil terkirim.
 */
export async function flushQueue(send: (q: QueuedTx) => Promise<boolean>): Promise<{ sent: number; dropped: QueuedTx[] }> {
    let sent = 0;
    const dropped: QueuedTx[] = [];
    for (const item of readQueue()) {
        if (!navigator.onLine) break;
        if (await send(item)) {
            removeFromQueue(item.queueId);
            sent++;
        } else if (item.attempts + 1 >= MAX_ATTEMPTS) {
            removeFromQueue(item.queueId);
            dropped.push(item);
        } else {
            bumpAttempt(item.queueId);
        }
    }
    return { sent, dropped };
}

// ── Item dari versi lama (tanpa pemilik) ──
// Tidak dikirim otomatis karena tidak jelas milik akun siapa; pengguna memilih sendiri.

// Pemilik lama bisa kosong atau berupa nama tampilan (sebelum memakai id akun)
const UUID = /^[0-9a-f-]{36}$/i;
const isLegacy = (q: QueuedTx) => !q.owner || !UUID.test(q.owner);

export const legacyQueue = (): QueuedTx[] => readAll().filter(isLegacy);

export function claimLegacy() {
    const me = currentOwner();
    if (!me) return;
    localStorage.setItem(KEY, JSON.stringify(readAll().map(q => (isLegacy(q) ? { ...q, owner: me, attempts: 0 } : q))));
    window.dispatchEvent(new CustomEvent('rplanner:queue-claimed'));
}

export function discardLegacy() {
    localStorage.setItem(KEY, JSON.stringify(readAll().filter(q => !isLegacy(q))));
}

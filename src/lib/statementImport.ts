// Impor mutasi rekening dari CSV e-statement / ekspor internet banking.
// Tanggal disimpan jam 12.00 waktu lokal supaya tidak bergeser hari karena zona waktu.
import { parseRupiahAmount, guessCategory } from './parseBankText';
import { findRule } from './merchantRules';
import type { MerchantRule } from '../types';

export interface ColumnMap {
    date: number;
    description: number;
    /** Satu kolom nominal (bisa bertanda minus atau berakhiran CR/DB) */
    amount: number;
    /** Atau dua kolom terpisah */
    debit: number;
    credit: number;
}

export interface ImportRow {
    line: number;
    date: Date;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    externalId: string;
}

/** CSV sederhana: dukung tanda kutip, pemisah koma/titik koma/tab (dideteksi otomatis). */
export function parseCsv(text: string): string[][] {
    const firstLines = text.split(/\r?\n/).slice(0, 5).join('\n');
    const delim = [';', '\t', ','].sort((a, b) => firstLines.split(b).length - firstLines.split(a).length)[0];
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (c === '"') quoted = false;
            else cell += c;
        } else if (c === '"') quoted = true;
        else if (c === delim) { row.push(cell.trim()); cell = ''; }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(cell.trim());
            if (row.some(x => x)) rows.push(row);
            row = [];
            cell = '';
        } else cell += c;
    }
    row.push(cell.trim());
    if (row.some(x => x)) rows.push(row);
    return rows;
}

const MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6, agu: 7, agt: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11,
};

export function parseDate(raw: string, fallbackYear = new Date().getFullYear()): Date | null {
    const s = raw.trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12);
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/);
    if (m) {
        const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : fallbackYear;
        return new Date(y, +m[2] - 1, +m[1], 12);
    }
    m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
    if (m && MONTHS[m[2].toLowerCase()] !== undefined) return new Date(+m[3], MONTHS[m[2].toLowerCase()], +m[1], 12);
    return null;
}

/** Tebak kolom dari judul header. -1 jika tidak ada. */
export function guessColumns(header: string[]): ColumnMap {
    const find = (re: RegExp) => header.findIndex(h => re.test(h.toLowerCase()));
    return {
        date: find(/tanggal|tgl|date|waktu/),
        description: find(/keterangan|deskripsi|description|uraian|remark|berita|detail|transaksi/),
        amount: find(/^(jumlah|nominal|amount|mutasi)$|jumlah|nominal|amount/),
        debit: find(/debit|debet|keluar|withdraw/),
        credit: find(/kredit|credit|masuk|deposit/),
    };
}

/** Nominal bertanda: "-25.000" / "25,000.00 DB" → -25000; "1.000.000 CR" → 1000000 */
function signedAmount(raw: string): number | null {
    const s = raw.trim();
    if (!s) return null;
    const n = parseRupiahAmount(s.replace(/\b(cr|db|d|k)\b\.?$/i, '').replace(/^[-+(]|\)$/g, ''));
    if (!n) return null;
    const negative = /^-|^\(|\b(db|d)\b\.?$/i.test(s);
    return negative ? -n : n;
}

async function sha256(text: string) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export async function buildRows(rows: string[][], map: ColumnMap, rules: MerchantRule[]): Promise<{ ok: ImportRow[]; skipped: number }> {
    const ok: ImportRow[] = [];
    let skipped = 0;
    const seen = new Map<string, number>();

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const date = map.date >= 0 ? parseDate(r[map.date] ?? '') : null;
        const description = (map.description >= 0 ? r[map.description] : '')?.replace(/\s+/g, ' ').trim() ?? '';
        let value: number | null = null;
        if (map.amount >= 0) value = signedAmount(r[map.amount] ?? '');
        else {
            const d = map.debit >= 0 ? signedAmount(r[map.debit] ?? '') : null;
            const c = map.credit >= 0 ? signedAmount(r[map.credit] ?? '') : null;
            if (d) value = -Math.abs(d);
            else if (c) value = Math.abs(c);
        }
        if (!date || !value) { skipped++; continue; }

        const type = value < 0 ? 'expense' : 'income';
        const amount = Math.abs(value);
        const category = findRule(rules, description)?.category ?? guessCategory(description, type, date);
        // Baris identik di hari yang sama dibedakan dengan nomor urut, supaya impor ulang tidak menggandakan
        const ymd = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const base = `${ymd}|${amount}|${type}|${description.toLowerCase()}`;
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        ok.push({ line: i + 1, date, description, amount, type, category, externalId: await sha256(`${base}|${n}`) });
    }
    return { ok, skipped };
}

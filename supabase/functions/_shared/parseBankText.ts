// Parser teks notifikasi / email / SMS bank & e-wallet Indonesia.
// Dipakai bersama oleh PWA (Share Target) dan Edge Function `ingest`.
// Murni TypeScript tanpa dependensi supaya jalan di browser maupun Deno.

export type ParsedDirection = 'income' | 'expense';

export interface ParsedBankText {
    amount: number;
    type: ParsedDirection;
    /** Nama sumber yang terdeteksi, mis. "BCA", "GoPay". Dicocokkan ke akun pengguna di client. */
    accountHint?: string;
    merchant?: string;
    category: string;
    /** 0..1 — seberapa yakin parser. Di bawah 0.5 sebaiknya selalu jadi draft. */
    confidence: number;
}

const SOURCES: { hint: string; patterns: RegExp }[] = [
    { hint: 'BCA', patterns: /\b(bca|mybca|klikbca|com\.bca)\b/i },
    { hint: 'BRI', patterns: /\b(bri|brimo|id\.co\.bri)\b/i },
    { hint: 'Mandiri', patterns: /\b(mandiri|livin)\b/i },
    { hint: 'BNI', patterns: /\b(bni|wondr)\b/i },
    { hint: 'BTN', patterns: /\bbtn\b/i },
    { hint: 'BSI', patterns: /\b(bsi|byond)\b/i },
    { hint: 'SeaBank', patterns: /\bsea\s?bank\b/i },
    { hint: 'Jago', patterns: /\b(bank\s?jago|jago)\b/i },
    { hint: 'Jenius', patterns: /\bjenius\b/i },
    { hint: 'blu', patterns: /\bblu\b/i },
    { hint: 'GoPay', patterns: /\b(gopay|gojek)\b/i },
    { hint: 'OVO', patterns: /\bovo\b/i },
    { hint: 'DANA', patterns: /\bdana\b/i },
    { hint: 'ShopeePay', patterns: /\b(shopeepay|shopee\s?pay)\b/i },
    { hint: 'LinkAja', patterns: /\blinkaja\b/i },
    { hint: 'Flip', patterns: /\bflip\b/i },
];

const INCOME_WORDS = /(dana masuk|uang masuk|transfer masuk|telah menerima|kamu menerima|anda menerima|diterima dari|menerima transfer|kiriman uang|\bcr\b|kredit|cashback|refund|pengembalian dana|top ?up berhasil|saldo bertambah)/i;
const EXPENSE_WORDS = /(dana keluar|uang keluar|pembayaran|berhasil (membayar|bayar|dibeli)|token listrik|bayar|transfer ke|transfer keluar|telah mentransfer|tarik tunai|penarikan|pembelian|belanja|qris|\bdb\b|debit|transaksi (sebesar|senilai|rp)|saldo berkurang|top ?up (ke|gopay|ovo|dana|shopeepay))/i;

const CATEGORY_RULES: { category: string; pattern: RegExp }[] = [
    { category: 'Transport', pattern: /(goride|gocar|grabbike|grabcar|grab\b|maxim|in ?drive|krl|kai|commuter|mrt|lrt|transjakarta|tj\b|spbu|pertamina|shell|bp akr|parkir|tol\b|e-?toll|flazz)/i },
    { category: 'Utilitas', pattern: /(pln|token listrik|listrik|pdam|air minum|indihome|biznet|first ?media|myrepublic|telkomsel|xl\b|axis|indosat|im3|tri\b|smartfren|pulsa|paket data|bpjs|wifi)/i },
    { category: 'Makan', pattern: /(gofood|grabfood|shopeefood|resto|restoran|rumah makan|warung|warteg|bakso|mie|nasi|ayam|sate|kopi|coffee|cafe|kafe|starbucks|janji jiwa|kenangan|mcd|mcdonald|kfc|burger|pizza|hokben|solaria|chatime|mixue)/i },
    { category: 'Jajan/Hobi', pattern: /(indomaret|alfamart|alfamidi|tokopedia|shopee|lazada|blibli|tiktok shop|steam|netflix|spotify|youtube|disney|vidio|game|playstation|bioskop|cgv|xxi)/i },
];

const NOISE_WORDS = /(\botp\b|kode (verifikasi|otp|rahasia|aktivasi)|verification code|jangan (berikan|bagikan) kode|\bpromo\b|diskon|voucher|cashback hingga|gratis ongkir|dapatkan|ayo |yuk |berlaku hingga|syarat (&|dan) ketentuan|s&k|login (baru|berhasil)|perangkat baru|ubah (pin|password)|tagihan .*jatuh tempo)/i;
// Hanya kata yang menandakan transaksi SUDAH terjadi ("pembayaran"/"QRIS" saja sering muncul di iklan)
const TX_WORDS = /(berhasil|sukses|telah|diterima|\bdebit\b|\bkredit\b|tarik tunai|dana (masuk|keluar)|uang (masuk|keluar))/i;

/**
 * true untuk notifikasi yang jelas bukan transaksi: OTP, promo, info keamanan.
 * Promo yang menyebut "cashback hingga Rp50.000" tidak boleh tercatat sebagai pemasukan.
 */
export function isNoise(text: string): boolean {
    if (!NOISE_WORDS.test(text)) return false;
    // Ada kata promo tapi juga kata transaksi yang tegas (mis. "Pembayaran berhasil, dapat cashback") → bukan noise
    if (/\botp\b|kode (verifikasi|otp|rahasia|aktivasi)|verification code/i.test(text)) return true;
    return !TX_WORDS.test(text.replace(NOISE_WORDS, ''));
}

/** "Rp 25.000,00" | "IDR 1,250,000.00" | "Rp25rb" → integer rupiah. */
export function parseRupiahAmount(raw: string): number | null {
    let s = raw.trim().toLowerCase().replace(/\s/g, '');
    let multiplier = 1;
    if (/(rb|ribu|k)$/.test(s)) { multiplier = 1_000; s = s.replace(/(rb|ribu|k)$/, ''); }
    else if (/(jt|juta)$/.test(s)) { multiplier = 1_000_000; s = s.replace(/(jt|juta)$/, ''); }

    // Buang bagian desimal 2 digit di akhir (",00" atau ".00")
    s = s.replace(/[.,]\d{2}$/, (m) => (multiplier > 1 ? m.replace(',', '.') : ''));
    if (multiplier > 1) {
        const n = parseFloat(s.replace(/,/g, '.'));
        return Number.isFinite(n) ? Math.round(n * multiplier) : null;
    }
    const digits = s.replace(/[^\d]/g, '');
    if (!digits) return null;
    const n = parseInt(digits, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function findAmount(text: string): number | null {
    const re = /(?:rp\.?|idr)\s?([\d][\d.,]*(?:\s?(?:rb|ribu|jt|juta|k))?)/gi;
    let best: number | null = null;
    for (const m of text.matchAll(re)) {
        const n = parseRupiahAmount(m[1]);
        // Ambil nominal pertama; abaikan "saldo" yang biasanya muncul setelahnya
        const before = text.slice(Math.max(0, (m.index ?? 0) - 18), m.index).toLowerCase();
        if (n && !/saldo( akhir| anda| kamu)?\s*:?\s*$/.test(before)) return n;
        if (n && best === null) best = n;
    }
    return best;
}

function findMerchant(text: string): string | undefined {
    const m = text.match(/(?:\b(?:di|ke|dari|kepada|merchant|untuk)\b)\s*:?\s*([A-Za-z0-9&'.\- ]{2,40}?)(?=\s*(?:[,.;\n]|\bpada\b|\bsebesar\b|\bberhasil\b|\bsukses\b|\btelah\b|\brp\b|\bidr\b|\btgl\b|\btanggal\b|$))/i);
    const name = m?.[1]?.trim();
    if (!name || /^(rekening|akun|anda|kamu)$/i.test(name)) return undefined;
    return name.replace(/\s+/g, ' ');
}

export function guessCategory(text: string, type: ParsedDirection, when: Date): string {
    if (type === 'income') {
        if (/(gaji|salary|payroll)/i.test(text)) return 'Gaji';
        if (/(bonus|thr)/i.test(text)) return 'Bonus';
        if (/(transfer|kiriman|top ?up)/i.test(text)) return 'Transfer / Tarik Tunai';
        return 'Lainnya';
    }
    if (/(tarik tunai|penarikan|tarikan atm|tarik atm|tarikan tunai)/i.test(text)) return 'Transfer / Tarik Tunai';
    for (const rule of CATEGORY_RULES) {
        if (rule.pattern.test(text)) {
            if (rule.category === 'Makan') {
                const day = when.getDay();
                return day === 0 || day === 6 ? 'Makan Weekend' : 'Makan Weekday';
            }
            return rule.category;
        }
    }
    return 'Lainnya';
}

/**
 * @param text  isi notifikasi/email (judul + isi digabung)
 * @param appHint nama paket aplikasi atau pengirim, mis. "com.gojek.app" — membantu menebak sumber
 */
export function parseBankText(text: string, appHint = '', when: Date = new Date()): ParsedBankText | null {
    const haystack = `${appHint} ${text}`.replace(/\s+/g, ' ').trim();
    if (!haystack || isNoise(text)) return null;

    const amount = findAmount(haystack);
    if (!amount) return null;

    const isIncome = INCOME_WORDS.test(haystack);
    const isExpense = EXPENSE_WORDS.test(haystack);
    // Tanpa kata kunci jelas, anggap pengeluaran (kasus paling umum) tapi dengan keyakinan rendah
    const type: ParsedDirection = isIncome && !isExpense ? 'income' : 'expense';

    const accountHint = SOURCES.find(s => s.patterns.test(haystack))?.hint;
    const merchant = findMerchant(text);

    let confidence = 0.4;
    if (isIncome !== isExpense) confidence += 0.3;
    if (accountHint) confidence += 0.2;
    if (merchant) confidence += 0.1;

    return {
        amount,
        type,
        accountHint,
        merchant,
        category: guessCategory(haystack, type, when),
        confidence: Math.round(Math.min(1, confidence) * 100) / 100,
    };
}

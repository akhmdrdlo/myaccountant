// Katalog bank, e-wallet, dan paylater Indonesia untuk pilihan dompet.
// Logo ditampilkan sebagai lencana warna brand + singkatan (tanpa file eksternal).
// Untuk memakai file logo resmi: taruh public/logos/<id>.svg lalu tambahkan id-nya ke LOGO_FILES.

export type InstitutionKind = 'cash' | 'bank' | 'ewallet' | 'paylater' | 'other';

export interface Institution {
    id: string;
    name: string;
    /** Teks pendek di lencana (maks ~4 huruf) */
    short: string;
    kind: InstitutionKind;
    bg: string;
    fg: string;
    /** Kata yang dipakai parser notifikasi untuk mengenali institusi ini */
    aliases: string[];
}

export const INSTITUTIONS: Institution[] = [
    // Tunai & lainnya
    { id: 'cash', name: 'Tunai', short: 'Rp', kind: 'cash', bg: '#138A55', fg: '#FFFFFF', aliases: ['cash', 'tunai', 'kantong', 'dompet'] },

    // Bank
    { id: 'bca', name: 'BCA', short: 'BCA', kind: 'bank', bg: '#0060AF', fg: '#FFFFFF', aliases: ['bca', 'mybca', 'klikbca'] },
    { id: 'bri', name: 'BRI', short: 'BRI', kind: 'bank', bg: '#00529C', fg: '#FFFFFF', aliases: ['bri', 'brimo'] },
    { id: 'mandiri', name: 'Bank Mandiri', short: 'MDR', kind: 'bank', bg: '#003D79', fg: '#FFB700', aliases: ['mandiri', 'livin'] },
    { id: 'bni', name: 'BNI', short: 'BNI', kind: 'bank', bg: '#F15A23', fg: '#FFFFFF', aliases: ['bni', 'wondr'] },
    { id: 'btn', name: 'BTN', short: 'BTN', kind: 'bank', bg: '#0058A8', fg: '#FFD200', aliases: ['btn'] },
    { id: 'bsi', name: 'Bank Syariah Indonesia', short: 'BSI', kind: 'bank', bg: '#00A39D', fg: '#FFFFFF', aliases: ['bsi', 'byond'] },
    { id: 'cimb', name: 'CIMB Niaga', short: 'CIMB', kind: 'bank', bg: '#7B0000', fg: '#FFFFFF', aliases: ['cimb', 'octo'] },
    { id: 'danamon', name: 'Danamon', short: 'DNM', kind: 'bank', bg: '#F7941D', fg: '#003A70', aliases: ['danamon', 'd-bank'] },
    { id: 'permata', name: 'PermataBank', short: 'PMT', kind: 'bank', bg: '#00A651', fg: '#FFFFFF', aliases: ['permata'] },
    { id: 'ocbc', name: 'OCBC', short: 'OCBC', kind: 'bank', bg: '#E31B23', fg: '#FFFFFF', aliases: ['ocbc', 'nyala'] },
    { id: 'maybank', name: 'Maybank', short: 'MAY', kind: 'bank', bg: '#FFC72C', fg: '#1A1A1A', aliases: ['maybank'] },
    { id: 'panin', name: 'Panin Bank', short: 'PNN', kind: 'bank', bg: '#0067B1', fg: '#FFFFFF', aliases: ['panin'] },
    { id: 'mega', name: 'Bank Mega', short: 'MEGA', kind: 'bank', bg: '#F4AE00', fg: '#1A1A1A', aliases: ['bank mega', 'mega'] },
    { id: 'bjb', name: 'bank bjb', short: 'BJB', kind: 'bank', bg: '#005BAA', fg: '#FFFFFF', aliases: ['bjb'] },
    { id: 'jago', name: 'Bank Jago', short: 'JAGO', kind: 'bank', bg: '#F9B233', fg: '#1A1A1A', aliases: ['jago'] },
    { id: 'seabank', name: 'SeaBank', short: 'SEA', kind: 'bank', bg: '#FF6D00', fg: '#FFFFFF', aliases: ['seabank', 'sea bank'] },
    { id: 'jenius', name: 'Jenius', short: 'JNS', kind: 'bank', bg: '#00AEEF', fg: '#FFFFFF', aliases: ['jenius'] },
    { id: 'blu', name: 'blu by BCA Digital', short: 'blu', kind: 'bank', bg: '#00B4E5', fg: '#FFFFFF', aliases: ['blu'] },
    { id: 'allo', name: 'Allo Bank', short: 'ALLO', kind: 'bank', bg: '#E50012', fg: '#FFFFFF', aliases: ['allo'] },
    { id: 'neo', name: 'Bank Neo Commerce', short: 'NEO', kind: 'bank', bg: '#FFD100', fg: '#1A1A1A', aliases: ['neobank', 'neo commerce', 'bnc'] },
    { id: 'superbank', name: 'Superbank', short: 'SPR', kind: 'bank', bg: '#5B2D90', fg: '#FFFFFF', aliases: ['superbank'] },
    { id: 'linebank', name: 'LINE Bank', short: 'LINE', kind: 'bank', bg: '#00B900', fg: '#FFFFFF', aliases: ['line bank', 'linebank'] },
    { id: 'krom', name: 'Krom Bank', short: 'KROM', kind: 'bank', bg: '#1E1E1E', fg: '#FFFFFF', aliases: ['krom'] },

    // E-wallet
    { id: 'gopay', name: 'GoPay', short: 'GP', kind: 'ewallet', bg: '#00AED6', fg: '#FFFFFF', aliases: ['gopay', 'gojek'] },
    { id: 'ovo', name: 'OVO', short: 'OVO', kind: 'ewallet', bg: '#4C3494', fg: '#FFFFFF', aliases: ['ovo'] },
    { id: 'dana', name: 'DANA', short: 'DANA', kind: 'ewallet', bg: '#118EEA', fg: '#FFFFFF', aliases: ['dana'] },
    { id: 'shopeepay', name: 'ShopeePay', short: 'SPay', kind: 'ewallet', bg: '#EE4D2D', fg: '#FFFFFF', aliases: ['shopeepay', 'shopee pay'] },
    { id: 'linkaja', name: 'LinkAja', short: 'LA', kind: 'ewallet', bg: '#E82127', fg: '#FFFFFF', aliases: ['linkaja'] },
    { id: 'isaku', name: 'i.saku', short: 'iSk', kind: 'ewallet', bg: '#E30613', fg: '#FFFFFF', aliases: ['isaku', 'i.saku'] },
    { id: 'astrapay', name: 'AstraPay', short: 'AP', kind: 'ewallet', bg: '#0055A5', fg: '#FFFFFF', aliases: ['astrapay'] },
    { id: 'flip', name: 'Flip', short: 'FLIP', kind: 'ewallet', bg: '#FD6542', fg: '#FFFFFF', aliases: ['flip'] },
    { id: 'doku', name: 'DOKU', short: 'DOKU', kind: 'ewallet', bg: '#E1251B', fg: '#FFFFFF', aliases: ['doku'] },

    // Paylater / kartu kredit
    { id: 'gopaylater', name: 'GoPayLater', short: 'GPL', kind: 'paylater', bg: '#00AED6', fg: '#FFFFFF', aliases: ['gopaylater', 'gopay later'] },
    { id: 'spaylater', name: 'SPayLater', short: 'SPL', kind: 'paylater', bg: '#EE4D2D', fg: '#FFFFFF', aliases: ['spaylater', 'shopee paylater'] },
    { id: 'kredivo', name: 'Kredivo', short: 'KRD', kind: 'paylater', bg: '#F37021', fg: '#FFFFFF', aliases: ['kredivo'] },
    { id: 'akulaku', name: 'Akulaku', short: 'AKU', kind: 'paylater', bg: '#E1251B', fg: '#FFFFFF', aliases: ['akulaku'] },
    { id: 'creditcard', name: 'Kartu Kredit', short: 'CC', kind: 'paylater', bg: '#24324A', fg: '#FFFFFF', aliases: ['kartu kredit', 'credit card'] },

    { id: 'other', name: 'Lainnya', short: '•••', kind: 'other', bg: '#4A5B72', fg: '#FFFFFF', aliases: [] },
];

/** id institusi yang punya file logo di public/logos/<id>.svg */
export const LOGO_FILES = new Set<string>([]);

export const KIND_LABEL: Record<InstitutionKind, string> = {
    cash: 'Tunai',
    bank: 'Bank',
    ewallet: 'E-wallet',
    paylater: 'Paylater & kartu kredit',
    other: 'Lainnya',
};

const BY_ID = new Map(INSTITUTIONS.map(i => [i.id, i]));

export const getInstitution = (id?: string | null): Institution | undefined => (id ? BY_ID.get(id) : undefined);

/** Tebak institusi dari teks bebas (nama akun lama, hint parser, dll). */
export function guessInstitution(text?: string | null): Institution | undefined {
    if (!text) return undefined;
    const t = text.toLowerCase();
    // Cocokkan alias terpanjang dulu supaya "gopay later" tidak jatuh ke "gopay"
    let best: { inst: Institution; len: number } | undefined;
    for (const inst of INSTITUTIONS) {
        for (const a of inst.aliases) {
            const re = new RegExp(`(^|[^a-z])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`);
            if (re.test(t) && (!best || a.length > best.len)) best = { inst, len: a.length };
        }
    }
    return best?.inst;
}

/** Institusi untuk sebuah akun: pakai id tersimpan, kalau tidak ada tebak dari nama. */
export const institutionForAccount = (acc: { name: string; institution?: string | null }) =>
    getInstitution(acc.institution) ?? guessInstitution(acc.name) ?? getInstitution('other')!;

export const isDebtKind = (kind: InstitutionKind) => kind === 'paylater';

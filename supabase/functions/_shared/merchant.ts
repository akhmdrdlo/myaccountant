// Kunci merchant yang stabil: "KOPI KENANGAN - Margonda 2" dan "Kopi Kenangan" -> "kopi kenangan".
// Dipakai bersama oleh PWA (src/lib/merchantRules.ts) dan Edge Function ingest.

const STOP = /\b(pt|cv|tbk|indonesia|id|store|official|outlet|cabang|branch|qris|merchant|toko)\b/g;

export function merchantKey(raw?: string | null): string {
    if (!raw) return '';
    return raw
        .toLowerCase()
        .replace(/[-–|@#(].*$/, '')
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(STOP, ' ')
        .replace(/\b\d+\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40);
}

export interface RuleLike {
    merchantKey: string;
    category: string;
    account?: string;
}

export function findRule<T extends RuleLike>(rules: T[], text?: string | null): T | undefined {
    const key = merchantKey(text);
    if (!key) return undefined;
    return rules.find(r => r.merchantKey === key)
        ?? rules.find(r => r.merchantKey.length >= 4 && (key.startsWith(r.merchantKey) || r.merchantKey.startsWith(key)));
}

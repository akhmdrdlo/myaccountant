// Kunci aplikasi dengan sidik jari / wajah / PIN layar HP (WebAuthn, platform authenticator).
// Ini kunci kenyamanan di perangkat ini supaya orang yang meminjam HP tidak melihat saldomu.
// Data tetap dilindungi login Supabase; kunci ini tidak mengenkripsi apa pun.

const CRED_KEY = 'rplanner_lock_credential';
const LAST_ACTIVE_KEY = 'rplanner_last_active';
/** Kunci ulang jika aplikasi ditinggal lebih lama dari ini */
export const RELOCK_AFTER_MS = 60_000;

const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export const isLockEnabled = () => Boolean(localStorage.getItem(CRED_KEY));

export async function isBiometricAvailable(): Promise<boolean> {
    if (!window.PublicKeyCredential || !window.isSecureContext) return false;
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
}

export async function enableLock(username: string): Promise<boolean> {
    const cred = await navigator.credentials.create({
        publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: { name: 'Rplanner', id: location.hostname },
            user: { id: crypto.getRandomValues(new Uint8Array(16)), name: username, displayName: username },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
            timeout: 60_000,
        },
    }) as PublicKeyCredential | null;
    if (!cred) return false;
    localStorage.setItem(CRED_KEY, toB64(cred.rawId));
    markActive();
    return true;
}

export function disableLock() {
    localStorage.removeItem(CRED_KEY);
}

export async function unlock(): Promise<boolean> {
    const id = localStorage.getItem(CRED_KEY);
    if (!id) return true;
    try {
        const res = await navigator.credentials.get({
            publicKey: {
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                allowCredentials: [{ type: 'public-key', id: fromB64(id) }],
                userVerification: 'required',
                timeout: 60_000,
            },
        });
        if (res) markActive();
        return Boolean(res);
    } catch {
        return false;
    }
}

export const markActive = () => localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));

export const shouldLock = () =>
    isLockEnabled() && Date.now() - Number(localStorage.getItem(LAST_ACTIVE_KEY) ?? 0) > RELOCK_AFTER_MS;

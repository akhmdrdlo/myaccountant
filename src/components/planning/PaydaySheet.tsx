import { useState } from 'react';
import { toast } from 'sonner';
import { useFinanceStore } from '../../store/useFinanceStore';
import { usePlanning } from '../../hooks/usePlanning';
import { getPeriod } from '../../lib/period';
import { PrimaryButton, Sheet } from '../common/Sheet';
import { cn } from '../../lib/utils';

/** Pilih tanggal gajian. Semua hitungan "bulan ini" memakai periode dari tanggal ini. */
export const PaydaySheet = ({ onClose }: { onClose: () => void }) => {
    const { payday, setPayday } = useFinanceStore();
    const { savePayday } = usePlanning();
    const [day, setDay] = useState(payday);
    const [busy, setBusy] = useState(false);
    const preview = getPeriod(day);

    const save = async () => {
        setBusy(true);
        setPayday(day);
        const ok = await savePayday(day);
        setBusy(false);
        if (!ok) toast.info('Disimpan di HP ini. Jalankan migrasi 20261124030000 supaya ikut tersimpan di akun.');
        onClose();
    };

    return (
        <Sheet title="Tanggal gajian" onClose={onClose}
            footer={<PrimaryButton onClick={save} disabled={busy}>Simpan</PrimaryButton>}>
            <p className="text-sm text-rp-ink-2">
                Budget, jatah harian, dan ringkasan dihitung dari tanggal ini sampai sehari sebelum gajian berikutnya.
                Pilih 1 kalau penghasilanmu tidak tetap.
            </p>
            <div className="grid grid-cols-7 gap-1.5" role="radiogroup" aria-label="Tanggal gajian">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <button key={d} role="radio" aria-checked={day === d} onClick={() => setDay(d)}
                        className={cn('h-11 rounded-xl text-sm font-semibold rp-num transition',
                            day === d ? 'bg-rp-royal text-white' : 'bg-rp-canvas text-rp-ink hover:bg-rp-surface-2')}>
                        {d}
                    </button>
                ))}
            </div>
            <p className="text-sm text-rp-ink">
                Periode sekarang: <span className="font-semibold">{preview.label}</span>
                <span className="text-rp-ink-2"> · sisa {preview.daysLeft} hari</span>
            </p>
            {day > 28 && <p className="text-xs text-rp-ink-2">Di bulan yang lebih pendek, gajian dianggap jatuh di tanggal terakhir bulan itu.</p>}
        </Sheet>
    );
};

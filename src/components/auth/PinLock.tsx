import { useState, useEffect } from 'react';
import { Delete } from 'lucide-react';

interface PinLockProps {
    onSuccess: () => void;
}

export const PinLock = ({ onSuccess }: PinLockProps) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    const CORRECT_PIN = '200325';

    useEffect(() => {
        if (pin.length === 6) {
            if (pin === CORRECT_PIN) {
                onSuccess();
            } else {
                setError(true);
                setTimeout(() => {
                    setPin('');
                    setError(false);
                }, 500);
            }
        }
    }, [pin, onSuccess]);

    const handlePress = (num: string) => {
        if (pin.length < 6) {
            setPin(prev => prev + num);
            setError(false);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError(false);
    };

    return (
        <div className="min-h-screen bg-brimo-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-[50vh] -z-10 rounded-b-[40px]" />

            <div className="w-full max-w-sm flex flex-col items-center">

                {/* Logo Area */}
                <div className="mb-8 p-4 bg-slate/10 backdrop-blur-md rounded-full">
                    <img src="/banklogo.png" alt="Logo" className="w-16 h-16 object-contain" />
                </div>

                <h2 className="text-slate text-xl font-bold mb-8">Masukkan PIN Anda</h2>

                {/* PIN Dots */}
                <div className="flex gap-4 mb-12">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length
                                ? 'bg-black scale-110'
                                : 'bg-black/30 border border-black/50'
                                } ${error ? 'bg-red-400 animate-pulse' : ''}`}
                        />
                    ))}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-x-8 gap-y-6 w-full px-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handlePress(num.toString())}
                            className="w-16 h-16 rounded-full bg-slate/10 hover:bg-slate/20 backdrop-blur text-slate text-2xl font-semibold flex items-center justify-center transition-all active:scale-95 shadow-sm mx-auto"
                        >
                            {num}
                        </button>
                    ))}
                    <div /> {/* Spacer */}
                    <button
                        onClick={() => handlePress('0')}
                        className="w-16 h-16 rounded-full bg-slate/10 hover:bg-slate/20 backdrop-blur text-slate text-2xl font-semibold flex items-center justify-center transition-all active:scale-95 shadow-sm mx-auto"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        className="w-16 h-16 rounded-full flex items-center justify-center text-slate/80 hover:text-slate transition-colors active:scale-95 mx-auto"
                    >
                        <Delete className="w-8 h-8" />
                    </button>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-slate/60 text-xs">Lupa PIN? Hubungi Administrator</p>
                </div>
            </div>
        </div>
    );
};

import { useState, useEffect } from 'react';
import { getPinCode } from '../store';
import { Lock, Delete } from 'lucide-react';

interface Props {
  onUnlock: () => void;
}

export default function PinLock({ onUnlock }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const correctPin = getPinCode();

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        onUnlock();
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => {
          setPin('');
          setError(false);
          setShake(false);
        }, 600);
      }
    }
  }, [pin, correctPin, onUnlock]);

  const handleDigit = (d: string) => {
    if (pin.length < 4) setPin(pin + d);
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-primary to-blue-800 flex flex-col items-center justify-center text-white">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-4">
          <Lock size={32} />
        </div>
        <h1 className="text-xl font-bold">📱 ডিজিটেক হাব</h1>
        <p className="text-blue-200 text-sm mt-1">PIN দিন</p>
      </div>

      {/* PIN Dots */}
      <div className={`flex gap-4 mb-8 ${shake ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              i < pin.length
                ? error
                  ? 'bg-red-400 border-red-400 scale-110'
                  : 'bg-white border-white scale-110'
                : 'border-white/50'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-300 text-sm mb-4 fade-in">ভুল PIN! আবার চেষ্টা করুন</p>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 max-w-[280px]">
        {digits.map((d, i) => {
          if (d === '') return <div key={i} />;
          if (d === 'del') {
            return (
              <button
                key={i}
                onClick={handleDelete}
                className="w-20 h-16 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
              >
                <Delete size={22} />
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              className="w-20 h-16 rounded-2xl bg-white/10 text-2xl font-bold flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
            >
              {d}
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-10px); }
          40%, 80% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}

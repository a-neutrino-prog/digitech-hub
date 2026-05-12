import { useState, useEffect } from 'react';
import { verifyPin } from '../store';

interface Props {
  onUnlock: () => void;
}

function vibrate(type: 'light' | 'error') {
  if (!navigator.vibrate) return;
  navigator.vibrate(type === 'light' ? [10] : [50, 50, 50]);
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60000; // 1 minute

export default function PinLock({ onUnlock }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [countdown, setCountdown] = useState(0);

  const isLocked = lockedUntil > Date.now();

  // Countdown timer
  useEffect(() => {
    if (!isLocked) { setCountdown(0); return; }
    const timer = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) { setLockedUntil(0); setAttempts(0); setCountdown(0); }
      else setCountdown(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil, isLocked]);

  useEffect(() => {
    if (pin.length === 4 && !isLocked) {
      verifyPin(pin).then(valid => {
        if (valid) { setAttempts(0); onUnlock(); }
        else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setError(true); setShake(true);
          vibrate('error');

          if (newAttempts >= MAX_ATTEMPTS) {
            setLockedUntil(Date.now() + LOCKOUT_MS);
          }

          setTimeout(() => { setPin(''); setError(false); setShake(false); }, 600);
        }
      });
    }
  }, [pin, onUnlock, attempts, isLocked]);

  const handleDigit = (d: string) => { if (pin.length < 4 && !isLocked) { setPin(pin + d); vibrate('light'); } };
  const handleDelete = () => { if (!isLocked) setPin(pin.slice(0, -1)); };

  const digits = ['1','2','3','4','5','6','7','8','9','','0','del'];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #0F172A, #1E3A8A)' }}>
      <div className="absolute top-[-80px] right-[-60px] w-[200px] h-[200px] rounded-full" style={{ background: 'rgba(96,165,250,0.06)' }} />
      <div className="absolute bottom-[-100px] left-[-40px] w-[250px] h-[250px] rounded-full" style={{ background: 'rgba(37,99,235,0.08)' }} />

      <div className="relative z-10 flex flex-col items-center">
        <div className="text-5xl mb-2">🔐</div>
        <h1 className="text-[22px] font-bold mb-1">ডিজিটেক হাব</h1>
        <p className="text-blue-300 text-sm mb-8">আপনার ৪ সংখ্যার PIN দিন</p>

        <div className={`flex gap-4 mb-4 ${shake ? 'animate-shake' : ''}`}>
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
              i < pin.length
                ? error ? 'bg-red-400 border-red-400 scale-110' : 'bg-white border-white scale-110'
                : 'border-white/30'
            }`} />
          ))}
        </div>

        {/* Error & Lockout Messages */}
        {isLocked ? (
          <div className="text-center mb-6 fade-in">
            <p className="text-red-300 text-sm font-semibold">🔒 অনেকবার ভুল হয়েছে</p>
            <p className="text-red-400/70 text-xs mt-1">{countdown} সেকেন্ড পরে আবার চেষ্টা করুন</p>
          </div>
        ) : error ? (
          <p className="text-red-300 text-sm mb-4 fade-in">ভুল PIN! ({MAX_ATTEMPTS - attempts}টি চেষ্টা বাকি)</p>
        ) : (
          <div className="h-8 mb-2" />
        )}

        {/* Numpad */}
        <div className={`grid grid-cols-3 gap-2.5 ${isLocked ? 'opacity-40 pointer-events-none' : ''}`} style={{ maxWidth: 260 }}>
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />;
            if (d === 'del') return (
              <button key={i} onClick={handleDelete} className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-xl mx-auto transition-all hover:bg-white/10 active:scale-95" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} aria-label="মুছুন">⌫</button>
            );
            return (
              <button key={i} onClick={() => handleDigit(d)} className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl font-light mx-auto transition-all hover:bg-white/16 active:scale-95" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>{d}</button>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-10px)}40%,80%{transform:translateX(10px)}}.animate-shake{animation:shake .4s ease-in-out}`}</style>
    </div>
  );
}

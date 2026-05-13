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
const LOCKOUT_MS = 60000;
const LOCKOUT_KEY = 'pin_lockout';
const ATTEMPTS_KEY = 'pin_attempts';

function getSavedLockout(): number { return parseInt(localStorage.getItem(LOCKOUT_KEY) || '0'); }
function getSavedAttempts(): number { return parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0'); }

export default function PinLock({ onUnlock }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(getSavedAttempts());
  const [lockedUntil, setLockedUntil] = useState(getSavedLockout());
  const [countdown, setCountdown] = useState(0);
  const [showForgot, setShowForgot] = useState(false);

  const isLocked = lockedUntil > Date.now();

  // Countdown timer
  useEffect(() => {
    if (!isLocked) { setCountdown(0); return; }
    const timer = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(0); setAttempts(0); setCountdown(0);
        localStorage.removeItem(LOCKOUT_KEY);
        localStorage.removeItem(ATTEMPTS_KEY);
      } else setCountdown(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil, isLocked]);

  useEffect(() => {
    if (pin.length === 4 && !isLocked) {
      verifyPin(pin).then(valid => {
        if (valid) {
          setAttempts(0);
          localStorage.removeItem(ATTEMPTS_KEY);
          localStorage.removeItem(LOCKOUT_KEY);
          onUnlock();
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          localStorage.setItem(ATTEMPTS_KEY, newAttempts.toString());
          setError(true); setShake(true);
          vibrate('error');

          if (newAttempts >= MAX_ATTEMPTS) {
            // Progressive lockout: 1min → 5min → 15min
            const lockMs = newAttempts <= 5 ? LOCKOUT_MS : newAttempts <= 10 ? 5 * LOCKOUT_MS : 15 * LOCKOUT_MS;
            const until = Date.now() + lockMs;
            setLockedUntil(until);
            localStorage.setItem(LOCKOUT_KEY, until.toString());
          }

          setTimeout(() => { setPin(''); setError(false); setShake(false); }, 600);
        }
      });
    }
  }, [pin, onUnlock, attempts, isLocked]);

  const handleDigit = (d: string) => { if (pin.length < 4 && !isLocked) { setPin(pin + d); vibrate('light'); } };
  const handleDelete = () => { if (!isLocked) setPin(pin.slice(0, -1)); };

  const handleForgotPin = () => {
    setShowForgot(true);
  };

  const handleEmergencyReset = () => {
    if (window.confirm('⚠️ PIN রিসেট করলে PIN বন্ধ হয়ে যাবে। আপনি কি নিশ্চিত?')) {
      localStorage.removeItem('pin_code');
      localStorage.removeItem(LOCKOUT_KEY);
      localStorage.removeItem(ATTEMPTS_KEY);
      onUnlock();
    }
  };

  const digits = ['1','2','3','4','5','6','7','8','9','','0','del'];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #0F172A, #1E3A8A)' }}>
      <div className="absolute top-[-80px] right-[-60px] w-[200px] h-[200px] rounded-full" style={{ background: 'rgba(96,165,250,0.06)' }} />
      <div className="absolute bottom-[-100px] left-[-40px] w-[250px] h-[250px] rounded-full" style={{ background: 'rgba(37,99,235,0.08)' }} />

      <div className="relative z-10 flex flex-col items-center w-full max-w-xs px-4">
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

        {/* Error & Lockout */}
        {isLocked ? (
          <div className="text-center mb-6 fade-in">
            <p className="text-red-300 text-sm font-semibold">🔒 অনেকবার ভুল হয়েছে</p>
            <p className="text-red-400/70 text-xs mt-1">{countdown} সেকেন্ড পরে আবার চেষ্টা করুন</p>
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-3">
              <div className="bg-red-400 h-1.5 rounded-full transition-all" style={{ width: `${Math.max(0, 100 - (countdown / 60) * 100)}%` }} />
            </div>
          </div>
        ) : error ? (
          <p className="text-red-300 text-sm mb-4 fade-in">ভুল PIN! ({MAX_ATTEMPTS - attempts}টি চেষ্টা বাকি)</p>
        ) : (
          <div className="h-8 mb-2" />
        )}

        {/* Numpad */}
        <div className={`grid grid-cols-3 gap-2.5 w-full ${isLocked ? 'opacity-40 pointer-events-none' : ''}`}>
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />;
            if (d === 'del') return (
              <button key={i} onClick={handleDelete} className="aspect-square rounded-full flex items-center justify-center text-xl mx-auto w-[72px] transition-all hover:bg-white/10 active:scale-95" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} aria-label="মুছুন">⌫</button>
            );
            return (
              <button key={i} onClick={() => handleDigit(d)} className="aspect-square rounded-full flex items-center justify-center text-2xl font-light mx-auto w-[72px] transition-all hover:bg-white/16 active:scale-95" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>{d}</button>
            );
          })}
        </div>

        {/* Forgot PIN */}
        <button onClick={handleForgotPin} className="text-blue-400/60 text-xs mt-6 hover:text-blue-300 transition-all">
          PIN ভুলে গেছেন?
        </button>

        {/* Forgot PIN Panel */}
        {showForgot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 fade-in" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center">
              <div className="text-4xl mb-3">🔑</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">PIN ভুলে গেছেন?</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                PIN রিসেট করলে অ্যাপ আনলক হবে এবং PIN বন্ধ হয়ে যাবে। পরে সেটিংস থেকে নতুন PIN সেট করতে পারবেন।
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowForgot(false)} className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-gray-100 text-gray-700 border border-gray-200 active:scale-[0.97] transition-all">
                  বাতিল
                </button>
                <button onClick={handleEmergencyReset} className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white active:scale-[0.97] transition-all" style={{ background: 'linear-gradient(135deg, #F43F5E, #BE123C)' }}>
                  PIN রিসেট করুন
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-10px)}40%,80%{transform:translateX(10px)}}.animate-shake{animation:shake .4s ease-in-out}`}</style>
    </div>
  );
}

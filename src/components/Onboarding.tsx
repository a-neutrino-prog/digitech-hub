import { useRef, useState } from 'react';
import { updateShopInfo, completeOnboarding } from '../store';
import { useToast } from '../hooks/useToast';
import { ChevronRight, Store, User, Smartphone, Check } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

const STEPS = [
  { id: 'welcome', title: 'স্বাগতম!' },
  { id: 'shop', title: 'দোকানের তথ্য' },
  { id: 'done', title: 'প্রস্তুত!' },
];

export default function Onboarding({ onComplete }: Props) {
  const { toast } = useToast();
  const shopNameRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState(0);
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const handleNextStep = () => {
    if (!shopName.trim()) {
      toast.error('দোকানের নাম লিখুন');
      shopNameRef.current?.focus();
      return;
    }
    setStep(2);
  };

  const handleFinish = () => {
    if (shopName.trim()) {
      updateShopInfo({
        shopName: shopName.trim() || 'ডিজিটেক হাব',
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
    }
    completeOnboarding();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)' }}>
      {/* Decorative */}
      <div className="absolute top-[-80px] right-[-60px] w-[250px] h-[250px] rounded-full" style={{ background: 'rgba(96,165,250,0.06)' }} />
      <div className="absolute bottom-[-100px] left-[-40px] w-[300px] h-[300px] rounded-full" style={{ background: 'rgba(37,99,235,0.08)' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? 'bg-white w-10' : 'bg-white/20 w-6'}`} />
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center text-white fade-in-scale">
            <div className="text-6xl mb-6">📱</div>
            <h1 className="text-3xl font-extrabold mb-3 tracking-tight">ডিজিটেক হাব</h1>
            <p className="text-blue-200 text-base mb-2 leading-relaxed">আপনার ব্যবসা, আপনার হাতের মুঠোয়</p>
            <p className="text-blue-300/60 text-sm mb-10 max-w-xs mx-auto">আয়-ব্যয়, গ্রাহক, কাজ — সব এক জায়গায় ম্যানেজ করুন।</p>

            <div className="grid grid-cols-3 gap-3 mb-10">
              {[
                { icon: '📋', label: 'কাজ ট্র্যাক' },
                { icon: '👥', label: 'গ্রাহক ডেটা' },
                { icon: '📊', label: 'রিপোর্ট' },
              ].map((f, i) => (
                <div key={i} className="rounded-2xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-2xl block mb-1">{f.icon}</span>
                  <span className="text-[11px] text-blue-200">{f.label}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setStep(1)}
              className="w-full py-4 rounded-2xl font-semibold text-base text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 8px 32px rgba(37,99,235,0.3)' }}>
              শুরু করুন <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Step 1: Shop Info */}
        {step === 1 && (
          <div className="fade-in-scale">
            <div className="text-center text-white mb-8">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <Store size={28} />
              </div>
              <h2 className="text-xl font-bold">আপনার দোকানের তথ্য</h2>
              <p className="text-blue-300 text-sm mt-1">এই তথ্য রসিদে ও হেডারে দেখাবে</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-blue-300 mb-1.5 block flex items-center gap-1"><Store size={12} /> দোকানের নাম *</label>
                <input ref={shopNameRef} type="text" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="যেমন: ডিজিটেক হাব"
                  className="w-full px-4 py-3 rounded-2xl text-sm text-white placeholder-white/30"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.15)' }} autoFocus />
              </div>
              <div>
                <label className="text-xs font-semibold text-blue-300 mb-1.5 block flex items-center gap-1"><User size={12} /> মালিকের নাম</label>
                <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="আপনার নাম"
                  className="w-full px-4 py-3 rounded-2xl text-sm text-white placeholder-white/30"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.15)' }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-blue-300 mb-1.5 block flex items-center gap-1"><Smartphone size={12} /> ফোন নম্বর</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-3 rounded-2xl text-sm text-white placeholder-white/30"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.15)' }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-blue-300 mb-1.5 block">📍 ঠিকানা</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="গ্রাম, উপজেলা, জেলা"
                  className="w-full px-4 py-3 rounded-2xl text-sm text-white placeholder-white/30"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.15)' }} />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(0)} className="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-white/70" style={{ background: 'rgba(255,255,255,0.08)' }}>
                পিছনে
              </button>
              <button onClick={handleNextStep}
                className="flex-[2] py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}>
                পরবর্তী <ChevronRight size={18} />
              </button>
            </div>

            <button onClick={() => { completeOnboarding(); onComplete(); }} className="w-full text-center text-blue-400/60 text-xs mt-4">
              এখন না, পরে সেটিংস থেকে করব →
            </button>
          </div>
        )}

        {/* Step 2: Done */}
        {step === 2 && (
          <div className="text-center text-white fade-in-scale">
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
              <Check size={36} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-extrabold mb-2">সব প্রস্তুত! 🎉</h2>
            <p className="text-blue-200 text-sm mb-3">
              {shopName ? `"${shopName}"` : 'আপনার দোকান'} সেটআপ সম্পন্ন হয়েছে।
            </p>
            <p className="text-blue-300/50 text-xs mb-10 max-w-xs mx-auto leading-relaxed">
              এখন গ্রাহক যোগ করুন, কাজ ট্র্যাক করুন, এবং হিসাব রাখুন — সব মোবাইল থেকে!
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {[
                { icon: '☁️', title: 'ক্লাউড সিঙ্ক', desc: 'সেটিংস থেকে চালু করুন' },
                { icon: '🔐', title: 'PIN লক', desc: 'নিরাপত্তার জন্য সেট করুন' },
                { icon: '🌙', title: 'ডার্ক মোড', desc: 'সেটিংস থেকে চালু করুন' },
                { icon: '📱', title: 'ইনস্টল করুন', desc: 'হোম স্ক্রিনে যোগ করুন' },
              ].map((tip, i) => (
                <div key={i} className="rounded-2xl p-3 text-left" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-lg">{tip.icon}</span>
                  <p className="text-xs font-semibold text-white mt-1">{tip.title}</p>
                  <p className="text-[10px] text-blue-300/60">{tip.desc}</p>
                </div>
              ))}
            </div>

            <button onClick={handleFinish}
              className="w-full py-4 rounded-2xl font-semibold text-base text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
              style={{ background: 'linear-gradient(135deg, #22C55E, #15803D)', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}>
              ✅ শুরু করুন
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

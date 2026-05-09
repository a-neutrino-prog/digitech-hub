import { useState } from 'react';
import { signInWithGoogle } from '../firebase/sync';
import { RefreshCw, Cloud } from 'lucide-react';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const { user, error } = await signInWithGoogle();
    setLoading(false);
    if (!user) {
      setError(error || 'Google লগইন ব্যর্থ');
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <Cloud size={40} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">ডিজিটেক হাব</h1>
        <p className="text-sm text-gray-500 mb-8">এগিয়ে যান ডিজিটাল সেবার সাথে</p>
        
        {error && <p className="text-xs text-red-500 mb-4 bg-red-50 p-2 rounded">{error}</p>}
        
        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="w-full py-3.5 bg-white border-2 border-gray-200 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          {loading ? <RefreshCw size={18} className="animate-spin text-gray-500" /> : (
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          )}
          <span className="text-gray-700">Google দিয়ে লগইন করুন</span>
        </button>
        <p className="text-[11px] text-gray-400 mt-6">
          * আপনার ডেটা সম্পূর্ণ নিরাপদ এবং আপনার নিজের ডিভাইসেই প্রাইভেট থাকবে।
        </p>
      </div>
    </div>
  );
}

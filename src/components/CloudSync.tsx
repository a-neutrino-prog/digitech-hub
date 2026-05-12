import { useState, useEffect, useCallback } from 'react';
import { isFirebaseConfigured } from '../firebase/config';
import {
  listenAuth,
  signInAnon,
  signInEmail,
  registerEmail,
  signInWithGoogle,
  signOut,
  fullSync,
  uploadToCloud,
  downloadFromCloud,
  getLastSyncTime,
  startAutoSync,
  stopAutoSync,
  startRealtimeSync,
  stopRealtimeSync,
  isRealtimeActive,
  enableAutoUpload,
  getCurrentUser,
  type SyncStatus,
} from '../firebase/sync';
import { useConfirm } from '../hooks/useConfirm';
import type { Page } from '../App';
import { ArrowLeft, Cloud, RefreshCw, Upload, Download, LogOut, User, Mail, Key, Check, AlertCircle, Wifi, WifiOff, Settings, Radio, Zap } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
  refresh: () => void;
}

export default function CloudSync({ navigate, refresh }: Props) {
  const cfm = useConfirm();
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState(getCurrentUser());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState(getLastSyncTime());
  const [realtimeOn, setRealtimeOn] = useState(isRealtimeActive());
  const [autoSyncOn, setAutoSyncOn] = useState(localStorage.getItem('auto_sync') === 'true');
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (!configured) return;
    // Auth state শুধু UI update-এর জন্য (sync App.tsx থেকে হচ্ছে)
    const unsub = listenAuth((u) => {
      setUser(u);
      setRealtimeOn(isRealtimeActive());
    });
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { unsub(); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [configured]);

  const handleSync = useCallback(async () => {
    setSyncStatus('syncing');
    const result = await fullSync();
    setSyncStatus(result);
    setLastSync(getLastSyncTime());
    if (result === 'success') refresh();
    setTimeout(() => setSyncStatus(realtimeOn ? 'realtime' : 'idle'), 3000);
  }, [refresh, realtimeOn]);

  const handleUpload = async () => {
    setSyncStatus('syncing');
    const ok = await uploadToCloud();
    setSyncStatus(ok ? 'success' : 'error');
    setLastSync(getLastSyncTime());
    setTimeout(() => setSyncStatus(realtimeOn ? 'realtime' : 'idle'), 3000);
  };

  const handleDownload = async () => {
    const confirmed = await cfm({ title: 'ক্লাউড থেকে ডাউনলোড', message: 'ক্লাউড ডেটা ডাউনলোড করলে লোকাল ডেটা প্রতিস্থাপিত হবে। চালিয়ে যেতে চান?', confirmText: 'ডাউনলোড করুন' });
    if (!confirmed) return;
    setSyncStatus('syncing');
    const success = await downloadFromCloud();
    setSyncStatus(success ? 'success' : 'error');
    setLastSync(getLastSyncTime());
    if (success) refresh();
    setTimeout(() => setSyncStatus(realtimeOn ? 'realtime' : 'idle'), 3000);
  };

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');
    const { user: u, error } = await signInWithGoogle();
    setLoginLoading(false);
    if (u) { setUser(u); handleSync(); }
    else { setLoginError(error || 'Google লগইন ব্যর্থ'); }
  };

  const handleAnonLogin = async () => {
    setLoginLoading(true);
    const u = await signInAnon();
    setUser(u);
    setLoginLoading(false);
    if (u) handleSync();
  };

  const handleEmailLogin = async () => {
    if (!email || !password) { setLoginError('ইমেইল ও পাসওয়ার্ড দিন'); return; }
    setLoginLoading(true);
    setLoginError('');
    // Bug #9 Fix: আলাদা login ও register
    const fn = isRegisterMode ? registerEmail : signInEmail;
    const { user: u, error } = await fn(email, password);
    setLoginLoading(false);
    if (u) { setUser(u); setShowLogin(false); handleSync(); }
    else { setLoginError(error || 'ব্যর্থ'); }
  };

  const handleSignOut = async () => {
    stopRealtimeSync();
    stopAutoSync();
    await signOut();
    setUser(null);
    setRealtimeOn(false);
    setAutoSyncOn(false);
    localStorage.removeItem('auto_sync');
    localStorage.removeItem('realtime_sync');
  };

  const toggleRealtime = () => {
    if (realtimeOn) {
      stopRealtimeSync();
      setRealtimeOn(false);
      setSyncStatus('idle');
      localStorage.removeItem('realtime_sync');
    } else {
      startRealtimeSync(() => { refresh(); setLastSync(Date.now()); });
      enableAutoUpload();
      setRealtimeOn(true);
      setSyncStatus('realtime');
      localStorage.setItem('realtime_sync', 'true');
      // Initial upload
      uploadToCloud();
    }
  };

  const toggleAutoSync = () => {
    const next = !autoSyncOn;
    setAutoSyncOn(next);
    localStorage.setItem('auto_sync', next ? 'true' : 'false');
    if (next) startAutoSync(); else stopAutoSync();
  };

  const formatLastSync = () => {
    if (!lastSync) return 'কখনো সিঙ্ক হয়নি';
    const diff = Date.now() - lastSync;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'এইমাত্র';
    if (mins < 60) return `${mins} মিনিট আগে`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ঘণ্টা আগে`;
    return `${Math.floor(hours / 24)} দিন আগে`;
  };

  const statusInfo: Record<SyncStatus, { icon: React.ReactNode; text: string; color: string }> = {
    'idle': { icon: <Cloud size={16} />, text: 'প্রস্তুত', color: 'text-gray-400' },
    'syncing': { icon: <RefreshCw size={16} className="animate-spin" />, text: 'সিঙ্ক হচ্ছে...', color: 'text-blue-500' },
    'success': { icon: <Check size={16} />, text: 'সিঙ্ক সম্পন্ন!', color: 'text-green-500' },
    'error': { icon: <AlertCircle size={16} />, text: 'সিঙ্ক ব্যর্থ', color: 'text-red-500' },
    'offline': { icon: <WifiOff size={16} />, text: 'অফলাইন', color: 'text-orange-500' },
    'not-configured': { icon: <Cloud size={16} />, text: 'কনফিগার করা হয়নি', color: 'text-gray-400' },
    'realtime': { icon: <Radio size={16} className="text-green-500 animate-pulse" />, text: 'রিয়েলটাইম সক্রিয়', color: 'text-green-500' },
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white px-4 pt-4 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('settings')} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-lg font-bold">☁️ ক্লাউড সিঙ্ক</h2>
          </div>
          {user && (
            <button onClick={handleSignOut} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 rounded-lg text-xs font-medium hover:bg-white/25 transition-all">
              <LogOut size={14} />
              লগআউট
            </button>
          )}
        </div>
        <div className="bg-white/15 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {online ? <Wifi size={16} className="text-green-300" /> : <WifiOff size={16} className="text-red-300" />}
              <span className="text-sm">{online ? 'অনলাইন' : 'অফলাইন'}</span>
            </div>
            <div className={`flex items-center gap-1 ${statusInfo[syncStatus].color}`}>
              {statusInfo[syncStatus].icon}
              <span className="text-xs">{statusInfo[syncStatus].text}</span>
            </div>
          </div>
          <div className="text-xs text-blue-200">শেষ সিঙ্ক: {formatLastSync()}</div>
          {user && (
            <div className="text-xs text-blue-200 mt-1 flex items-center gap-1">
              <User size={10} />
              {user.email || `বেনামী (${user.uid.slice(0, 8)}...)`}
            </div>
          )}
          {realtimeOn && (
            <div className="mt-2 flex items-center gap-1.5 bg-green-500/20 px-2 py-1 rounded-lg w-fit">
              <Radio size={12} className="animate-pulse" />
              <span className="text-[10px] font-medium">রিয়েলটাইম সিঙ্ক সক্রিয়</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Not Configured */}
        {!configured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Settings size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-800">Firebase কনফিগারেশন প্রয়োজন</h3>
                <p className="text-xs text-yellow-600 mt-1">
                  <code className="bg-yellow-100 px-1 rounded">src/firebase/config.ts</code> ফাইলে credentials দিন।
                </p>
                <div className="mt-3 bg-yellow-100 rounded-lg p-3 text-xs text-yellow-800">
                  <p className="font-semibold mb-1">ধাপসমূহ:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Firebase Console-এ প্রজেক্ট তৈরি করুন</li>
                    <li>Authentication → Anonymous ও Email/Password চালু করুন</li>
                    <li>Firestore Database তৈরি করুন</li>
                    <li>Project Settings → Config কপি করুন</li>
                    <li>config.ts ফাইলে পেস্ট করুন</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Login */}
        {configured && !user && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">🔐 লগইন করুন</h3>

            {/* Google Login */}
            <button onClick={handleGoogleLogin} disabled={loginLoading}
              className="w-full py-3 bg-white border-2 border-gray-200 rounded-xl font-medium text-sm flex items-center justify-center gap-3 mb-3 hover:bg-gray-50 transition-all disabled:opacity-50">
              {loginLoading ? <RefreshCw size={16} className="animate-spin text-gray-500" /> : (
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              )}
              <span className="text-gray-700">Google দিয়ে লগইন</span>
            </button>

            {/* Anonymous Login */}
            <button onClick={handleAnonLogin} disabled={loginLoading}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 mb-3 disabled:opacity-50">
              {loginLoading ? <RefreshCw size={16} className="animate-spin" /> : <User size={16} />}
              দ্রুত শুরু করুন (বেনামী)
            </button>

            <div className="relative my-3">
              <hr className="border-gray-200" />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-gray-400">অথবা</span>
            </div>

            <button onClick={() => setShowLogin(!showLogin)}
              className="w-full py-2.5 bg-gray-50 text-gray-700 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-gray-200">
              <Mail size={16} /> ইমেইল দিয়ে লগইন
            </button>
            {showLogin && (
              <div className="mt-3 space-y-3">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="পাসওয়ার্ড"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                {loginError && <p className="text-xs text-red-500">{loginError}</p>}
                <button onClick={handleEmailLogin} disabled={loginLoading}
                  className="w-full py-2.5 bg-green-500 text-white rounded-xl font-medium text-sm disabled:opacity-50">
                  {loginLoading ? 'অপেক্ষা করুন...' : isRegisterMode ? 'অ্যাকাউন্ট তৈরি করুন' : 'লগইন করুন'}
                </button>
                <button
                  onClick={() => { setIsRegisterMode(!isRegisterMode); setLoginError(''); }}
                  className="w-full text-center text-xs text-primary mt-1"
                >
                  {isRegisterMode ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Logged In Actions */}
        {configured && user && (
          <>
            {/* ⭐ Realtime Sync Toggle */}
            <div className="bg-white rounded-2xl shadow-sm p-4 border-2 border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${realtimeOn ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Zap size={20} className={realtimeOn ? 'text-green-600' : 'text-gray-400'} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">⚡ রিয়েলটাইম সিঙ্ক</p>
                    <p className="text-xs text-gray-400">
                      {realtimeOn
                        ? 'সক্রিয় - ডেটা পরিবর্তন হলে সাথে সাথে সিঙ্ক হচ্ছে'
                        : 'বন্ধ - চালু করলে সব ডিভাইসে তাৎক্ষণিক আপডেট'}
                    </p>
                  </div>
                </div>
                <button onClick={toggleRealtime}
                  className={`w-14 h-7 rounded-full transition-all relative ${realtimeOn ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`w-6 h-6 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${realtimeOn ? 'left-7' : 'left-0.5'}`} />
                </button>
              </div>
              {realtimeOn && (
                <div className="mt-3 pt-3 border-t border-green-100 text-xs text-green-600 flex items-center gap-2">
                  <Radio size={14} className="animate-pulse" />
                  লাইভ কানেক্টেড — পরিবর্তন হলে সব ডিভাইসে তাৎক্ষণিক দেখাবে
                </div>
              )}
            </div>

            {/* Manual Sync */}
            <button onClick={handleSync} disabled={syncStatus === 'syncing' || !online}
              className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all disabled:opacity-50">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <RefreshCw size={22} className={`text-blue-600 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-gray-800">এখনই সিঙ্ক করুন</p>
                <p className="text-xs text-gray-400">ম্যানুয়াল সিঙ্ক্রোনাইজ</p>
              </div>
              {syncStatus === 'success' && <Check size={20} className="text-green-500" />}
            </button>

            {/* Upload/Download */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleUpload} disabled={syncStatus === 'syncing' || !online}
                className="bg-white rounded-2xl shadow-sm p-4 text-center hover:shadow-md transition-all disabled:opacity-50">
                <Upload size={20} className="text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">আপলোড</p>
                <p className="text-[10px] text-gray-400 mt-0.5">লোকাল → ক্লাউড</p>
              </button>
              <button onClick={handleDownload} disabled={syncStatus === 'syncing' || !online}
                className="bg-white rounded-2xl shadow-sm p-4 text-center hover:shadow-md transition-all disabled:opacity-50">
                <Download size={20} className="text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">ডাউনলোড</p>
                <p className="text-[10px] text-gray-400 mt-0.5">ক্লাউড → লোকাল</p>
              </button>
            </div>

            {/* Auto Sync Toggle */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cloud size={18} className="text-cyan-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">অটো সিঙ্ক (প্রতি ৫ মি.)</p>
                    <p className="text-xs text-gray-400">পর্যায়ক্রমিক ব্যাকআপ</p>
                  </div>
                </div>
                <button onClick={toggleAutoSync}
                  className={`w-12 h-6 rounded-full transition-all relative ${autoSyncOn ? 'bg-primary' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${autoSyncOn ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Account Info & Google Upgrade */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">👤 অ্যাকাউন্ট</h3>
              <div className="flex items-center gap-3 mb-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <User size={20} className="text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {user.displayName || user.email || 'বেনামী ব্যবহারকারী'}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {user.email || `ID: ${user.uid.slice(0, 12)}...`}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  user.isAnonymous 
                    ? 'bg-yellow-100 text-yellow-700' 
                    : user.providerData?.[0]?.providerId === 'google.com'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {user.isAnonymous ? 'বেনামী' : user.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 'Email'}
                </span>
              </div>

              {/* বেনামী হলে Google-এ আপগ্রেড অপশন */}
              {user.isAnonymous && (
                <div className="space-y-2">
                  <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">
                    ⚠️ বেনামী অ্যাকাউন্টে ডেটা হারাতে পারে। Google দিয়ে লগইন করুন।
                  </p>
                  <button onClick={handleGoogleLogin} disabled={loginLoading}
                    className="w-full py-2.5 bg-white border-2 border-gray-200 rounded-xl font-medium text-sm flex items-center justify-center gap-3 hover:bg-gray-50 transition-all disabled:opacity-50">
                    {loginLoading ? <RefreshCw size={16} className="animate-spin text-gray-500" /> : (
                      <svg width="16" height="16" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                    )}
                    <span className="text-gray-700">Google দিয়ে আপগ্রেড করুন</span>
                  </button>
                </div>
              )}

              {/* Google ছাড়া লগইন থাকলে Google লিংক অপশন */}
              {!user.isAnonymous && user.providerData?.[0]?.providerId !== 'google.com' && (
                <button onClick={handleGoogleLogin} disabled={loginLoading}
                  className="w-full py-2.5 bg-white border border-gray-200 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-all disabled:opacity-50 mt-2">
                  <svg width="14" height="14" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Google অ্যাকাউন্টে সুইচ করুন
                </button>
              )}
            </div>

            {/* Sign Out */}
            <button onClick={handleSignOut}
              className="w-full py-3 bg-red-50 text-red-600 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 border border-red-200">
              <LogOut size={16} /> লগআউট
            </button>

            {/* Info */}
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <h4 className="text-xs font-semibold text-blue-700 mb-2">⚡ রিয়েলটাইম সিঙ্ক কিভাবে কাজ করে?</h4>
              <ul className="text-[11px] text-blue-600 space-y-1">
                <li>• <strong>রিয়েলটাইম:</strong> ডেটা পরিবর্তন হলে সাথে সাথে সব ডিভাইসে আপডেট</li>
                <li>• <strong>অটো-আপলোড:</strong> localStorage পরিবর্তন হলে ১.৫ সেকেন্ড পরে ক্লাউডে আপলোড</li>
                <li>• <strong>অটো-ডাউনলোড:</strong> অন্য ডিভাইস থেকে পরিবর্তন হলে তাৎক্ষণিক ডাউনলোড</li>
                <li>• <strong>অফলাইন:</strong> ইন্টারনেট না থাকলে লোকালে কাজ, ফিরলে সিঙ্ক</li>
                <li>• <strong>কনফ্লিক্ট:</strong> Last-write-wins + Device ID চেক</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

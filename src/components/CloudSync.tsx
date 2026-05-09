import { useState, useEffect, useCallback } from 'react';
import { isFirebaseConfigured } from '../firebase/config';
import { initFirebase } from '../firebase/init';
import {
  listenAuth,
  signInAnon,
  signInEmail,
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
import type { Page } from '../App';
import { ArrowLeft, Cloud, RefreshCw, Upload, Download, LogOut, User, Mail, Key, Check, AlertCircle, Wifi, WifiOff, Settings, Radio, Zap } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
  refresh: () => void;
}

export default function CloudSync({ navigate, refresh }: Props) {
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
  const [loginLoading, setLoginLoading] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (!configured) return;
    initFirebase();
    const unsub = listenAuth((u) => {
      setUser(u);
      if (u) {
        // Auto start realtime if was on
        if (localStorage.getItem('realtime_sync') === 'true') {
          startRealtimeSync(() => { refresh(); setLastSync(Date.now()); });
          enableAutoUpload();
          setRealtimeOn(true);
        }
        if (localStorage.getItem('auto_sync') === 'true') {
          startAutoSync();
        }
      }
    });

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [configured, refresh]);

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
    if (!confirm('ক্লাউড ডেটা ডাউনলোড করলে লোকাল ডেটা প্রতিস্থাপিত হবে।')) return;
    setSyncStatus('syncing');
    const ok = await downloadFromCloud();
    setSyncStatus(ok ? 'success' : 'error');
    setLastSync(getLastSyncTime());
    if (ok) refresh();
    setTimeout(() => setSyncStatus(realtimeOn ? 'realtime' : 'idle'), 3000);
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
    const { user: u, error } = await signInEmail(email, password);
    setLoginLoading(false);
    if (u) { setUser(u); setShowLogin(false); handleSync(); }
    else { setLoginError(error || 'লগইন ব্যর্থ'); }
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
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('settings')} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-bold">☁️ ক্লাউড সিঙ্ক</h2>
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
                  {loginLoading ? 'অপেক্ষা করুন...' : 'লগইন / অ্যাকাউন্ট তৈরি'}
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

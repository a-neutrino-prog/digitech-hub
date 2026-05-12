import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getDb, getFirebaseAuth, isFirebaseReady } from './init';
import { isFirebaseConfigured } from './config';

// ===== Auth =====

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'not-configured' | 'realtime';

let currentUser: User | null = null;

export function getCurrentUser(): User | null {
  return currentUser;
}

export function listenAuth(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

export async function signInAnon(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  try {
    const result = await signInAnonymously(auth);
    currentUser = result.user;
    return result.user;
  } catch (e) {
    console.error('[Sync] Anon sign in error:', e);
    return null;
  }
}

// Bug #9 Fix: আলাদা login ও register ফাংশন
export async function signInEmail(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const auth = getFirebaseAuth();
  if (!auth) return { user: null, error: 'Firebase not configured' };
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    currentUser = result.user;
    return { user: result.user, error: null };
  } catch (e: any) {
    if (e.code === 'auth/user-not-found') {
      return { user: null, error: 'অ্যাকাউন্ট পাওয়া যায়নি। নতুন অ্যাকাউন্ট তৈরি করুন।' };
    }
    if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
      return { user: null, error: 'ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।' };
    }
    return { user: null, error: e.message };
  }
}

export async function registerEmail(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const auth = getFirebaseAuth();
  if (!auth) return { user: null, error: 'Firebase not configured' };
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = result.user;
    return { user: result.user, error: null };
  } catch (e: any) {
    if (e.code === 'auth/email-already-in-use') {
      return { user: null, error: 'এই ইমেইল ইতিমধ্যে ব্যবহৃত। লগইন করুন।' };
    }
    if (e.code === 'auth/weak-password') {
      return { user: null, error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' };
    }
    return { user: null, error: e.message };
  }
}

export async function signInWithGoogle(): Promise<{ user: User | null; error: string | null }> {
  const auth = getFirebaseAuth();
  if (!auth) return { user: null, error: 'Firebase not configured' };
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    return { user: result.user, error: null };
  } catch (e: any) {
    return { user: null, error: e.message };
  }
}

// Bug #1 Fix: signOut-এ local data মুছবে না
export async function signOut(): Promise<void> {
  stopRealtimeSync();
  stopAutoSync();
  disableAutoUpload();
  const auth = getFirebaseAuth();
  if (!auth) return;
  await fbSignOut(auth);
  currentUser = null;
  // শুধু sync-related keys মুছুন, ব্যবসায়িক data রাখুন
  localStorage.removeItem('sync_last');
  localStorage.removeItem('realtime_sync');
  localStorage.removeItem('auto_sync');
  localStorage.removeItem('_localSyncCheck');
}

// ===== Data Collections =====
// Bug #8 Fix: customer_photos বাদ (base64 images Firestore 1MB limit hit করতে পারে)
const COLLECTIONS = ['customers', 'services', 'jobs', 'transactions', 'shopInfo', 'notifications', 'reminders'] as const;

function getLocalData(): Record<string, any> {
  const data: Record<string, any> = {};
  COLLECTIONS.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
    }
  });
  data['_localTimestamp'] = Date.now();
  return data;
}

function setLocalData(data: Record<string, any>): void {
  COLLECTIONS.forEach(key => {
    if (data[key] !== undefined) {
      localStorage.setItem(key, JSON.stringify(data[key]));
    }
  });
}

export function getLastSyncTime(): number {
  return parseInt(localStorage.getItem('sync_last') || '0');
}

function setLastSyncTime(): void {
  localStorage.setItem('sync_last', Date.now().toString());
}

function getDeviceId(): string {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem('device_id', id);
  }
  return id;
}

// ===== Upload / Download =====

// লোকাল ডেটা ক্লাউডে পাঠানো (debounced)
let uploadTimer: ReturnType<typeof setTimeout> | null = null;
let _isApplyingRemote = false; // remote update apply করার সময় re-upload ব্লক

export async function uploadToCloud(): Promise<boolean> {
  if (_isApplyingRemote) return true; // skip if applying remote
  if (!isFirebaseReady() || !currentUser) return false;
  const db = getDb();
  if (!db) return false;

  try {
    const data = getLocalData();
    const docRef = doc(db, 'users', currentUser.uid);
    await setDoc(docRef, {
      ...data,
      _updatedAt: serverTimestamp(),
      _deviceId: getDeviceId(),
    }, { merge: true });
    setLastSyncTime();
    return true;
  } catch (e) {
    console.error('[Sync] Upload error:', e);
    return false;
  }
}

// Debounced upload - লোকাল পরিবর্তনের পর ১ সেকেন্ড অপেক্ষা করে আপলোড
export function scheduleUpload(): void {
  if (_isApplyingRemote) return;
  if (uploadTimer) clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => {
    if (navigator.onLine && currentUser) {
      uploadToCloud().then(ok => {
        if (ok) console.log('[Sync] Auto-uploaded to cloud');
      });
    }
  }, 1500);
}

export async function downloadFromCloud(): Promise<boolean> {
  if (!isFirebaseReady() || !currentUser) return false;
  const db = getDb();
  if (!db) return false;

  try {
    const docRef = doc(db, 'users', currentUser.uid);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const cloudData = snapshot.data();
      _isApplyingRemote = true;
      setLocalData(cloudData);
      setLastSyncTime();
      _isApplyingRemote = false;
      return true;
    }
    return false;
  } catch (e) {
    console.error('[Sync] Download error:', e);
    _isApplyingRemote = false;
    return false;
  }
}

// ===== Full Sync (Last-write-wins) =====

export async function fullSync(): Promise<SyncStatus> {
  if (!isFirebaseConfigured()) return 'not-configured';
  if (!navigator.onLine) return 'offline';
  if (!isFirebaseReady() || !currentUser) return 'error';
  const db = getDb();
  if (!db) return 'error';

  try {
    const docRef = doc(db, 'users', currentUser.uid);
    const snapshot = await getDoc(docRef);
    const localData = getLocalData();
    const localTimestamp = localData['_localTimestamp'] || 0;

    if (snapshot.exists()) {
      const cloudData = snapshot.data();
      const cloudTimestamp = cloudData['_localTimestamp'] || 0;

      if (cloudTimestamp > localTimestamp) {
        _isApplyingRemote = true;
        setLocalData(cloudData);
        setLastSyncTime();
        _isApplyingRemote = false;
        return 'success';
      }
    }

    await setDoc(docRef, {
      ...localData,
      _updatedAt: serverTimestamp(),
      _deviceId: getDeviceId(),
    }, { merge: true });
    setLastSyncTime();
    return 'success';
  } catch (e) {
    console.error('[Sync] Full sync error:', e);
    return 'error';
  }
}

// ===== Realtime Listener =====

let realtimeUnsub: Unsubscribe | null = null;
let _realtimeCallback: (() => void) | null = null;

export function startRealtimeSync(onRemoteUpdate: () => void): void {
  stopRealtimeSync();

  if (!isFirebaseReady() || !currentUser) return;
  const db = getDb();
  if (!db) return;

  _realtimeCallback = onRemoteUpdate;
  const docRef = doc(db, 'users', currentUser.uid);

  // onSnapshot → ক্লাউডে কোনো পরিবর্তন হলে সাথে সাথে নোটিফাই
  realtimeUnsub = onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) return;

    const cloudData = snapshot.data();
    const cloudDeviceId = cloudData['_deviceId'];
    const myDeviceId = getDeviceId();

    // নিজের ডিভাইস থেকে আপলোড হলে ignore
    if (cloudDeviceId === myDeviceId) return;

    const cloudTimestamp = cloudData['_localTimestamp'] || 0;
    const localTimestamp = parseInt(localStorage.getItem('_localSyncCheck') || '0');

    // Cloud newer than our last check → apply
    if (cloudTimestamp > localTimestamp) {
      console.log('[Sync] Realtime update from another device');
      _isApplyingRemote = true;
      setLocalData(cloudData);
      setLastSyncTime();
      localStorage.setItem('_localSyncCheck', cloudTimestamp.toString());
      _isApplyingRemote = false;

      // UI refresh
      if (_realtimeCallback) _realtimeCallback();
    }
  }, (error) => {
    console.error('[Sync] Realtime listener error:', error);
  });

  console.log('[Sync] Realtime listener started');
}

export function stopRealtimeSync(): void {
  if (realtimeUnsub) {
    realtimeUnsub();
    realtimeUnsub = null;
  }
  _realtimeCallback = null;
}

export function isRealtimeActive(): boolean {
  return !!realtimeUnsub;
}

// ===== Bug #6 Fix: Auto-upload with proper restore =====

let storageProxy = false;
let _originalSetItem: ((key: string, value: string) => void) | null = null;

export function enableAutoUpload(): void {
  if (storageProxy) return;
  storageProxy = true;

  _originalSetItem = localStorage.setItem.bind(localStorage);
  const origSet = _originalSetItem;

  localStorage.setItem = function (key: string, value: string) {
    origSet(key, value);

    const ignoreKeys = ['sync_last', 'device_id', 'dark_mode', 'pin_code', 'auto_sync', '_localSyncCheck', 'customer_photos'];
    if (ignoreKeys.includes(key)) return;

    if ((COLLECTIONS as readonly string[]).includes(key)) {
      scheduleUpload();
    }
  };
}

// Bug #6 Fix: properly restore original setItem
export function disableAutoUpload(): void {
  if (_originalSetItem) {
    localStorage.setItem = _originalSetItem;
    _originalSetItem = null;
  }
  storageProxy = false;
}

// ===== Auto Sync (Fallback interval) =====

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(intervalMs = 5 * 60 * 1000): void {
  stopAutoSync();
  syncInterval = setInterval(() => {
    if (navigator.onLine && currentUser) {
      fullSync().then(status => {
        console.log('[Sync] Periodic sync:', status);
      });
    }
  }, intervalMs);
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

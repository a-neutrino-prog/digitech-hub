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
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getDb, getFirebaseAuth, isFirebaseReady } from './init';
import { isFirebaseConfigured } from './config';
import { clearAllData } from '../store';

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

export async function signInEmail(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const auth = getFirebaseAuth();
  if (!auth) return { user: null, error: 'Firebase not configured' };
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    currentUser = result.user;
    return { user: result.user, error: null };
  } catch (e: any) {
    if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
      try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = result.user;
        return { user: result.user, error: null };
      } catch (e2: any) {
        return { user: null, error: e2.message };
      }
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
    if (e.code === 'auth/popup-blocked') {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithRedirect(auth, provider);
        return { user: null, error: null }; // wait for redirect
      } catch (redirectError: any) {
        return { user: null, error: redirectError.message };
      }
    }
    return { user: null, error: e.message };
  }
}

export async function checkRedirectResult(): Promise<{ user: User | null; error: string | null }> {
  const auth = getFirebaseAuth();
  if (!auth) return { user: null, error: null };
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      currentUser = result.user;
      return { user: result.user, error: null };
    }
    return { user: null, error: null };
  } catch (e: any) {
    return { user: null, error: e.message };
  }
}

export async function signOut(): Promise<void> {
  stopRealtimeSync();
  stopAutoSync();
  const auth = getFirebaseAuth();
  if (!auth) return;
  await fbSignOut(auth);
  currentUser = null;
  localStorage.removeItem('sync_last');
  localStorage.removeItem('realtime_sync');
  localStorage.removeItem('auto_sync');
  clearAllData(); // Clear all data on sign out for multi-tenant safety
}

// ===== Data Collections =====

const COLLECTIONS = ['customers', 'services', 'jobs', 'transactions', 'shopInfo', 'notifications', 'reminders', 'customer_photos'] as const;

function getLocalData(): Record<string, any> {
  const data: Record<string, any> = {};
  COLLECTIONS.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
    }
  });
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
let _initialSyncDone = false;

export async function uploadToCloud(): Promise<boolean> {
  if (_isApplyingRemote) return true; // skip if applying remote
  if (!isFirebaseReady() || !currentUser) return false;
  
  if (!_initialSyncDone && !localStorage.getItem('_localSyncCheck')) {
    console.log('[Sync] Skipping upload because initial sync is not done');
    return false;
  }

  const db = getDb();
  if (!db) return false;

  try {
    const data = getLocalData();
    const docRef = doc(db, 'users', currentUser.uid);
    const now = Date.now();
    await setDoc(docRef, {
      ...data,
      _localTimestamp: now,
      _updatedAt: serverTimestamp(),
      _deviceId: getDeviceId(),
    }, { merge: true });
    setLastSyncTime();
    localStorage.setItem('_localSyncCheck', now.toString());
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
    _initialSyncDone = true;
    
    const localData = getLocalData();
    const localLastModified = parseInt(localStorage.getItem('_localLastModified') || '0');

    if (snapshot.exists()) {
      const cloudData = snapshot.data();
      const cloudTimestamp = cloudData['_localTimestamp'] || 0;

      if (cloudTimestamp > localLastModified) {
        _isApplyingRemote = true;
        setLocalData(cloudData);
        setLastSyncTime();
        localStorage.setItem('_localSyncCheck', cloudTimestamp.toString());
        _isApplyingRemote = false;
        return 'success';
      }
    }

    const now = Date.now();
    await setDoc(docRef, {
      ...localData,
      _localTimestamp: now,
      _updatedAt: serverTimestamp(),
      _deviceId: getDeviceId(),
    }, { merge: true });
    setLastSyncTime();
    localStorage.setItem('_localSyncCheck', now.toString());
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
    _initialSyncDone = true;
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

// ===== Auto-upload on localStorage change =====

let storageProxy = false;

export function enableAutoUpload(): void {
  if (storageProxy) return;
  storageProxy = true;

  // localStorage.setItem কে intercept করি
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key: string, value: string) {
    originalSetItem(key, value);

    // সিস্টেম keys ignore
    const ignoreKeys = ['sync_last', 'device_id', 'dark_mode', 'pin_code', 'auto_sync', '_localSyncCheck', '_localLastModified'];
    if (ignoreKeys.includes(key)) return;

    // COLLECTIONS-এর key হলে auto-upload schedule
    if ((COLLECTIONS as readonly string[]).includes(key)) {
      scheduleUpload();
    }
  };
}

export function disableAutoUpload(): void {
  // Cannot easily un-proxy, so just flag
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

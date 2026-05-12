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
import { getDb, getFirebaseAuth, isFirebaseReady, initFirebase } from './init';
import { isFirebaseConfigured } from './config';

// ===== Types =====
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'not-configured' | 'realtime';

let currentUser: User | null = null;
let _syncCallbacks: (() => void)[] = [];

export function getCurrentUser(): User | null { return currentUser; }

// ===== GLOBAL INIT — App.tsx থেকে call হবে =====
export function initSync(onDataChange: () => void): () => void {
  if (!isFirebaseConfigured()) return () => {};

  initFirebase();

  // Register callback
  _syncCallbacks.push(onDataChange);

  const unsub = onAuthStateChanged(getFirebaseAuth()!, (user) => {
    currentUser = user;

    if (user) {
      // Auto-restore realtime sync
      if (localStorage.getItem('realtime_sync') === 'true') {
        startRealtimeSync();
        enableAutoUpload();
      }
      if (localStorage.getItem('auto_sync') === 'true') {
        startAutoSync();
      }
      // Initial sync on login
      fullSync().then(s => console.log('[Sync] Init sync:', s));
    }
  });

  return () => {
    unsub();
    _syncCallbacks = _syncCallbacks.filter(cb => cb !== onDataChange);
  };
}

function notifyDataChange() {
  _syncCallbacks.forEach(cb => cb());
}

// ===== Auth =====
export function listenAuth(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) { callback(null); return () => {}; }
  return onAuthStateChanged(auth, (user) => { currentUser = user; callback(user); });
}

export async function signInAnon(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  try { const r = await signInAnonymously(auth); currentUser = r.user; return r.user; }
  catch (e) { console.error('[Sync] Anon error:', e); return null; }
}

export async function signInEmail(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const auth = getFirebaseAuth();
  if (!auth) return { user: null, error: 'Firebase not configured' };
  try { const r = await signInWithEmailAndPassword(auth, email, password); currentUser = r.user; return { user: r.user, error: null }; }
  catch (e: any) {
    if (e.code === 'auth/user-not-found') return { user: null, error: 'অ্যাকাউন্ট নেই। নতুন তৈরি করুন।' };
    if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') return { user: null, error: 'ভুল পাসওয়ার্ড!' };
    return { user: null, error: e.message };
  }
}

export async function registerEmail(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const auth = getFirebaseAuth();
  if (!auth) return { user: null, error: 'Firebase not configured' };
  try { const r = await createUserWithEmailAndPassword(auth, email, password); currentUser = r.user; return { user: r.user, error: null }; }
  catch (e: any) {
    if (e.code === 'auth/email-already-in-use') return { user: null, error: 'ইমেইল ব্যবহৃত। লগইন করুন।' };
    if (e.code === 'auth/weak-password') return { user: null, error: 'পাসওয়ার্ড ৬+ অক্ষর হতে হবে।' };
    return { user: null, error: e.message };
  }
}

export async function signInWithGoogle(): Promise<{ user: User | null; error: string | null }> {
  const auth = getFirebaseAuth();
  if (!auth) return { user: null, error: 'Firebase not configured' };
  try { const r = await signInWithPopup(auth, new GoogleAuthProvider()); currentUser = r.user; return { user: r.user, error: null }; }
  catch (e: any) { return { user: null, error: e.message }; }
}

export async function signOut(): Promise<void> {
  stopRealtimeSync();
  stopAutoSync();
  disableAutoUpload();
  const auth = getFirebaseAuth();
  if (!auth) return;
  await fbSignOut(auth);
  currentUser = null;
  localStorage.removeItem('sync_last');
  localStorage.removeItem('realtime_sync');
  localStorage.removeItem('auto_sync');
  localStorage.removeItem('_localSyncCheck');
}

// ===== Data =====
const COLLECTIONS = ['customers', 'services', 'jobs', 'transactions', 'shopInfo', 'notifications', 'reminders'] as const;

// Bug #3 Fix: Track actual last modification time, not current time
function getLocalModTime(): number {
  return parseInt(localStorage.getItem('_dataModifiedAt') || '0');
}

export function markDataModified(): void {
  localStorage.setItem('_dataModifiedAt', Date.now().toString());
}

function getLocalData(): Record<string, any> {
  const data: Record<string, any> = {};
  COLLECTIONS.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw) { try { data[key] = JSON.parse(raw); } catch { data[key] = raw; } }
  });
  data['_localTimestamp'] = getLocalModTime() || Date.now();
  return data;
}

let _isApplyingRemote = false;

function setLocalData(data: Record<string, any>): void {
  _isApplyingRemote = true;
  COLLECTIONS.forEach(key => {
    if (data[key] !== undefined) {
      // Use original setItem to avoid triggering auto-upload
      if (_originalSetItem) {
        _originalSetItem(key, JSON.stringify(data[key]));
      } else {
        localStorage.setItem(key, JSON.stringify(data[key]));
      }
    }
  });
  // Update sync check timestamp
  if (data['_localTimestamp']) {
    localStorage.setItem('_localSyncCheck', data['_localTimestamp'].toString());
  }
  localStorage.setItem('_dataModifiedAt', (data['_localTimestamp'] || Date.now()).toString());
  _isApplyingRemote = false;
}

export function getLastSyncTime(): number { return parseInt(localStorage.getItem('sync_last') || '0'); }
function setLastSyncTime(): void { localStorage.setItem('sync_last', Date.now().toString()); }

function getDeviceId(): string {
  let id = localStorage.getItem('device_id');
  if (!id) { id = 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2); localStorage.setItem('device_id', id); }
  return id;
}

// ===== Upload =====
let uploadTimer: ReturnType<typeof setTimeout> | null = null;

export async function uploadToCloud(): Promise<boolean> {
  if (_isApplyingRemote) return true;
  if (!isFirebaseReady() || !currentUser) return false;
  const db = getDb();
  if (!db) return false;

  try {
    const data = getLocalData();
    await setDoc(doc(db, 'users', currentUser.uid), {
      ...data,
      _updatedAt: serverTimestamp(),
      _deviceId: getDeviceId(),
    }, { merge: true });
    setLastSyncTime();
    console.log('[Sync] Uploaded to cloud');
    return true;
  } catch (e) {
    console.error('[Sync] Upload error:', e);
    return false;
  }
}

export function scheduleUpload(): void {
  if (_isApplyingRemote) return;
  markDataModified(); // Track modification time
  if (uploadTimer) clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => {
    if (navigator.onLine && currentUser) {
      uploadToCloud().then(ok => { if (ok) console.log('[Sync] Auto-uploaded'); });
    }
  }, 2000);
}

// ===== Download =====
export async function downloadFromCloud(): Promise<boolean> {
  if (!isFirebaseReady() || !currentUser) return false;
  const db = getDb();
  if (!db) return false;

  try {
    const snapshot = await getDoc(doc(db, 'users', currentUser.uid));
    if (snapshot.exists()) {
      setLocalData(snapshot.data());
      setLastSyncTime();
      notifyDataChange();
      return true;
    }
    return false;
  } catch (e) {
    console.error('[Sync] Download error:', e);
    return false;
  }
}

// ===== Full Sync =====
export async function fullSync(): Promise<SyncStatus> {
  if (!isFirebaseConfigured()) return 'not-configured';
  if (!navigator.onLine) return 'offline';
  if (!isFirebaseReady() || !currentUser) return 'error';
  const db = getDb();
  if (!db) return 'error';

  try {
    const docRef = doc(db, 'users', currentUser.uid);
    const snapshot = await getDoc(docRef);
    const localTimestamp = getLocalModTime();

    if (snapshot.exists()) {
      const cloudData = snapshot.data();
      const cloudTimestamp = cloudData['_localTimestamp'] || 0;

      if (cloudTimestamp > localTimestamp) {
        // Cloud is newer → download
        console.log('[Sync] Cloud newer, downloading...', { cloud: cloudTimestamp, local: localTimestamp });
        setLocalData(cloudData);
        setLastSyncTime();
        notifyDataChange();
        return 'success';
      }
    }

    // Local is newer or no cloud → upload
    if (localTimestamp > 0) {
      console.log('[Sync] Local newer, uploading...');
      await uploadToCloud();
    } else {
      // First time — upload everything
      console.log('[Sync] First sync, uploading...');
      markDataModified();
      await uploadToCloud();
    }

    return 'success';
  } catch (e) {
    console.error('[Sync] Full sync error:', e);
    return 'error';
  }
}

// ===== Realtime Listener =====
let realtimeUnsub: Unsubscribe | null = null;

export function startRealtimeSync(onUpdate?: () => void): void {
  stopRealtimeSync();
  if (!isFirebaseReady() || !currentUser) return;
  const db = getDb();
  if (!db) return;

  if (onUpdate) _syncCallbacks.push(onUpdate);

  const docRef = doc(db, 'users', currentUser.uid);
  let isFirst = true;

  realtimeUnsub = onSnapshot(docRef, (snapshot) => {
    // Skip first snapshot (it's our own data)
    if (isFirst) { isFirst = false; return; }
    if (!snapshot.exists()) return;

    const cloudData = snapshot.data();
    const cloudDeviceId = cloudData['_deviceId'];
    const myDeviceId = getDeviceId();

    // Own device → ignore
    if (cloudDeviceId === myDeviceId) return;

    const cloudTimestamp = cloudData['_localTimestamp'] || 0;
    const localTimestamp = getLocalModTime();

    if (cloudTimestamp > localTimestamp) {
      console.log('[Sync] Realtime: remote update detected');
      setLocalData(cloudData);
      setLastSyncTime();
      notifyDataChange();
    }
  }, (error) => {
    console.error('[Sync] Realtime error:', error);
  });

  console.log('[Sync] Realtime listener started');
}

export function stopRealtimeSync(): void {
  if (realtimeUnsub) { realtimeUnsub(); realtimeUnsub = null; }
}

export function isRealtimeActive(): boolean { return !!realtimeUnsub; }

// ===== Auto-Upload Proxy =====
let storageProxy = false;
let _originalSetItem: ((key: string, value: string) => void) | null = null;

export function enableAutoUpload(): void {
  if (storageProxy) return;
  storageProxy = true;

  _originalSetItem = localStorage.setItem.bind(localStorage);
  const origSet = _originalSetItem;

  localStorage.setItem = function (key: string, value: string) {
    origSet(key, value);
    if (_isApplyingRemote) return;

    const ignoreKeys = ['sync_last', 'device_id', 'dark_mode', 'pin_code', 'auto_sync', '_localSyncCheck', '_dataModifiedAt', 'customer_photos', 'pwa_banner_dismissed', 'realtime_sync'];
    if (ignoreKeys.includes(key)) return;

    if ((COLLECTIONS as readonly string[]).includes(key)) {
      scheduleUpload();
    }
  };
}

export function disableAutoUpload(): void {
  if (_originalSetItem) {
    localStorage.setItem = _originalSetItem;
    _originalSetItem = null;
  }
  storageProxy = false;
}

// ===== Auto Sync (Interval fallback) =====
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(intervalMs = 5 * 60 * 1000): void {
  stopAutoSync();
  syncInterval = setInterval(() => {
    if (navigator.onLine && currentUser) {
      fullSync().then(s => console.log('[Sync] Periodic:', s));
    }
  }, intervalMs);
}

export function stopAutoSync(): void {
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
}

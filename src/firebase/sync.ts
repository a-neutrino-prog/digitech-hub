import {
  doc, getDoc, onSnapshot, writeBatch,
  serverTimestamp, type Unsubscribe,
} from 'firebase/firestore';
import {
  signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, onAuthStateChanged, type User,
} from 'firebase/auth';
import { getDb, getFirebaseAuth, isFirebaseReady, initFirebase } from './init';
import { isFirebaseConfigured } from './config';

// ===== Types =====
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'not-configured' | 'realtime';
const COLLECTIONS = ['customers', 'services', 'jobs', 'transactions', 'shopInfo', 'notifications', 'reminders'] as const;

let currentUser: User | null = null;
let _syncCallbacks: (() => void)[] = [];
let _isApplyingRemote = false;
let _originalSetItem: ((key: string, value: string) => void) | null = null;

export function getCurrentUser(): User | null { return currentUser; }

// ===== GLOBAL INIT =====
export function initSync(onDataChange: () => void): () => void {
  if (!isFirebaseConfigured()) return () => {};
  initFirebase();
  _syncCallbacks.push(onDataChange);

  const unsub = onAuthStateChanged(getFirebaseAuth()!, (user) => {
    currentUser = user;
    if (user) {
      if (localStorage.getItem('realtime_sync') === 'true') { startRealtimeSync(); enableAutoUpload(); }
      if (localStorage.getItem('auto_sync') === 'true') startAutoSync();
      fullSync().then(s => console.log('[Sync] Init:', s));
    }
  });
  return () => { unsub(); _syncCallbacks = _syncCallbacks.filter(cb => cb !== onDataChange); };
}

function notifyDataChange() { _syncCallbacks.forEach(cb => cb()); }

// ===== Auth =====
export function listenAuth(cb: (u: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, u => { currentUser = u; cb(u); });
}
export async function signInAnon(): Promise<User | null> {
  const auth = getFirebaseAuth(); if (!auth) return null;
  try { const r = await signInAnonymously(auth); currentUser = r.user; return r.user; } catch (e) { console.error('[Sync]', e); return null; }
}
export async function signInEmail(email: string, pw: string): Promise<{ user: User | null; error: string | null }> {
  const auth = getFirebaseAuth(); if (!auth) return { user: null, error: 'Not configured' };
  try { const r = await signInWithEmailAndPassword(auth, email, pw); currentUser = r.user; return { user: r.user, error: null }; }
  catch (e: any) {
    if (e.code === 'auth/user-not-found') return { user: null, error: 'অ্যাকাউন্ট নেই' };
    if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') return { user: null, error: 'ভুল পাসওয়ার্ড' };
    return { user: null, error: e.message };
  }
}
export async function registerEmail(email: string, pw: string): Promise<{ user: User | null; error: string | null }> {
  const auth = getFirebaseAuth(); if (!auth) return { user: null, error: 'Not configured' };
  try { const r = await createUserWithEmailAndPassword(auth, email, pw); currentUser = r.user; return { user: r.user, error: null }; }
  catch (e: any) {
    if (e.code === 'auth/email-already-in-use') return { user: null, error: 'ইমেইল ব্যবহৃত' };
    if (e.code === 'auth/weak-password') return { user: null, error: 'পাসওয়ার্ড ৬+ অক্ষর' };
    return { user: null, error: e.message };
  }
}
export async function signInWithGoogle(): Promise<{ user: User | null; error: string | null }> {
  const auth = getFirebaseAuth(); if (!auth) return { user: null, error: 'Not configured' };
  try { const r = await signInWithPopup(auth, new GoogleAuthProvider()); currentUser = r.user; return { user: r.user, error: null }; }
  catch (e: any) { return { user: null, error: e.message }; }
}
export async function signOut(): Promise<void> {
  stopRealtimeSync(); stopAutoSync(); disableAutoUpload();
  const auth = getFirebaseAuth(); if (!auth) return;
  await fbSignOut(auth); currentUser = null;
  ['sync_last', 'realtime_sync', 'auto_sync', '_localSyncCheck', '_dataModifiedAt'].forEach(k => localStorage.removeItem(k));
}

// ===== Subcollection Sync Architecture =====
// প্রতিটি collection আলাদা Firestore subcollection-এ sync হয়:
//   users/{uid}/data/{collectionName} → { items: [...], updatedAt: timestamp }
// এতে 1MB limit hit হবে না, এবং incremental sync সম্ভব

function getDeviceId(): string {
  let id = localStorage.getItem('device_id');
  if (!id) { id = 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2); localStorage.setItem('device_id', id); }
  return id;
}

function getLocalModTime(): number { return parseInt(localStorage.getItem('_dataModifiedAt') || '0'); }
export function markDataModified(): void { localStorage.setItem('_dataModifiedAt', Date.now().toString()); }
export function getLastSyncTime(): number { return parseInt(localStorage.getItem('sync_last') || '0'); }
function setLastSyncTime(): void { localStorage.setItem('sync_last', Date.now().toString()); }

// Safe localStorage write (bypasses proxy)
function safeSetItem(key: string, value: string) {
  if (_originalSetItem) _originalSetItem(key, value);
  else localStorage.setItem(key, value);
}

// ===== Upload — Per-collection =====
let uploadTimer: ReturnType<typeof setTimeout> | null = null;

export async function uploadToCloud(): Promise<boolean> {
  if (_isApplyingRemote || !isFirebaseReady() || !currentUser) return false;
  const db = getDb(); if (!db) return false;

  try {
    const uid = currentUser.uid;
    const batch = writeBatch(db);
    const timestamp = Date.now();

    // Upload each collection as separate subcollection doc
    COLLECTIONS.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw) {
        const docRef = doc(db, 'users', uid, 'data', key);
        batch.set(docRef, {
          items: raw, // JSON string
          updatedAt: timestamp,
          deviceId: getDeviceId(),
        });
      }
    });

    // Meta document — last sync info
    const metaRef = doc(db, 'users', uid);
    batch.set(metaRef, {
      lastSync: serverTimestamp(),
      deviceId: getDeviceId(),
      timestamp,
    }, { merge: true });

    await batch.commit();
    setLastSyncTime();
    console.log('[Sync] Uploaded all collections');
    return true;
  } catch (e) {
    console.error('[Sync] Upload error:', e);
    return false;
  }
}

export function scheduleUpload(): void {
  if (_isApplyingRemote) return;
  markDataModified();
  if (uploadTimer) clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => {
    if (navigator.onLine && currentUser) uploadToCloud().then(ok => { if (ok) console.log('[Sync] Auto-uploaded'); });
  }, 2000);
}

// ===== Download — Per-collection =====
export async function downloadFromCloud(): Promise<boolean> {
  if (!isFirebaseReady() || !currentUser) return false;
  const db = getDb(); if (!db) return false;

  try {
    const uid = currentUser.uid;
    _isApplyingRemote = true;

    for (const key of COLLECTIONS) {
      const docRef = doc(db, 'users', uid, 'data', key);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        safeSetItem(key, data.items);
      }
    }

    setLastSyncTime();
    _isApplyingRemote = false;
    notifyDataChange();
    console.log('[Sync] Downloaded all collections');
    return true;
  } catch (e) {
    console.error('[Sync] Download error:', e);
    _isApplyingRemote = false;
    return false;
  }
}

// ===== Full Sync — Incremental per-collection =====
export async function fullSync(): Promise<SyncStatus> {
  if (!isFirebaseConfigured()) return 'not-configured';
  if (!navigator.onLine) return 'offline';
  if (!isFirebaseReady() || !currentUser) return 'error';
  const db = getDb(); if (!db) return 'error';

  try {
    const uid = currentUser.uid;
    const localTime = getLocalModTime();
    let cloudNewer = false;

    const metaSnap = await getDoc(doc(db, 'users', uid));
    if (metaSnap.exists()) {
      const cloudTime = metaSnap.data().timestamp || 0;
      if (cloudTime > localTime) cloudNewer = true;
    }

    if (cloudNewer) {
      console.log('[Sync] Cloud newer, downloading...');
      await downloadFromCloud();
      return 'success';
    }

    // Local newer or first sync → upload
    console.log('[Sync] Local newer, uploading...');
    if (!localTime) markDataModified();
    await uploadToCloud();
    return 'success';
  } catch (e) {
    console.error('[Sync] Full sync error:', e);
    return 'error';
  }
}

// ===== Realtime Listener — Listen to meta doc for changes =====
let realtimeUnsub: Unsubscribe | null = null;

export function startRealtimeSync(onUpdate?: () => void): void {
  stopRealtimeSync();
  if (!isFirebaseReady() || !currentUser) return;
  const db = getDb(); if (!db) return;

  if (onUpdate) _syncCallbacks.push(onUpdate);
  const metaRef = doc(db, 'users', currentUser.uid);
  let isFirst = true;

  realtimeUnsub = onSnapshot(metaRef, async (snap) => {
    if (isFirst) { isFirst = false; return; }
    if (!snap.exists()) return;

    const data = snap.data();
    if (data.deviceId === getDeviceId()) return; // Own update

    const cloudTime = data.timestamp || 0;
    const localTime = getLocalModTime();

    if (cloudTime > localTime) {
      console.log('[Sync] Realtime: remote change detected, downloading...');
      await downloadFromCloud();
    }
  }, err => console.error('[Sync] Realtime error:', err));

  console.log('[Sync] Realtime listener started');
}

export function stopRealtimeSync(): void { if (realtimeUnsub) { realtimeUnsub(); realtimeUnsub = null; } }
export function isRealtimeActive(): boolean { return !!realtimeUnsub; }

// ===== Auto-Upload Proxy =====
let storageProxy = false;

export function enableAutoUpload(): void {
  if (storageProxy) return;
  storageProxy = true;
  _originalSetItem = localStorage.setItem.bind(localStorage);
  const orig = _originalSetItem;

  localStorage.setItem = function (key: string, value: string) {
    orig(key, value);
    if (_isApplyingRemote) return;
    const ignore = ['sync_last', 'device_id', 'dark_mode', 'pin_code', 'auto_sync', '_localSyncCheck', '_dataModifiedAt', 'customer_photos', 'pwa_banner_dismissed', 'realtime_sync', 'onboarding_done'];
    if (ignore.includes(key)) return;
    if ((COLLECTIONS as readonly string[]).includes(key)) scheduleUpload();
  };
}

export function disableAutoUpload(): void {
  if (_originalSetItem) { localStorage.setItem = _originalSetItem; _originalSetItem = null; }
  storageProxy = false;
}

// ===== Auto Sync Interval =====
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(ms = 5 * 60 * 1000): void {
  stopAutoSync();
  syncInterval = setInterval(() => {
    if (navigator.onLine && currentUser) fullSync().then(s => console.log('[Sync] Periodic:', s));
  }, ms);
}

export function stopAutoSync(): void { if (syncInterval) { clearInterval(syncInterval); syncInterval = null; } }

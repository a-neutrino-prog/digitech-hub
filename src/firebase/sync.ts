import {
  doc, setDoc, getDoc, onSnapshot, serverTimestamp, type Unsubscribe,
} from 'firebase/firestore';
import {
  signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, onAuthStateChanged, type User,
} from 'firebase/auth';
import { getDb, getFirebaseAuth, isFirebaseReady, initFirebase } from './init';
import { isFirebaseConfigured } from './config';

// ═══════════════════════════════════════════
// SIMPLIFIED SYNC ENGINE v3
// Single document approach for reliability
// ═══════════════════════════════════════════

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'not-configured' | 'realtime';
const DATA_KEYS = ['customers', 'services', 'jobs', 'transactions', 'shopInfo', 'notifications', 'reminders'] as const;

let currentUser: User | null = null;
let _callbacks: (() => void)[] = [];
let _applying = false;  // downloading from cloud, block upload
let _lastDownload = 0;  // timestamp of last download, block re-upload
let _origSetItem: ((k: string, v: string) => void) | null = null;
let _proxyOn = false;

export function getCurrentUser(): User | null { return currentUser; }

// ═══ Safe localStorage (bypass proxy) ═══
function _safe(key: string, val: string) {
  if (_origSetItem) _origSetItem(key, val);
  else localStorage.setItem(key, val);
}

function _getTs(): number { return parseInt(localStorage.getItem('_syncTs') || '0'); }
function _setTs(ts: number) { _safe('_syncTs', ts.toString()); }

export function getLastSyncTime(): number { return parseInt(localStorage.getItem('sync_last') || '0'); }
function _setSyncTime() { _safe('sync_last', Date.now().toString()); }

function _deviceId(): string {
  let id = localStorage.getItem('device_id');
  if (!id) { id = 'D' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('device_id', id); }
  return id;
}

export function markDataModified() { _safe('_syncTs', Date.now().toString()); }

// ═══ INIT ═══
export function initSync(onChange: () => void): () => void {
  if (!isFirebaseConfigured()) return () => {};
  initFirebase();
  _callbacks.push(onChange);

  const unsub = onAuthStateChanged(getFirebaseAuth()!, user => {
    currentUser = user;
    if (user) {
      enableAutoUpload();
      if (localStorage.getItem('realtime_sync') === 'true') startRealtimeSync();
      if (localStorage.getItem('auto_sync') === 'true') startAutoSync();
      fullSync().then(s => console.log('[Sync] Init:', s));
    }
  });

  return () => { unsub(); _callbacks = _callbacks.filter(c => c !== onChange); };
}

function _notify() { _callbacks.forEach(cb => { try { cb(); } catch {} }); }

// ═══ Auth ═══
export function listenAuth(cb: (u: User | null) => void): () => void {
  const a = getFirebaseAuth(); if (!a) { cb(null); return () => {}; }
  return onAuthStateChanged(a, u => { currentUser = u; cb(u); });
}
export async function signInAnon(): Promise<User | null> {
  const a = getFirebaseAuth(); if (!a) return null;
  try { const r = await signInAnonymously(a); currentUser = r.user; return r.user; } catch (e) { console.error('[Sync]', e); return null; }
}
export async function signInEmail(email: string, pw: string): Promise<{ user: User | null; error: string | null }> {
  const a = getFirebaseAuth(); if (!a) return { user: null, error: 'Not configured' };
  try { const r = await signInWithEmailAndPassword(a, email, pw); currentUser = r.user; return { user: r.user, error: null }; }
  catch (e: any) {
    if (e.code === 'auth/user-not-found') return { user: null, error: 'অ্যাকাউন্ট নেই' };
    if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') return { user: null, error: 'ভুল পাসওয়ার্ড' };
    return { user: null, error: e.message };
  }
}
export async function registerEmail(email: string, pw: string): Promise<{ user: User | null; error: string | null }> {
  const a = getFirebaseAuth(); if (!a) return { user: null, error: 'Not configured' };
  try { const r = await createUserWithEmailAndPassword(a, email, pw); currentUser = r.user; return { user: r.user, error: null }; }
  catch (e: any) {
    if (e.code === 'auth/email-already-in-use') return { user: null, error: 'ইমেইল ব্যবহৃত' };
    if (e.code === 'auth/weak-password') return { user: null, error: 'পাসওয়ার্ড ৬+ অক্ষর' };
    return { user: null, error: e.message };
  }
}
export async function signInWithGoogle(): Promise<{ user: User | null; error: string | null }> {
  const a = getFirebaseAuth(); if (!a) return { user: null, error: 'Not configured' };
  try { const r = await signInWithPopup(a, new GoogleAuthProvider()); currentUser = r.user; return { user: r.user, error: null }; }
  catch (e: any) { return { user: null, error: e.message }; }
}
export async function signOut(): Promise<void> {
  stopRealtimeSync(); stopAutoSync(); disableAutoUpload();
  const a = getFirebaseAuth(); if (a) await fbSignOut(a);
  currentUser = null;
  ['sync_last', 'realtime_sync', 'auto_sync', '_syncTs'].forEach(k => localStorage.removeItem(k));
}

// ═══════════════════════════════════════════
// UPLOAD — All data to single doc per collection
// ═══════════════════════════════════════════
let _uploadTimer: ReturnType<typeof setTimeout> | null = null;

export async function uploadToCloud(): Promise<boolean> {
  if (_applying) return true;
  if (Date.now() - _lastDownload < 8000) { console.log('[Sync] Upload blocked — recent download'); return true; }
  if (!isFirebaseReady() || !currentUser) return false;
  const db = getDb(); if (!db) return false;

  try {
    const uid = currentUser.uid;
    const ts = Date.now();

    // Collect ALL data
    const payload: Record<string, string> = {};
    for (const key of DATA_KEYS) {
      payload[key] = localStorage.getItem(key) || '[]';
    }
    // shopInfo is object not array
    if (!payload.shopInfo || payload.shopInfo === '[]') {
      payload.shopInfo = '{}';
    }

    // Write to Firestore — simple single document
    await setDoc(doc(db, 'userData', uid), {
      ...payload,
      _ts: ts,
      _device: _deviceId(),
      _updated: serverTimestamp(),
    });

    _setTs(ts);
    _setSyncTime();
    console.log('[Sync] ✅ Uploaded ALL data, ts:', ts);
    return true;
  } catch (e) {
    console.error('[Sync] Upload error:', e);
    return false;
  }
}

export function scheduleUpload() {
  if (_applying || Date.now() - _lastDownload < 8000) return;
  markDataModified();
  if (_uploadTimer) clearTimeout(_uploadTimer);
  _uploadTimer = setTimeout(() => {
    if (navigator.onLine && currentUser && !_applying && Date.now() - _lastDownload >= 8000) {
      uploadToCloud();
    }
  }, 3000);
}

// ═══════════════════════════════════════════
// DOWNLOAD — Read ALL data from cloud
// ═══════════════════════════════════════════
export async function downloadFromCloud(): Promise<boolean> {
  if (!isFirebaseReady() || !currentUser) return false;
  const db = getDb(); if (!db) return false;

  try {
    const uid = currentUser.uid;
    _applying = true;

    const snap = await getDoc(doc(db, 'userData', uid));
    if (!snap.exists()) { _applying = false; return false; }

    const cloud = snap.data();
    const cloudTs = cloud._ts || 0;

    // Write each collection to localStorage
    for (const key of DATA_KEYS) {
      if (cloud[key]) {
        _safe(key, cloud[key]);
      }
    }

    _setTs(cloudTs);
    _setSyncTime();
    _lastDownload = Date.now();
    _applying = false;
    _notify();
    console.log('[Sync] ✅ Downloaded ALL data, cloudTs:', cloudTs);
    return true;
  } catch (e) {
    console.error('[Sync] Download error:', e);
    _applying = false;
    return false;
  }
}

// ═══════════════════════════════════════════
// FULL SYNC — Compare & decide
// ═══════════════════════════════════════════
export async function fullSync(): Promise<SyncStatus> {
  if (!isFirebaseConfigured()) return 'not-configured';
  if (!navigator.onLine) return 'offline';
  if (!isFirebaseReady() || !currentUser) return 'error';
  const db = getDb(); if (!db) return 'error';

  try {
    const uid = currentUser.uid;
    const localTs = _getTs();

    const snap = await getDoc(doc(db, 'userData', uid));

    if (snap.exists()) {
      const cloudTs = snap.data()._ts || 0;
      console.log('[Sync] local:', localTs, 'cloud:', cloudTs);

      if (cloudTs > localTs) {
        await downloadFromCloud();
        return 'success';
      }
      if (cloudTs === localTs) {
        _setSyncTime();
        return 'success';
      }
    }

    // Local newer or no cloud
    if (!localTs) markDataModified();
    await uploadToCloud();
    return 'success';
  } catch (e) {
    console.error('[Sync] Error:', e);
    return 'error';
  }
}

// ═══════════════════════════════════════════
// REALTIME — Listen for remote changes
// ═══════════════════════════════════════════
let _rtUnsub: Unsubscribe | null = null;

export function startRealtimeSync(onUpdate?: () => void): void {
  stopRealtimeSync();
  if (!isFirebaseReady() || !currentUser) return;
  const db = getDb(); if (!db) return;
  if (onUpdate) _callbacks.push(onUpdate);

  const ref = doc(db, 'userData', currentUser.uid);

  _rtUnsub = onSnapshot(ref, async snap => {
    if (!snap.exists()) return;
    const d = snap.data();

    // Own device → ignore
    if (d._device === _deviceId()) return;

    const cloudTs = d._ts || 0;
    const localTs = _getTs();

    if (cloudTs > localTs) {
      console.log('[Sync] 🔔 Realtime: remote update detected');
      await downloadFromCloud();
    }
  }, e => console.error('[Sync] Realtime error:', e));

  console.log('[Sync] Realtime listener ON');
}

export function stopRealtimeSync() { if (_rtUnsub) { _rtUnsub(); _rtUnsub = null; } }
export function isRealtimeActive(): boolean { return !!_rtUnsub; }

// ═══════════════════════════════════════════
// AUTO-UPLOAD PROXY
// ═══════════════════════════════════════════
export function enableAutoUpload() {
  if (_proxyOn) return;
  _proxyOn = true;
  _origSetItem = localStorage.setItem.bind(localStorage);
  const orig = _origSetItem;

  localStorage.setItem = function (key: string, value: string) {
    orig(key, value);
    if (_applying) return;
    if (Date.now() - _lastDownload < 8000) return;

    const skip = ['sync_last', 'device_id', 'dark_mode', 'pin_code', 'auto_sync',
      '_syncTs', '_localSyncCheck', '_dataModifiedAt', 'customer_photos',
      'pwa_banner_dismissed', 'realtime_sync', 'onboarding_done',
      'pin_lockout', 'pin_attempts', 'error_logs'];
    if (skip.includes(key)) return;

    if ((DATA_KEYS as readonly string[]).includes(key)) {
      scheduleUpload();
    }
  };
}

export function disableAutoUpload() {
  if (_origSetItem) { localStorage.setItem = _origSetItem; _origSetItem = null; }
  _proxyOn = false;
}

// ═══════════════════════════════════════════
// AUTO SYNC INTERVAL
// ═══════════════════════════════════════════
let _interval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(ms = 5 * 60 * 1000) {
  stopAutoSync();
  _interval = setInterval(() => {
    if (navigator.onLine && currentUser) fullSync().then(s => console.log('[Sync] Periodic:', s));
  }, ms);
}

export function stopAutoSync() { if (_interval) { clearInterval(_interval); _interval = null; } }

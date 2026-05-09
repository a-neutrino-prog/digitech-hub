import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from './config';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export function initFirebase() {
  if (!isFirebaseConfigured()) return;
  if (app) return;

  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (e) {
    console.error('[Firebase] Init error:', e);
  }
}

export function getDb(): Firestore | null {
  if (!db) initFirebase();
  return db;
}

export function getFirebaseAuth(): Auth | null {
  if (!auth) initFirebase();
  return auth;
}

export function isFirebaseReady(): boolean {
  return !!app && !!db;
}

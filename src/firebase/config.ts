// Firebase Configuration
// ২টি উপায়ে কনফিগার করা যায়:
//
// ১. Environment Variables (Vercel-এ রিকমেন্ডেড):
//    - Vercel Dashboard → Settings → Environment Variables
//    - অথবা লোকালে .env.local ফাইল তৈরি করে দিন
//
// ২. সরাসরি নিচে ভ্যালু দিন (শুধু টেস্টিং-এর জন্য):

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Firebase কনফিগ আছে কিনা চেক
export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

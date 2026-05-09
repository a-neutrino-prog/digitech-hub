# 📱 ডিজিটেক হাব (DigiTech Hub)

গ্রামীণ বাংলাদেশের ছোট ব্যবসায়ীদের জন্য ওয়েব-ভিত্তিক ব্যবসায়িক ম্যানেজমেন্ট টুল।

## ✨ ফিচার
- 📊 ড্যাশবোর্ড (আয়/ব্যয়/বাকি/কাজ)
- 📋 জব ম্যানেজমেন্ট
- 👤 কাস্টমার ম্যানেজমেন্ট
- 💰 হিসাব-নিকাশ
- 📈 রিপোর্ট ও চার্ট
- ⏰ রিমাইন্ডার
- 📅 ক্যালেন্ডার ভিউ
- 🧾 PDF রসিদ
- ☁️ Firebase ক্লাউড সিঙ্ক (রিয়েলটাইম)
- 📱 PWA + অফলাইন সাপোর্ট
- 🔐 PIN লক
- 🌙 ডার্ক মোড

## 🚀 Vercel-এ ডিপ্লয়

### ধাপ ১: GitHub-এ পুশ

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/digitech-hub.git
git push -u origin main
```

### ধাপ ২: Vercel-এ কানেক্ট

1. [vercel.com](https://vercel.com) এ যান
2. **"New Project"** ক্লিক করুন
3. GitHub রিপোজিটরি সিলেক্ট করুন
4. ফ্রেমওয়ার্ক: **Vite** (অটো ডিটেক্ট হবে)
5. **"Deploy"** ক্লিক করুন

> ব্যস! অটোমেটিক্যালি ডিপ্লয় হয়ে যাবে। প্রতিবার `git push` করলে নতুন ডিপ্লয় হবে।

### ধাপ ৩: Firebase সেটআপ (ঐচ্ছিক - ক্লাউড সিঙ্ক-এর জন্য)

1. [Firebase Console](https://console.firebase.google.com) এ নতুন প্রজেক্ট তৈরি
2. **Authentication** → Sign-in method → **Anonymous** ও **Email/Password** চালু করুন
3. **Firestore Database** তৈরি করুন (Start in test mode)
4. **Project Settings** → General → Your apps → **Web app** → Config কপি করুন
5. Vercel Dashboard → **Settings** → **Environment Variables** এ যোগ করুন:

| Variable | Value |
|----------|-------|
| `VITE_FIREBASE_API_KEY` | আপনার API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | আপনার Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | আপনার Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | আপনার Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | আপনার Sender ID |
| `VITE_FIREBASE_APP_ID` | আপনার App ID |

6. Vercel-এ **Redeploy** করুন (Settings → Deployments → latest → ⋮ → Redeploy)

### Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🛠️ লোকাল ডেভেলপমেন্ট

```bash
# ডিপেন্ডেন্সি ইনস্টল
npm install

# ডেভ সার্ভার চালু
npm run dev

# বিল্ড
npm run build

# প্রিভিউ
npm run preview
```

### লোকাল Firebase সেটআপ

```bash
# .env.local ফাইল তৈরি করুন
cp .env.example .env.local
# .env.local ফাইলে Firebase credentials দিন
```

## 📁 প্রজেক্ট স্ট্রাকচার

```
├── public/
│   ├── manifest.json     # PWA manifest
│   └── sw.js             # Service Worker
├── src/
│   ├── components/       # UI কম্পোনেন্ট
│   │   ├── layout/       # Responsive layout
│   │   └── ...
│   ├── firebase/         # Firebase config ও sync
│   ├── hooks/            # Custom hooks
│   ├── utils/            # PDF generation etc.
│   ├── store.ts          # Data store (localStorage)
│   ├── App.tsx           # Main app
│   └── main.tsx          # Entry point
├── vercel.json           # Vercel config
├── .env.example          # Environment variables template
└── README.md
```

## 📄 লাইসেন্স

MIT

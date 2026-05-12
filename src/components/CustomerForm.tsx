import { useState, useRef } from 'react';
import { addCustomer, updateCustomer, getCustomers, setCustomerPhoto, getCustomerPhoto } from '../store';
import { useToast } from '../hooks/useToast';
import { cleanText, isValidMobile, isValidNID } from '../utils/sanitize';
import type { Page } from '../App';
import { ArrowLeft, Save, User, Camera, X } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
  refresh: () => void;
  editId?: string;
}

export default function CustomerForm({ navigate, refresh, editId }: Props) {
  const existingCustomer = editId ? getCustomers().find(c => c.id === editId) : null;

  const [name, setName] = useState(existingCustomer?.name || '');
  const [mobile, setMobile] = useState(existingCustomer?.mobile || '');
  const [address, setAddress] = useState(existingCustomer?.address || '');
  const [nid, setNid] = useState(existingCustomer?.nid || '');
  const [isRegular, setIsRegular] = useState(existingCustomer?.isRegular || false);
  const [photo, setPhoto] = useState<string | null>(editId ? getCustomerPhoto(editId) : null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File size check (max 5MB raw)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ছবি ৫MB এর ছোট হতে হবে');
      return;
    }

    // Resize to 120px and compress to ~5-15KB
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 120; // Small thumbnail
        let w = img.width, h = img.height;
        if (w > h) { h = h * MAX / w; w = MAX; }
        else { w = w * MAX / h; h = MAX; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL('image/jpeg', 0.5); // Low quality = small size

        // Check final size (max 50KB base64)
        if (base64.length > 50000) {
          // Re-compress smaller
          const canvas2 = document.createElement('canvas');
          canvas2.width = 80; canvas2.height = 80;
          const ctx2 = canvas2.getContext('2d');
          ctx2?.drawImage(img, 0, 0, 80, 80);
          setPhoto(canvas2.toDataURL('image/jpeg', 0.3));
        } else {
          setPhoto(base64);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const cleanName = cleanText(name);
    const cleanMobile = mobile.trim();
    const cleanAddress = cleanText(address);
    const cleanNid = nid.trim();

    if (!cleanName) { toast.error('গ্রাহকের নাম লিখুন'); return; }
    if (!cleanMobile) { toast.error('মোবাইল নম্বর লিখুন'); return; }
    if (!isValidMobile(cleanMobile)) { toast.error('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)'); return; }
    if (cleanNid && !isValidNID(cleanNid)) { toast.error('NID শুধু সংখ্যা হবে (১০ বা ১৭ ডিজিট)'); return; }

    const customers = getCustomers();
    const duplicate = customers.find(c => c.mobile === cleanMobile && c.id !== editId);
    if (duplicate) { toast.error('এই মোবাইল নম্বর ইতিমধ্যে আছে!'); return; }

    if (editId) {
      updateCustomer(editId, { name: cleanName, mobile: cleanMobile, address: cleanAddress, nid: cleanNid, isRegular });
      if (photo) setCustomerPhoto(editId, photo);
      toast.success('গ্রাহক আপডেট হয়েছে');
    } else {
      const newCustomer = addCustomer({ name: cleanName, mobile: cleanMobile, address: cleanAddress, nid: cleanNid, isRegular });
      if (photo) setCustomerPhoto(newCustomer.id, photo);
      toast.success('গ্রাহক যোগ হয়েছে');
    }

    refresh();
    navigate('customers');
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('customers')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-800">
          {editId ? 'গ্রাহক এডিট' : 'নতুন গ্রাহক যোগ'}
        </h2>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Avatar with Photo Upload */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg overflow-hidden">
              {photo ? (
                <img src={photo} alt="Photo" className="w-full h-full object-cover" />
              ) : name ? (
                <span className="text-4xl font-bold text-white">{name.charAt(0)}</span>
              ) : (
                <User size={36} className="text-white" />
              )}
            </div>
            {/* Camera Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-md border-2 border-white hover:bg-primary-dark transition-colors"
            >
              <Camera size={16} />
            </button>
            {/* Remove Photo */}
            {photo && (
              <button
                onClick={() => setPhoto(null)}
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md"
              >
                <X size={12} />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
        </div>
        <p className="text-center text-xs text-gray-400">ছবি যোগ করতে ক্যামেরা আইকনে ক্লিক করুন</p>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">নাম *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="গ্রাহকের পূর্ণ নাম"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">মোবাইল নম্বর *</label>
            <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">ঠিকানা</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="গ্রাম, পোস্ট, উপজেলা"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">NID নম্বর</label>
            <input type="text" value={nid} onChange={e => setNid(e.target.value)}
              placeholder="জাতীয় পরিচয়পত্র নম্বর"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsRegular(!isRegular)}
              className={`w-12 h-6 rounded-full transition-all relative ${isRegular ? 'bg-primary' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${isRegular ? 'left-6' : 'left-0.5'}`} />
            </button>
            <span className="text-sm text-gray-700">নিয়মিত গ্রাহক ⭐</span>
          </div>
        </div>

        {/* Save Button */}
        <button onClick={handleSave}
          className="w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-sm shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
          <Save size={18} />
          {editId ? 'আপডেট করুন' : 'গ্রাহক সেভ করুন'}
        </button>
      </div>
    </div>
  );
}

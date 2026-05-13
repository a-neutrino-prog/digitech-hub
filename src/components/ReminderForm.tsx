import { useState } from 'react';
import { addReminder, updateReminder, getReminders, getCustomers } from '../store';
import { useToast } from '../hooks/useToast';
import type { Page } from '../App';
import { ArrowLeft, Save, Calendar, Clock } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
  refresh: () => void;
  editId?: string;
}

const TYPES = [
  { value: 'general', icon: '📝', label: 'সাধারণ' },
  { value: 'payment', icon: '💰', label: 'পেমেন্ট' },
  { value: 'bill', icon: '📄', label: 'বিল' },
  { value: 'customer', icon: '👤', label: 'গ্রাহক' },
];

const PRESETS = [
  { title: 'দোকান ভাড়া', type: 'bill' },
  { title: 'বিদ্যুৎ বিল', type: 'bill' },
  { title: 'ইন্টারনেট বিল', type: 'bill' },
  { title: 'কালি/টোনার কিনতে হবে', type: 'general' },
  { title: 'কাগজ কিনতে হবে', type: 'general' },
];

export default function ReminderForm({ navigate, refresh, editId }: Props) {
  const existingReminder = editId ? getReminders().find(r => r.id === editId) : null;
  const customers = getCustomers();
  const { toast } = useToast();

  const [title, setTitle] = useState(existingReminder?.title || '');
  const [description, setDescription] = useState(existingReminder?.description || '');
  const [type, setType] = useState<'general' | 'payment' | 'bill' | 'customer'>(existingReminder?.type || 'general');
  const [date, setDate] = useState(existingReminder ? new Date(existingReminder.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(existingReminder?.time || '09:00');
  const [relatedId, setRelatedId] = useState(existingReminder?.relatedId || '');

  const handleSave = () => {
    if (!title.trim()) { toast.error('শিরোনাম লিখুন'); return; }
    const dateTime = new Date(`${date}T${time}`).getTime();
    const data = { title: title.trim(), description: description.trim(), date: dateTime, time, type, relatedId: relatedId || undefined };

    if (editId) { updateReminder(editId, data); toast.success('রিমাইন্ডার আপডেট হয়েছে'); }
    else { addReminder(data); toast.success('রিমাইন্ডার যোগ হয়েছে'); }
    refresh(); navigate('reminders');
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-200/60 flex items-center gap-3">
        <button onClick={() => navigate('reminders')} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center" aria-label="ফিরে যান">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-800">{editId ? '✏️ রিমাইন্ডার এডিট' : '⏰ নতুন রিমাইন্ডার'}</h2>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Quick Presets */}
        {!editId && (
          <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">⚡ দ্রুত রিমাইন্ডার</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p, i) => (
                <button key={i} onClick={() => { setTitle(p.title); setType(p.type as any); }}
                  className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-xl text-xs font-medium border border-gray-200 hover:bg-primary-50 hover:text-primary hover:border-primary-200 transition-all active:scale-95">
                  {p.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Type */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">📂 ধরন</p>
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value as any)}
                className={`p-3 rounded-2xl text-center transition-all active:scale-95 ${
                  type === t.value ? 'bg-primary text-white shadow-md' : 'bg-gray-50 text-gray-600 border border-gray-200'
                }`}>
                <span className="text-xl block mb-1">{t.icon}</span>
                <span className="text-[10px] font-semibold">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">📝 শিরোনাম *</p>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="যেমন: দোকান ভাড়া দিতে হবে"
            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm form-input-wc" />
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">📄 বিস্তারিত (ঐচ্ছিক)</p>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="অতিরিক্ত তথ্য..."
            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm resize-none h-20 form-input-wc" />
        </div>

        {/* Date & Time */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">📅 তারিখ ও সময়</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block flex items-center gap-1"><Calendar size={10} /> তারিখ</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm form-input-wc" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block flex items-center gap-1"><Clock size={10} /> সময়</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm form-input-wc" />
            </div>
          </div>
        </div>

        {/* Customer (for customer type) */}
        {type === 'customer' && (
          <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">👤 গ্রাহক (ঐচ্ছিক)</p>
            <select value={relatedId} onChange={e => setRelatedId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm form-input-wc">
              <option value="">গ্রাহক নির্বাচন করুন</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.mobile}</option>)}
            </select>
          </div>
        )}

        {/* Save */}
        <button onClick={handleSave}
          className="w-full py-4 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
          style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 8px 24px rgba(37,99,235,0.25)' }}>
          <Save size={18} />
          {editId ? 'আপডেট করুন' : 'রিমাইন্ডার সেভ করুন'}
        </button>
      </div>
    </div>
  );
}

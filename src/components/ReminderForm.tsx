import { useState } from 'react';
import { addReminder, updateReminder, getReminders, getCustomers } from '../store';
import type { Page } from '../App';
import { ArrowLeft, Save, Calendar, Clock } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
  refresh: () => void;
  editId?: string;
}

const REMINDER_TYPES = [
  { value: 'general', label: 'সাধারণ', icon: '📝', color: 'bg-gray-100 text-gray-600' },
  { value: 'payment', label: 'পেমেন্ট', icon: '💰', color: 'bg-green-100 text-green-600' },
  { value: 'bill', label: 'বিল', icon: '📄', color: 'bg-red-100 text-red-600' },
  { value: 'customer', label: 'গ্রাহক', icon: '👤', color: 'bg-blue-100 text-blue-600' },
];

const PRESET_REMINDERS = [
  { title: 'দোকান ভাড়া', type: 'bill' },
  { title: 'বিদ্যুৎ বিল', type: 'bill' },
  { title: 'ইন্টারনেট বিল', type: 'bill' },
  { title: 'কালি/টোনার কিনতে হবে', type: 'general' },
  { title: 'কাগজ কিনতে হবে', type: 'general' },
];

export default function ReminderForm({ navigate, refresh, editId }: Props) {
  const existingReminder = editId ? getReminders().find(r => r.id === editId) : null;
  const customers = getCustomers();

  const [title, setTitle] = useState(existingReminder?.title || '');
  const [description, setDescription] = useState(existingReminder?.description || '');
  const [type, setType] = useState<'general' | 'payment' | 'bill' | 'customer'>(
    existingReminder?.type || 'general'
  );
  const [date, setDate] = useState(
    existingReminder 
      ? new Date(existingReminder.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [time, setTime] = useState(existingReminder?.time || '09:00');
  const [relatedId, setRelatedId] = useState(existingReminder?.relatedId || '');

  const handlePreset = (preset: { title: string; type: string }) => {
    setTitle(preset.title);
    setType(preset.type as any);
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('রিমাইন্ডারের শিরোনাম লিখুন');
      return;
    }

    const dateTime = new Date(`${date}T${time}`).getTime();

    const reminderData = {
      title: title.trim(),
      description: description.trim(),
      date: dateTime,
      time,
      type,
      relatedId: relatedId || undefined,
    };

    if (editId) {
      updateReminder(editId, reminderData);
    } else {
      addReminder(reminderData);
    }

    refresh();
    navigate('reminders');
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('reminders')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-800">
          {editId ? '⏰ রিমাইন্ডার এডিট' : '⏰ নতুন রিমাইন্ডার'}
        </h2>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Preset Reminders */}
        {!editId && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              ⚡ দ্রুত রিমাইন্ডার
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_REMINDERS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => handlePreset(preset)}
                  className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-full text-xs font-medium hover:bg-blue-50 hover:text-blue-600 transition-all"
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Type Selection */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-sm font-semibold text-gray-700 mb-3 block">
            📂 রিমাইন্ডার ধরন
          </label>
          <div className="grid grid-cols-4 gap-2">
            {REMINDER_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setType(t.value as any)}
                className={`p-3 rounded-xl text-center transition-all ${
                  type === t.value
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-gray-50 text-gray-600'
                }`}
              >
                <span className="text-xl block mb-1">{t.icon}</span>
                <span className="text-[10px] font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            📝 শিরোনাম *
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="যেমন: দোকান ভাড়া দিতে হবে"
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            📄 বিস্তারিত (ঐচ্ছিক)
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="অতিরিক্ত তথ্য লিখুন..."
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20"
          />
        </div>

        {/* Date & Time */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-sm font-semibold text-gray-700 mb-3 block">
            📅 তারিখ ও সময়
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
                <Calendar size={12} /> তারিখ
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
                <Clock size={12} /> সময়
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Customer Selection (for customer type) */}
        {type === 'customer' && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              👤 গ্রাহক সিলেক্ট করুন
            </label>
            <select
              value={relatedId}
              onChange={e => setRelatedId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">গ্রাহক নির্বাচন করুন (ঐচ্ছিক)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.mobile}</option>
              ))}
            </select>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-sm shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Save size={18} />
          {editId ? 'আপডেট করুন' : 'রিমাইন্ডার সেভ করুন'}
        </button>
      </div>
    </div>
  );
}

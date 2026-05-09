import { useState, useMemo } from 'react';
import { getReminders, deleteReminder, completeReminder, getCustomerById, formatDate } from '../store';
import type { Page } from '../App';
import { ArrowLeft, Plus, Check, Trash2, Edit, Bell, Calendar, Clock } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

const TYPE_INFO: Record<string, { icon: string; color: string; label: string }> = {
  'general': { icon: '📝', color: 'bg-gray-100', label: 'সাধারণ' },
  'payment': { icon: '💰', color: 'bg-green-100', label: 'পেমেন্ট' },
  'bill': { icon: '📄', color: 'bg-red-100', label: 'বিল' },
  'customer': { icon: '👤', color: 'bg-blue-100', label: 'গ্রাহক' },
};

export default function ReminderList({ navigate }: Props) {
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [refreshKey, setRefreshKey] = useState(0);

  const reminders = useMemo(() => {
    return getReminders().sort((a, b) => {
      // Sort by completion status first, then by date
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.date - b.date;
    });
  }, [refreshKey]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'active': return reminders.filter(r => !r.completed);
      case 'completed': return reminders.filter(r => r.completed);
      default: return reminders;
    }
  }, [reminders, filter]);

  const activeCount = reminders.filter(r => !r.completed).length;
  const completedCount = reminders.filter(r => r.completed).length;

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() + 7);

    filtered.forEach(r => {
      let label: string;
      const rDate = new Date(r.date);
      rDate.setHours(0, 0, 0, 0);

      if (rDate.getTime() < today.getTime()) {
        label = '⚠️ বিলম্বিত';
      } else if (rDate.getTime() === today.getTime()) {
        label = '📅 আজ';
      } else if (rDate.getTime() === tomorrow.getTime()) {
        label = '📆 আগামীকাল';
      } else if (rDate.getTime() < thisWeek.getTime()) {
        label = '📆 এই সপ্তাহে';
      } else {
        label = '📆 পরে';
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(r);
    });

    return groups;
  }, [filtered]);

  const handleComplete = (id: string) => {
    completeReminder(id);
    setRefreshKey(k => k + 1);
  };

  const handleDelete = (id: string) => {
    if (confirm('এই রিমাইন্ডার ডিলিট করতে চান?')) {
      deleteReminder(id);
      setRefreshKey(k => k + 1);
    }
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  const isOverdue = (date: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today.getTime();
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white px-4 pt-4 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('dashboard')} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={() => navigate('reminder-form')}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="text-center">
          <Bell size={32} className="mx-auto mb-2 opacity-80" />
          <h2 className="text-xl font-bold">রিমাইন্ডার</h2>
          <p className="text-purple-200 text-sm mt-1">
            {activeCount > 0 ? `${activeCount}টি সক্রিয় রিমাইন্ডার` : 'কোনো সক্রিয় রিমাইন্ডার নেই'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 -mt-3">
        <div className="bg-white rounded-xl shadow-sm p-1 flex gap-1">
          <button
            onClick={() => setFilter('active')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              filter === 'active' ? 'bg-purple-600 text-white' : 'text-gray-500'
            }`}
          >
            সক্রিয় ({activeCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              filter === 'completed' ? 'bg-purple-600 text-white' : 'text-gray-500'
            }`}
          >
            সম্পন্ন ({completedCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              filter === 'all' ? 'bg-purple-600 text-white' : 'text-gray-500'
            }`}
          >
            সব ({reminders.length})
          </button>
        </div>
      </div>

      {/* Reminder List */}
      <div className="px-4 py-4 space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-2">⏰</div>
            <p className="text-gray-400 text-sm">কোনো রিমাইন্ডার নেই</p>
            <button
              onClick={() => navigate('reminder-form')}
              className="mt-3 text-purple-600 text-sm font-semibold"
            >
              + নতুন রিমাইন্ডার যোগ করুন
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([label, items]) => (
            <div key={label}>
              <h3 className="text-xs font-semibold text-gray-400 mb-2">{label}</h3>
              <div className="space-y-2">
                {items.map(reminder => {
                  const typeInfo = TYPE_INFO[reminder.type];
                  const customer = reminder.relatedId ? getCustomerById(reminder.relatedId) : null;
                  const overdue = !reminder.completed && isOverdue(reminder.date);

                  return (
                    <div
                      key={reminder.id}
                      className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                        reminder.completed ? 'opacity-60' : ''
                      } ${overdue ? 'border-l-4 border-red-500' : ''}`}
                    >
                      <div className="p-3.5">
                        <div className="flex items-start gap-3">
                          {/* Complete button */}
                          <button
                            onClick={() => !reminder.completed && handleComplete(reminder.id)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                              reminder.completed
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 hover:border-purple-500'
                            }`}
                          >
                            {reminder.completed && <Check size={14} />}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm px-1.5 py-0.5 rounded ${typeInfo.color}`}>
                                {typeInfo.icon}
                              </span>
                              <h4 className={`text-sm font-medium ${
                                reminder.completed ? 'line-through text-gray-400' : 'text-gray-800'
                              }`}>
                                {reminder.title}
                              </h4>
                            </div>

                            {reminder.description && (
                              <p className="text-xs text-gray-400 mt-1 truncate">{reminder.description}</p>
                            )}

                            {customer && (
                              <p className="text-xs text-blue-500 mt-1">👤 {customer.name}</p>
                            )}

                            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                              <span className="flex items-center gap-0.5">
                                <Calendar size={10} />
                                {formatDate(reminder.date)}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Clock size={10} />
                                {formatTime(reminder.time)}
                              </span>
                              {overdue && (
                                <span className="text-red-500 font-medium">বিলম্বিত!</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => navigate('reminder-form', { editId: reminder.id })}
                              className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"
                            >
                              <Edit size={12} className="text-blue-500" />
                            </button>
                            <button
                              onClick={() => handleDelete(reminder.id)}
                              className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center"
                            >
                              <Trash2 size={12} className="text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

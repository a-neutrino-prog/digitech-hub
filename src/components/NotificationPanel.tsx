import { useState, useEffect } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, getJobs, getCustomerById, addNotification, formatTaka } from '../store';
import type { Page } from '../App';
import { ArrowLeft, Bell, CheckCheck, Trash2, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'due': <AlertTriangle size={16} className="text-warning" />,
  'job-ready': <CheckCircle size={16} className="text-success" />,
  'reminder': <Clock size={16} className="text-primary" />,
  'info': <Info size={16} className="text-gray-500" />,
};

export default function NotificationPanel({ navigate }: Props) {
  const [notifications, setNotifications] = useState(getNotifications());

  useEffect(() => {
    const jobs = getJobs();
    const dueJobs = jobs.filter(j => j.due > 0 && j.status !== 'cancelled');
    const existing = getNotifications();

    if (existing.length === 0 && dueJobs.length > 0) {
      dueJobs.slice(0, 5).forEach(job => {
        const customer = getCustomerById(job.customerId);
        if (customer) addNotification({ message: `${customer.name}-এর ${formatTaka(job.due)} টাকা বাকি আছে`, type: 'due', relatedId: job.id });
      });
      const pending = jobs.filter(j => j.status === 'pending');
      if (pending.length > 0) addNotification({ message: `${pending.length}টি কাজ পেন্ডিং আছে`, type: 'job-ready' });
      setNotifications(getNotifications());
    }
  }, []);

  const handleMarkAllRead = () => { markAllNotificationsRead(); setNotifications(getNotifications()); };
  const handleDelete = (id: string) => { deleteNotification(id); setNotifications(getNotifications()); };
  const handleRead = (id: string) => { markNotificationRead(id); setNotifications(getNotifications()); };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getTimeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000); const hrs = Math.floor(diff / 3600000); const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'এইমাত্র';
    if (mins < 60) return `${mins} মিনিট আগে`;
    if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
    return `${days} দিন আগে`;
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-200/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('dashboard')} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center" aria-label="ফিরে যান">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Bell size={20} className="text-primary" />
              নোটিফিকেশন
            </h2>
            {unreadCount > 0 && <p className="text-[10px] text-gray-400">{unreadCount}টি অপঠিত</p>}
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-xs text-primary font-semibold flex items-center gap-1 px-3 py-1.5 bg-primary-50 rounded-xl active:scale-95 transition-all">
            <CheckCheck size={14} /> সব পড়া হয়েছে
          </button>
        )}
      </div>

      {/* List */}
      <div className="px-4 py-3 space-y-2">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/60 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-3xl mx-auto mb-3 empty-illustration">🔔</div>
            <p className="text-gray-500 font-medium">কোনো নোটিফিকেশন নেই</p>
            <p className="text-gray-400 text-xs mt-1">নতুন কিছু হলে এখানে দেখাবে</p>
          </div>
        ) : (
          notifications.map((n, i) => (
            <div key={n.id}
              className={`animate-item bg-white rounded-2xl border p-4 card-hover ${!n.read ? 'border-primary/30 border-l-4' : 'border-gray-200/60'}`}
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => handleRead(n.id)}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {ICON_MAP[n.type] || ICON_MAP['info']}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed ${!n.read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{getTimeAgo(n.createdAt)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                  className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0" aria-label="ডিলিট">
                  <Trash2 size={12} className="text-danger" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

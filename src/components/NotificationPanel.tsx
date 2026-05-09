import { useState, useEffect } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, getJobs, getCustomerById, addNotification, formatTaka } from '../store';
import type { Page } from '../App';
import { ArrowLeft, Bell, CheckCheck, Trash2, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

export default function NotificationPanel({ navigate }: Props) {
  const [notifications, setNotifications] = useState(getNotifications());

  // Generate notifications for due amounts on first load
  useEffect(() => {
    const jobs = getJobs();
    const dueJobs = jobs.filter(j => j.due > 0 && j.status !== 'cancelled');
    const existing = getNotifications();

    // Only generate if there are few notifications
    if (existing.length === 0 && dueJobs.length > 0) {
      dueJobs.slice(0, 5).forEach(job => {
        const customer = getCustomerById(job.customerId);
        if (customer) {
          addNotification({
            message: `${customer.name}-এর ${formatTaka(job.due)} টাকা বাকি আছে`,
            type: 'due',
            relatedId: job.id,
          });
        }
      });

      const pendingJobs = jobs.filter(j => j.status === 'pending');
      if (pendingJobs.length > 0) {
        addNotification({
          message: `${pendingJobs.length}টি কাজ পেন্ডিং আছে`,
          type: 'job-ready',
        });
      }

      setNotifications(getNotifications());
    }
  }, []);

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    setNotifications(getNotifications());
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
    setNotifications(getNotifications());
  };

  const handleRead = (id: string) => {
    markNotificationRead(id);
    setNotifications(getNotifications());
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'due': return <AlertTriangle size={16} className="text-orange-500" />;
      case 'job-ready': return <CheckCircle size={16} className="text-green-500" />;
      case 'reminder': return <Clock size={16} className="text-blue-500" />;
      default: return <Info size={16} className="text-gray-500" />;
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'এইমাত্র';
    if (minutes < 60) return `${minutes} মিনিট আগে`;
    if (hours < 24) return `${hours} ঘণ্টা আগে`;
    return `${days} দিন আগে`;
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Bell size={20} className="text-primary" />
            নোটিফিকেশন
          </h2>
        </div>
        {notifications.some(n => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-primary font-medium flex items-center gap-1"
          >
            <CheckCheck size={14} />
            সব পড়া হয়েছে
          </button>
        )}
      </div>

      {/* Notifications */}
      <div className="px-4 py-3 space-y-2">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-2">🔔</div>
            <p className="text-gray-400 text-sm">কোনো নোটিফিকেশন নেই</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`bg-white rounded-xl shadow-sm p-3.5 card-hover ${
                !n.read ? 'border-l-4 border-primary' : ''
              }`}
              onClick={() => handleRead(n.id)}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                    {n.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">{getTimeAgo(n.createdAt)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                  className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0"
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

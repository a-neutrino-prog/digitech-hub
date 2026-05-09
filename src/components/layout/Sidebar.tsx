import { getShopInfo, getUpcomingReminders } from '../../store';
import type { Page } from '../../App';
import { Home, Briefcase, Users, FileText, PieChart, Bell, Settings, Clock, AlertTriangle, Plus, Calendar, Cloud } from 'lucide-react';

interface Props {
  currentPage: Page;
  navigate: (page: Page) => void;
  collapsed?: boolean;
}

const NAV_ITEMS: { id: Page; icon: React.ReactNode; label: string; color: string }[] = [
  { id: 'dashboard', icon: <Home size={20} />, label: 'ড্যাশবোর্ড', color: 'text-blue-500' },
  { id: 'jobs', icon: <Briefcase size={20} />, label: 'কাজ', color: 'text-indigo-500' },
  { id: 'customers', icon: <Users size={20} />, label: 'গ্রাহক', color: 'text-green-500' },
  { id: 'calendar', icon: <Calendar size={20} />, label: 'ক্যালেন্ডার', color: 'text-teal-500' },
  { id: 'transaction-list', icon: <FileText size={20} />, label: 'হিসাব', color: 'text-purple-500' },
  { id: 'reports', icon: <PieChart size={20} />, label: 'রিপোর্ট', color: 'text-cyan-500' },
  { id: 'due-list', icon: <AlertTriangle size={20} />, label: 'বাকি', color: 'text-orange-500' },
  { id: 'reminders', icon: <Clock size={20} />, label: 'রিমাইন্ডার', color: 'text-pink-500' },
];

const QUICK_ACTIONS: { id: Page; icon: React.ReactNode; label: string; color: string }[] = [
  { id: 'job-form', icon: <Briefcase size={16} />, label: 'নতুন কাজ', color: 'bg-blue-500' },
  { id: 'customer-form', icon: <Users size={16} />, label: 'নতুন গ্রাহক', color: 'bg-green-500' },
  { id: 'transaction-form', icon: <FileText size={16} />, label: 'নতুন হিসাব', color: 'bg-purple-500' },
  { id: 'reminder-form', icon: <Clock size={16} />, label: 'রিমাইন্ডার', color: 'bg-pink-500' },
];

export default function Sidebar({ currentPage, navigate, collapsed = false }: Props) {
  const shopInfo = getShopInfo();
  const upcomingReminders = getUpcomingReminders().slice(0, 3);

  return (
    <aside className={`bg-white border-r border-gray-200 h-screen flex flex-col transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo / Shop Name */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white text-lg flex-shrink-0">
            📱
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-gray-800 truncate">
                {shopInfo.shopName || 'ডিজিটেক হাব'}
              </h1>
              <p className="text-[10px] text-gray-400 truncate">ব্যবসায়িক ম্যানেজমেন্ট</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {!collapsed && (
        <div className="p-3 border-b border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase mb-2 px-1">দ্রুত অ্যাকশন</p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => navigate(action.id)}
                className={`${action.color} text-white text-[10px] font-medium py-1.5 px-2 rounded-lg flex items-center gap-1 hover:opacity-90 transition-opacity`}
              >
                {action.icon}
                <span className="truncate">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Collapsed Quick Add */}
      {collapsed && (
        <div className="p-2 border-b border-gray-100">
          <button
            onClick={() => navigate('job-form')}
            className="w-full h-10 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = currentPage === item.id || 
              (item.id === 'jobs' && ['job-form', 'job-detail'].includes(currentPage)) ||
              (item.id === 'customers' && ['customer-form', 'customer-detail'].includes(currentPage)) ||
              (item.id === 'reminders' && currentPage === 'reminder-form');

            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-gray-50'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={isActive ? 'text-primary' : item.color}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                      {item.label}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Upcoming Reminders (collapsed হলে দেখাবে না) */}
      {!collapsed && upcomingReminders.length > 0 && (
        <div className="p-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase mb-2 px-1">আসন্ন রিমাইন্ডার</p>
          <div className="space-y-1.5">
            {upcomingReminders.map(r => (
              <div key={r.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
                <span className="text-sm">
                  {r.type === 'bill' ? '📄' : r.type === 'payment' ? '💰' : '📝'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{r.title}</p>
                  <p className="text-[10px] text-gray-400">{r.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="p-2 border-t border-gray-100 space-y-1">
        {/* Cloud Sync */}
        <button
          onClick={() => navigate('cloud-sync')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'ক্লাউড সিঙ্ক' : undefined}
        >
          <Cloud size={18} className="text-cyan-500" />
          {!collapsed && <span className="text-sm">ক্লাউড সিঙ্ক</span>}
        </button>

        <div className={`flex ${collapsed ? 'flex-col gap-1' : 'gap-1'}`}>
          <button
            onClick={() => navigate('notifications')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all ${
              collapsed ? 'justify-center' : 'flex-1'
            }`}
            title={collapsed ? 'নোটিফিকেশন' : undefined}
          >
            <Bell size={18} />
            {!collapsed && <span className="text-sm">নোটিফিকেশন</span>}
          </button>
          <button
            onClick={() => navigate('settings')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all ${
              collapsed ? 'justify-center' : 'flex-1'
            }`}
            title={collapsed ? 'সেটিংস' : undefined}
          >
            <Settings size={18} />
            {!collapsed && <span className="text-sm">সেটিংস</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

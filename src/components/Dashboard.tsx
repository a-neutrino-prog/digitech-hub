import { useState, useEffect, useMemo } from 'react';
import { getDashboardStats, getJobs, getNotifications, getShopInfo, getCustomerById, getUpcomingReminders, formatTaka, toBanglaNum, isToday, getTodayStart, getTodayEnd, type Job } from '../store';
import type { Page } from '../App';
import useResponsive from '../hooks/useResponsive';
import { Bell, Settings, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, ChevronRight, List, AlertCircle, Briefcase, Users, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LineChart, Line, CartesianGrid } from 'recharts';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

export default function Dashboard({ navigate }: Props) {
  const { isMobile, isDesktop } = useResponsive();
  const [stats, setStats] = useState(getDashboardStats());
  const [todayJobs, setTodayJobs] = useState<Job[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const shopInfo = getShopInfo();

  useEffect(() => {
    setStats(getDashboardStats());
    const jobs = getJobs().filter(j => isToday(j.date)).sort((a, b) => b.createdAt - a.createdAt);
    setTodayJobs(jobs);
    setUnreadCount(getNotifications().filter(n => !n.read).length);
  }, []);

  // সেবা-wise আজকের আয়
  const serviceWiseIncome = useMemo(() => {
    const todayStart = getTodayStart();
    const todayEnd = getTodayEnd();
    const jobs = getJobs().filter(j => j.date >= todayStart && j.date <= todayEnd && j.status !== 'cancelled');
    
    const map: Record<string, number> = {};
    jobs.forEach(job => {
      job.services.forEach(s => {
        map[s.serviceName] = (map[s.serviceName] || 0) + s.total;
      });
    });

    return Object.entries(map)
      .map(([name, amount]) => ({ 
        name: name.length > 8 ? name.slice(0, 8) + '..' : name, 
        fullName: name,
        amount 
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, []);

  // বাকি তালিকা
  const topDueCustomers = useMemo(() => {
    const jobs = getJobs().filter(j => j.due > 0 && j.status !== 'cancelled');
    const map: Record<string, number> = {};
    jobs.forEach(j => {
      map[j.customerId] = (map[j.customerId] || 0) + j.due;
    });
    return Object.entries(map)
      .map(([customerId, due]) => ({
        customer: getCustomerById(customerId),
        due
      }))
      .filter(x => x.customer)
      .sort((a, b) => b.due - a.due)
      .slice(0, 5);
  }, []);

  // Weekly trend for desktop
  const weeklyTrend = useMemo(() => {
    const days: { date: string; income: number; expense: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
      
      const dayJobs = getJobs().filter(j => j.date >= dayStart && j.date <= dayEnd && j.status !== 'cancelled');
      const income = dayJobs.reduce((sum, j) => sum + j.totalAmount - j.due, 0);
      
      days.push({
        date: d.toLocaleDateString('bn-BD', { weekday: 'short' }),
        income,
        expense: 0,
      });
    }
    return days;
  }, []);

  const COLORS = ['#2563EB', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];

  // Desktop Layout
  if (!isMobile) {
    return (
      <div className="space-y-6">
        {/* Desktop Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📊 ড্যাশবোর্ড</h1>
            <p className="text-gray-500 text-sm mt-1">স্বাগতম, {shopInfo.ownerName || 'ব্যবহারকারী'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('notifications')}
              className="relative w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center hover:shadow-md transition-all"
            >
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('settings')}
              className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center hover:shadow-md transition-all"
            >
              <Settings size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Stats Cards - Desktop Grid */}
        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-4' : 'grid-cols-2'}`}>
          <DesktopStatCard
            icon={<TrendingUp size={24} />}
            label="আজকের আয়"
            value={formatTaka(stats.todayIncome)}
            color="bg-green-500"
            lightColor="bg-green-50"
          />
          <DesktopStatCard
            icon={<TrendingDown size={24} />}
            label="আজকের ব্যয়"
            value={formatTaka(stats.todayExpense)}
            color="bg-red-500"
            lightColor="bg-red-50"
          />
          <DesktopStatCard
            icon={<AlertTriangle size={24} />}
            label="মোট বাকি"
            value={formatTaka(stats.totalDue)}
            color="bg-orange-500"
            lightColor="bg-orange-50"
            onClick={() => navigate('due-list')}
          />
          <DesktopStatCard
            icon={<CheckCircle size={24} />}
            label="আজকের কাজ"
            value={`${toBanglaNum(stats.todayJobsTotal)}টি`}
            subtitle={`পেন্ডিং ${toBanglaNum(stats.pendingJobs)} | সম্পন্ন ${toBanglaNum(stats.completedJobs)}`}
            color="bg-blue-500"
            lightColor="bg-blue-50"
            onClick={() => navigate('jobs')}
          />
        </div>

        {/* Charts Row */}
        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {/* Weekly Trend */}
          <div className="bg-white rounded-2xl shadow-sm p-5 col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 সাপ্তাহিক আয়ের ট্রেন্ড</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => [`৳${value}`, 'আয়']} />
                <Line type="monotone" dataKey="income" stroke="#2563EB" strokeWidth={3} dot={{ fill: '#2563EB', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Service Income */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 সেবা-wise আয়</h3>
            {serviceWiseIncome.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={serviceWiseIncome} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                  <Tooltip formatter={(value: any) => [`৳${value}`, 'আয়']} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {serviceWiseIncome.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                আজ কোনো আয় নেই
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {/* Today's Jobs */}
          <div className="bg-white rounded-2xl shadow-sm p-5 col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                আজকের কাজ
              </h3>
              <button
                onClick={() => navigate('jobs')}
                className="text-xs text-primary font-medium flex items-center gap-1"
              >
                সব দেখুন <ChevronRight size={14} />
              </button>
            </div>
            {todayJobs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-gray-400 text-sm">আজ কোনো কাজ নেই</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {todayJobs.slice(0, 8).map(job => (
                  <JobRow key={job.id} job={job} onClick={() => navigate('job-detail', { jobId: job.id })} />
                ))}
              </div>
            )}
          </div>

          {/* Due List + Reminders */}
          <div className="space-y-4">
            {/* Due List */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <AlertCircle size={16} className="text-orange-500" />
                  বাকি তালিকা
                </h3>
                <button
                  onClick={() => navigate('due-list')}
                  className="text-xs text-primary font-medium"
                >
                  সব দেখুন
                </button>
              </div>
              {topDueCustomers.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">কোনো বাকি নেই ✅</p>
              ) : (
                <div className="space-y-2">
                  {topDueCustomers.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-xs font-bold text-orange-600">
                          {item.customer?.name.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700">{item.customer?.name}</span>
                      </div>
                      <span className="text-sm font-bold text-orange-600">{formatTaka(item.due)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Reminders */}
            <UpcomingRemindersCard navigate={navigate} />
          </div>
        </div>

        {/* Quick Actions - Desktop */}
        <div className="grid grid-cols-4 gap-4">
          <QuickActionCard
            icon={<Briefcase size={24} />}
            label="নতুন কাজ"
            description="নতুন কাজ যোগ করুন"
            color="bg-blue-500"
            onClick={() => navigate('job-form')}
          />
          <QuickActionCard
            icon={<Users size={24} />}
            label="নতুন গ্রাহক"
            description="গ্রাহক যোগ করুন"
            color="bg-green-500"
            onClick={() => navigate('customer-form')}
          />
          <QuickActionCard
            icon={<PieChart size={24} />}
            label="রিপোর্ট"
            description="বিশ্লেষণ দেখুন"
            color="bg-purple-500"
            onClick={() => navigate('reports')}
          />
          <QuickActionCard
            icon={<List size={24} />}
            label="হিসাব"
            description="আয়-ব্যয় দেখুন"
            color="bg-cyan-500"
            onClick={() => navigate('transaction-list')}
          />
        </div>
      </div>
    );
  }

  // Mobile Layout (Original)
  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-blue-700 text-white px-4 pt-5 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight">📱 {shopInfo.shopName || 'ডিজিটেক হাব'}</h1>
            <p className="text-blue-100 text-xs mt-0.5">আপনার ব্যবসা, আপনার হাতের মুঠোয়</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('notifications')}
              className="relative w-10 h-10 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-all"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('settings')}
              className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-all"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<TrendingUp size={18} />}
            label="আজকের আয়"
            value={formatTaka(stats.todayIncome)}
            color="bg-green-500/20"
            textColor="text-green-100"
            valueColor="text-green-300"
          />
          <StatCard
            icon={<TrendingDown size={18} />}
            label="আজকের ব্যয়"
            value={formatTaka(stats.todayExpense)}
            color="bg-red-500/20"
            textColor="text-red-100"
            valueColor="text-red-300"
          />
          <StatCard
            icon={<AlertTriangle size={18} />}
            label="মোট বাকি"
            value={formatTaka(stats.totalDue)}
            color="bg-orange-500/20"
            textColor="text-orange-100"
            valueColor="text-orange-300"
            onClick={() => navigate('due-list')}
          />
          <StatCard
            icon={<CheckCircle size={18} />}
            label="আজকের কাজ"
            value={`${toBanglaNum(stats.todayJobsTotal)}টি`}
            color="bg-blue-500/20"
            textColor="text-blue-100"
            valueColor="text-blue-200"
            subtitle={`পেন্ডিং ${toBanglaNum(stats.pendingJobs)} | সম্পন্ন ${toBanglaNum(stats.completedJobs)}`}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-md p-4">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">দ্রুত অ্যাকশন</h3>
          <div className="grid grid-cols-4 gap-2">
            <QuickAction icon="📋" label="নতুন কাজ" onClick={() => navigate('job-form')} color="bg-blue-50" />
            <QuickAction icon="👤" label="নতুন গ্রাহক" onClick={() => navigate('customer-form')} color="bg-green-50" />
            <QuickAction icon="📅" label="ক্যালেন্ডার" onClick={() => navigate('calendar')} color="bg-teal-50" />
            <QuickAction icon="⚠️" label="বাকি তালিকা" onClick={() => navigate('due-list')} color="bg-orange-50" />
          </div>
        </div>
      </div>

      {/* More Actions */}
      <div className="px-4 mt-3">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('transaction-list')} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 card-hover">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <List size={20} className="text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800">হিসাব দেখুন</p>
              <p className="text-xs text-gray-400">আয়-ব্যয় তালিকা</p>
            </div>
          </button>
          <button onClick={() => navigate('reminders')} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 card-hover">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <span className="text-xl">⏰</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800">রিমাইন্ডার</p>
              <p className="text-xs text-gray-400">সময়মতো মনে করিয়ে দিন</p>
            </div>
          </button>
        </div>
      </div>

      {/* Upcoming Reminders */}
      <UpcomingReminders navigate={navigate} />

      {/* Service-wise Income Chart */}
      {serviceWiseIncome.length > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">📊 আজকের সেবা-wise আয়</h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={serviceWiseIncome} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={50} />
                <Tooltip formatter={(value: any) => [`৳${value}`, 'আয়']} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {serviceWiseIncome.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Due Customers */}
      {topDueCustomers.length > 0 && (
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
                <AlertCircle size={16} className="text-orange-500" />
                বাকি তালিকা (টপ ৩)
              </h3>
              <button onClick={() => navigate('due-list')} className="text-xs text-primary font-medium">সব দেখুন</button>
            </div>
            <div className="space-y-2">
              {topDueCustomers.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-xs font-bold text-orange-600">
                      {item.customer?.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{item.customer?.name}</p>
                      <p className="text-[10px] text-gray-400">{item.customer?.mobile}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-orange-600">{formatTaka(item.due)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Today's Jobs */}
      <div className="px-4 mt-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
            <Clock size={16} className="text-primary" />
            আজকের কাজ
          </h3>
          <button onClick={() => navigate('jobs')} className="text-xs text-primary font-medium flex items-center gap-0.5">
            সব দেখুন <ChevronRight size={14} />
          </button>
        </div>

        {todayJobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-gray-400 text-sm">আজ কোনো কাজ নেই</p>
            <button onClick={() => navigate('job-form')} className="mt-3 text-primary text-sm font-semibold">
              + নতুন কাজ যোগ করুন
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {todayJobs.slice(0, 5).map(job => (
              <JobCard key={job.id} job={job} onClick={() => navigate('job-detail', { jobId: job.id })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Mobile Stat Card
function StatCard({ icon, label, value, color, textColor, valueColor, subtitle, onClick }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  textColor: string;
  valueColor: string;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`${color} rounded-xl p-3 backdrop-blur-sm text-left ${onClick ? 'cursor-pointer active:scale-95 transition-all' : ''}`}
    >
      <div className={`flex items-center gap-1.5 ${textColor} mb-1`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-lg font-bold ${valueColor} number-animate`}>{value}</p>
      {subtitle && <p className={`text-[10px] ${textColor} mt-0.5`}>{subtitle}</p>}
    </button>
  );
}

// Desktop Stat Card
function DesktopStatCard({ icon, label, value, subtitle, color, lightColor, onClick }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
  lightColor: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm p-5 text-left hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl ${lightColor} flex items-center justify-center`}>
          <span className={`${color} text-white p-2 rounded-lg`}>{icon}</span>
        </div>
      </div>
    </button>
  );
}

// Mobile Quick Action
function QuickAction({ icon, label, onClick, color }: {
  icon: string;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 transition-all active:scale-95">
      <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center text-xl`}>{icon}</div>
      <span className="text-[11px] font-medium text-gray-600 leading-tight text-center">{label}</span>
    </button>
  );
}

// Desktop Quick Action Card
function QuickActionCard({ icon, label, description, color, onClick }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm p-5 text-left hover:shadow-md transition-all flex items-center gap-4"
    >
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white`}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </button>
  );
}

// Mobile Job Card
function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const customer = getCustomerById(job.customerId);
  const statusMap: Record<string, { label: string; class: string }> = {
    'pending': { label: 'পেন্ডিং', class: 'status-pending' },
    'in-progress': { label: 'চলমান', class: 'status-in-progress' },
    'completed': { label: 'সম্পন্ন', class: 'status-completed' },
    'cancelled': { label: 'বাতিল', class: 'status-cancelled' },
  };
  const status = statusMap[job.status];

  return (
    <button onClick={onClick} className="w-full bg-white rounded-xl shadow-sm p-3.5 flex items-center gap-3 card-hover text-left">
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg">📋</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800 truncate">{customer?.name || 'অজানা গ্রাহক'}</p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.class}`}>{status.label}</span>
        </div>
        <p className="text-xs text-gray-400 truncate mt-0.5">{job.services.map(s => s.serviceName).join(', ')}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs font-semibold text-gray-700">{formatTaka(job.totalAmount)}</span>
          {job.due > 0 && <span className="text-[10px] text-orange-600 font-medium">বাকি: {formatTaka(job.due)}</span>}
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </button>
  );
}

// Desktop Job Row
function JobRow({ job, onClick }: { job: Job; onClick: () => void }) {
  const customer = getCustomerById(job.customerId);
  const statusMap: Record<string, { label: string; class: string }> = {
    'pending': { label: 'পেন্ডিং', class: 'status-pending' },
    'in-progress': { label: 'চলমান', class: 'status-in-progress' },
    'completed': { label: 'সম্পন্ন', class: 'status-completed' },
    'cancelled': { label: 'বাতিল', class: 'status-cancelled' },
  };
  const status = statusMap[job.status];

  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all text-left">
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">📋</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{customer?.name || 'অজানা গ্রাহক'}</p>
        <p className="text-xs text-gray-400 truncate">{job.services.map(s => s.serviceName).join(', ')}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-gray-800">{formatTaka(job.totalAmount)}</p>
        {job.due > 0 && <p className="text-[10px] text-orange-600">বাকি: {formatTaka(job.due)}</p>}
      </div>
      <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${status.class} flex-shrink-0`}>{status.label}</span>
    </button>
  );
}

// Mobile Upcoming Reminders
function UpcomingReminders({ navigate }: { navigate: (page: Page, params?: Record<string, string>) => void }) {
  const reminders = getUpcomingReminders().slice(0, 3);
  if (reminders.length === 0) return null;

  const isOverdue = (date: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today.getTime();
  };

  const formatReminderDate = (date: number) => {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (d.getTime() < today.getTime()) return 'বিলম্বিত!';
    if (d.toDateString() === today.toDateString()) return 'আজ';
    if (d.toDateString() === tomorrow.toDateString()) return 'আগামীকাল';
    return d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="px-4 mt-3">
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">⏰ আসন্ন রিমাইন্ডার</h3>
          <button onClick={() => navigate('reminders')} className="text-xs text-purple-600 font-medium">সব দেখুন</button>
        </div>
        <div className="space-y-2">
          {reminders.map(r => (
            <div key={r.id} className={`flex items-center gap-3 p-2 rounded-lg ${isOverdue(r.date) ? 'bg-red-50' : 'bg-gray-50'}`}>
              <span className="text-lg">{r.type === 'payment' ? '💰' : r.type === 'bill' ? '📄' : r.type === 'customer' ? '👤' : '📝'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{r.title}</p>
                <p className={`text-[10px] ${isOverdue(r.date) ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                  {formatReminderDate(r.date)} • {r.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Desktop Upcoming Reminders Card
function UpcomingRemindersCard({ navigate }: { navigate: (page: Page, params?: Record<string, string>) => void }) {
  const reminders = getUpcomingReminders().slice(0, 3);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          ⏰ রিমাইন্ডার
        </h3>
        <button onClick={() => navigate('reminders')} className="text-xs text-purple-600 font-medium">
          সব দেখুন
        </button>
      </div>
      {reminders.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-4">কোনো রিমাইন্ডার নেই</p>
      ) : (
        <div className="space-y-2">
          {reminders.map(r => (
            <div key={r.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <span className="text-sm">{r.type === 'bill' ? '📄' : r.type === 'payment' ? '💰' : '📝'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 truncate">{r.title}</p>
                <p className="text-[10px] text-gray-400">{r.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

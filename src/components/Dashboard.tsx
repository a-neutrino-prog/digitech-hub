import { useState, useMemo } from 'react';
import { getDashboardStats, getJobs, getTransactions, getNotifications, getShopInfo, getCustomerById, getUpcomingReminders, formatTaka, toBanglaNum, isToday, getTodayStart, getTodayEnd, type Job } from '../store';
import { usePageLoad } from '../hooks/useLoading';
import { SkeletonDashboard } from './ui/Skeleton';
import type { Page } from '../App';
import useResponsive from '../hooks/useResponsive';
import { getGreeting, getGreetingEmoji } from '../utils/greeting';
import { Bell, Settings, Clock, ChevronRight, List, AlertCircle, Briefcase, Users, PieChart, Calendar, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LineChart, Line, CartesianGrid } from 'recharts';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

export default function Dashboard({ navigate }: Props) {
  const loading = usePageLoad();
  const { isMobile, isDesktop } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // All data computed once per mount (key={refreshKey} ensures remount on data change)
  // Must be BEFORE any conditional return (React hooks rule)
  const data = useMemo(() => {
    const shopInfo = getShopInfo();
    const stats = getDashboardStats();
    const allJobs = getJobs();
    const allTxs = getTransactions();
    const unreadCount = getNotifications().filter(n => !n.read).length;
    const todayJobs: Job[] = allJobs.filter(j => isToday(j.date)).sort((a, b) => b.createdAt - a.createdAt);

    const todayStart = getTodayStart(), todayEnd = getTodayEnd();
    const jobsToday = allJobs.filter(j => j.date >= todayStart && j.date <= todayEnd && j.status !== 'cancelled');
    const svcMap: Record<string, number> = {};
    jobsToday.forEach(job => job.services.forEach(s => { svcMap[s.serviceName] = (svcMap[s.serviceName] || 0) + s.total; }));
    const serviceWiseIncome = Object.entries(svcMap).map(([name, amount]) => ({ name: name.length > 8 ? name.slice(0, 8) + '..' : name, fullName: name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6);

    const dueMap: Record<string, number> = {};
    allJobs.filter(j => j.due > 0 && j.status !== 'cancelled').forEach(j => { dueMap[j.customerId] = (dueMap[j.customerId] || 0) + j.due; });
    const topDueCustomers = Object.entries(dueMap).map(([id, due]) => ({ customer: getCustomerById(id), due })).filter(x => x.customer).sort((a, b) => b.due - a.due).slice(0, 5);

    const weeklyTrend: { date: string; income: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const dj = allJobs.filter(j => j.date >= d.getTime() && j.date < d.getTime() + 86400000 && j.status !== 'cancelled');
      weeklyTrend.push({ date: d.toLocaleDateString('bn-BD', { weekday: 'short' }), income: dj.reduce((s, j) => s + j.totalAmount - j.due, 0) });
    }

    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0,0,0,0);
    const yInc = allTxs.filter(t => t.date >= yesterday.getTime() && t.date < yesterday.getTime() + 86400000 && t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const wkStart = new Date(now); wkStart.setDate(wkStart.getDate() - wkStart.getDay()); wkStart.setHours(0,0,0,0);
    const lwStart = new Date(wkStart); lwStart.setDate(lwStart.getDate() - 7);
    const twInc = allTxs.filter(t => t.type === 'income' && t.date >= wkStart.getTime()).reduce((s, t) => s + t.amount, 0);
    const lwInc = allTxs.filter(t => t.type === 'income' && t.date >= lwStart.getTime() && t.date < wkStart.getTime()).reduce((s, t) => s + t.amount, 0);
    const wkGr = lwInc > 0 ? Math.round(((twInc - lwInc) / lwInc) * 100) : 0;
    const dueJobs = allJobs.filter(j => j.due > 0 && j.status !== 'cancelled');
    const ms = Date.now();
    const d7 = dueJobs.filter(j => ms - j.date <= 7 * 86400000).reduce((s, j) => s + j.due, 0);
    const d30 = dueJobs.filter(j => { const a = ms - j.date; return a > 7 * 86400000 && a <= 30 * 86400000; }).reduce((s, j) => s + j.due, 0);
    const d30p = dueJobs.filter(j => ms - j.date > 30 * 86400000).reduce((s, j) => s + j.due, 0);
    const sAll: Record<string, number> = {};
    allJobs.filter(j => j.status !== 'cancelled').forEach(j => j.services.forEach(s => { sAll[s.serviceName] = (sAll[s.serviceName] || 0) + s.total; }));
    const topSvc = Object.entries(sAll).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const pDue = dueJobs.filter(j => j.status === 'pending' || j.status === 'in-progress').length;
    const oDue = dueJobs.filter(j => ms - j.date > 7 * 86400000).length;

    return {
      shopInfo, stats, todayJobs, unreadCount, serviceWiseIncome, topDueCustomers, weeklyTrend,
      netIncome: stats.todayIncome - stats.todayExpense,
      smartInsights: { yesterdayIncome: yInc, incomeVsYesterday: stats.todayIncome - yInc, thisWeekIncome: twInc, lastWeekIncome: lwInc, weekGrowth: wkGr, due1to7: d7, due8to30: d30, due30plus: d30p, topServices: topSvc, pendingDue: pDue, overdueCount: oDue },
    };
  }, []); // empty deps OK — key={refreshKey} handles remount

  if (loading) return <SkeletonDashboard />;

  const { shopInfo, stats, todayJobs, unreadCount, serviceWiseIncome, topDueCustomers, weeklyTrend, netIncome, smartInsights } = data;
  const COLORS = ['#2563EB', '#3b82f6', '#60a5fa', '#F59E0B', '#22C55E', '#8B5CF6'];
  const isDark = document.documentElement.classList.contains('dark');
  const tooltipStyle = { background: isDark ? '#1E293B' : '#fff', border: 'none', borderRadius: 12, color: isDark ? '#F1F5F9' : '#0F172A', fontSize: 12 };

  // ═══ DESKTOP ═══
  if (!isMobile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-2 text-sm">{getGreeting()} {getGreetingEmoji()}</p>
            <h1 className="text-2xl font-extrabold text-text-1 tracking-tight">{shopInfo.shopName || 'ডিজিটেক হাব'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('notifications')} className="relative w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center hover:shadow-md transition-all border border-gray-200" aria-label="নোটিফিকেশন">
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-danger rounded-full text-[9px] text-white font-bold flex items-center justify-center">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>
            <button onClick={() => navigate('settings')} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center hover:shadow-md transition-all border border-gray-200" aria-label="সেটিংস">
              <Settings size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-4' : 'grid-cols-2'}`}>
          <StatCardNew icon="💰" label="আজকের আয়" value={formatTaka(stats.todayIncome)} sub={smartInsights.incomeVsYesterday >= 0 ? `📈 গতকালের চেয়ে ৳${Math.abs(smartInsights.incomeVsYesterday)} বেশি` : `📉 গতকালের চেয়ে ৳${Math.abs(smartInsights.incomeVsYesterday)} কম`} className="income" />
          <StatCardNew icon="📉" label="আজকের ব্যয়" value={formatTaka(stats.todayExpense)} sub={`সাপ্তাহিক ${smartInsights.weekGrowth >= 0 ? '↑' : '↓'}${Math.abs(smartInsights.weekGrowth)}%`} className="expense" />
          <StatCardNew icon="⚠️" label="মোট বাকি" value={formatTaka(stats.totalDue)} sub={`${topDueCustomers.length}জন গ্রাহক`} className="due" onClick={() => navigate('due-list')} />
          <StatCardNew icon="💼" label="আজকের কাজ" value={`${toBanglaNum(stats.todayJobsTotal)}টি`} sub={`পেন্ডিং ${toBanglaNum(stats.pendingJobs)} | সম্পন্ন ${toBanglaNum(stats.completedJobs)}`} className="jobs" onClick={() => navigate('jobs')} />
        </div>

        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
          <div className="bg-white rounded-2xl shadow-sm p-5 col-span-2 border border-gray-200/60">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 সাপ্তাহিক আয়ের ট্রেন্ড</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyTrend}><CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f0f0f0'} /><XAxis dataKey="date" tick={{ fontSize: 12, fill: isDark ? '#94A3B8' : undefined }} /><YAxis tick={{ fontSize: 12, fill: isDark ? '#94A3B8' : undefined }} /><Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`৳${v}`, 'আয়']} /><Line type="monotone" dataKey="income" stroke="#2563EB" strokeWidth={3} dot={{ fill: '#2563EB', r: 4 }} /></LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200/60">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 সেবা-wise আয়</h3>
            {serviceWiseIncome.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={serviceWiseIncome} layout="vertical"><XAxis type="number" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : undefined }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : undefined }} width={60} /><Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`৳${v}`, 'আয়']} /><Bar dataKey="amount" radius={[0, 6, 6, 0]}>{serviceWiseIncome.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">আজ কোনো আয় নেই</div>}
          </div>
        </div>

        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
          <div className="bg-white rounded-2xl shadow-sm p-5 col-span-2 border border-gray-200/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Clock size={16} className="text-primary" />আজকের কাজ</h3>
              <button onClick={() => navigate('jobs')} className="text-xs text-primary font-semibold flex items-center gap-1">সব দেখুন <ChevronRight size={14} /></button>
            </div>
            {todayJobs.length === 0 ? <EmptyState icon="📝" title="আজ কোনো কাজ নেই" action="+ নতুন কাজ" onAction={() => navigate('job-form')} /> : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">{todayJobs.slice(0, 8).map((job, i) => <JobListItem key={job.id} job={job} onClick={() => navigate('job-detail', { jobId: job.id })} index={i} />)}</div>
            )}
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200/60">
              <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-700"><AlertCircle size={16} className="inline text-warning mr-1" />বাকি তালিকা</h3><button onClick={() => navigate('due-list')} className="text-xs text-primary font-medium">সব</button></div>
              {topDueCustomers.length === 0 ? <p className="text-center text-gray-400 text-sm py-4">বাকি নেই ✅</p> : topDueCustomers.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-xs font-bold text-orange-600">{item.customer?.name.charAt(0)}</div><span className="text-sm text-gray-700">{item.customer?.name}</span></div><span className="text-sm font-bold text-orange-600">{formatTaka(item.due)}</span></div>
              ))}
            </div>
            <UpcomingRemindersCard navigate={navigate} />

            {/* Due Aging — Desktop */}
            {(smartInsights.due1to7 > 0 || smartInsights.due8to30 > 0 || smartInsights.due30plus > 0) && (
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200/60">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">⏳ বাকি বয়স</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center"><span className="text-xs text-gray-500">১-৭ দিন</span><span className="text-xs font-bold text-success">{formatTaka(smartInsights.due1to7)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs text-gray-500">৮-৩০ দিন</span><span className="text-xs font-bold text-warning">{formatTaka(smartInsights.due8to30)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs text-gray-500">৩০+ দিন</span><span className="text-xs font-bold text-danger">{formatTaka(smartInsights.due30plus)}</span></div>
                </div>
                {smartInsights.overdueCount > 0 && <p className="text-[10px] text-danger bg-danger-light rounded-lg px-2 py-1 mt-2 font-semibold text-center">{smartInsights.overdueCount}টি ওভারডিউ — ফলো-আপ দরকার</p>}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <QuickActionCard icon={<Briefcase size={22} />} label="নতুন কাজ" desc="কাজ যোগ করুন" color="bg-primary" onClick={() => navigate('job-form')} />
          <QuickActionCard icon={<Users size={22} />} label="নতুন গ্রাহক" desc="গ্রাহক যোগ" color="bg-success" onClick={() => navigate('customer-form')} />
          <QuickActionCard icon={<PieChart size={22} />} label="রিপোর্ট" desc="বিশ্লেষণ" color="bg-purple-500" onClick={() => navigate('reports')} />
          <QuickActionCard icon={<Calendar size={22} />} label="ক্যালেন্ডার" desc="তারিখ ভিউ" color="bg-teal-500" onClick={() => navigate('calendar')} />
        </div>
      </div>
    );
  }

  // ═══ MOBILE — Premium Dashboard Header ═══
  return (
    <div className="bg-surface-50 min-h-screen">
      {/* Immersive Header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)' }}>
        <div className="absolute right-[-40px] top-[-40px] w-[200px] h-[200px] rounded-full" style={{ background: 'rgba(96,165,250,0.08)' }} />
        <div className="absolute left-[-20px] bottom-[-60px] w-[160px] h-[160px] rounded-full" style={{ background: 'rgba(37,99,235,0.10)' }} />

        <div className="relative z-10 px-5 pt-6 pb-10" style={{ borderRadius: '0 0 24px 24px' }}>
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-300 text-sm">{getGreeting()} {getGreetingEmoji()}</p>
              <h1 className="text-xl font-bold text-white tracking-tight">{shopInfo.shopName || 'ডিজিটেক হাব'}</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSearch(!showSearch)} className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/12" style={{ background: 'rgba(255,255,255,0.1)' }} aria-label="খুঁজুন">
                <Search size={18} className="text-white" />
              </button>
              <button onClick={() => navigate('notifications')} className="relative w-10 h-10 rounded-xl flex items-center justify-center border border-white/12" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }} aria-label="নোটিফিকেশন">
                <Bell size={18} className="text-white" />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger" />}
              </button>
              <button onClick={() => navigate('settings')} className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/12" style={{ background: 'rgba(255,255,255,0.1)' }} aria-label="সেটিংস">
                <Settings size={18} className="text-white" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="mb-4 fade-in">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="গ্রাহক, কাজ বা সেবা খুঁজুন..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/40"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
                  autoFocus
                />
              </div>
              {searchQuery.trim() && <SearchResults query={searchQuery} navigate={navigate} />}
            </div>
          )}

          {/* Net Income */}
          {!showSearch && (
          <div className="mb-5">
            <p className="text-blue-300 text-xs mb-1">আজকের নেট আয়</p>
            <p className="text-3xl font-extrabold text-white tracking-tight">{formatTaka(netIncome)}</p>
          </div>
          )}

          {/* Quick Stats */}
          <div className="flex gap-2">
            {[
              { label: 'আয়', val: formatTaka(stats.todayIncome), color: '' },
              { label: 'ব্যয়', val: formatTaka(stats.todayExpense), color: '' },
              { label: 'বাকি', val: formatTaka(stats.totalDue), color: 'color: #FCD34D' },
            ].map((s, i) => (
              <div key={i} className="flex-1 rounded-2xl p-3 border border-white/12" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
                <p className="text-blue-300 text-[11px] mb-1">{s.label}</p>
                <p className="text-lg font-bold text-white" style={s.color ? { color: '#FCD34D' } : undefined}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="px-4 -mt-4 grid grid-cols-2 gap-3">
        <StatCardNew icon="💼" label="আজকের কাজ" value={`${toBanglaNum(stats.todayJobsTotal)}টি`} sub={`পেন্ডিং ${toBanglaNum(stats.pendingJobs)}`} className="jobs" onClick={() => navigate('jobs')} />
        <StatCardNew icon="⚠️" label="মোট বাকি" value={formatTaka(stats.totalDue)} sub={`${topDueCustomers.length}জন`} className="due" onClick={() => navigate('due-list')} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-200/60">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">দ্রুত অ্যাকশন</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: '📋', label: 'নতুন কাজ', page: 'job-form' as Page, bg: 'bg-blue-50' },
              { icon: '👤', label: 'নতুন গ্রাহক', page: 'customer-form' as Page, bg: 'bg-green-50' },
              { icon: '📅', label: 'ক্যালেন্ডার', page: 'calendar' as Page, bg: 'bg-teal-50' },
              { icon: '⚠️', label: 'বাকি', page: 'due-list' as Page, bg: 'bg-orange-50' },
            ].map((a, i) => (
              <button key={i} onClick={() => navigate(a.page)} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 transition-all active:scale-95" aria-label={a.label}>
                <div className={`w-11 h-11 ${a.bg} rounded-xl flex items-center justify-center text-xl`}>{a.icon}</div>
                <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* More Actions */}
      <div className="px-4 mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => navigate('transaction-list')} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 card-hover border border-gray-200/60">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><List size={20} className="text-indigo-600" /></div>
          <div className="text-left"><p className="text-sm font-semibold text-gray-800">হিসাব</p><p className="text-[10px] text-gray-400">আয়-ব্যয়</p></div>
        </button>
        <button onClick={() => navigate('reminders')} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 card-hover border border-gray-200/60">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center"><span className="text-xl">⏰</span></div>
          <div className="text-left"><p className="text-sm font-semibold text-gray-800">রিমাইন্ডার</p><p className="text-[10px] text-gray-400">মনে করিয়ে দিন</p></div>
        </button>
      </div>

      {/* Smart Insights */}
      <div className="px-4 mt-3">
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-200/60">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">💡 স্মার্ট ইনসাইট</p>

          {/* Yesterday comparison */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-xs text-gray-500">গতকালের চেয়ে</span>
            <span className={`text-xs font-bold ${smartInsights.incomeVsYesterday >= 0 ? 'text-success' : 'text-danger'}`}>
              {smartInsights.incomeVsYesterday >= 0 ? '📈' : '📉'} {formatTaka(Math.abs(smartInsights.incomeVsYesterday))} {smartInsights.incomeVsYesterday >= 0 ? 'বেশি' : 'কম'}
            </span>
          </div>

          {/* Week growth */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-xs text-gray-500">সাপ্তাহিক গ্রোথ</span>
            <span className={`text-xs font-bold ${smartInsights.weekGrowth >= 0 ? 'text-success' : 'text-danger'}`}>
              {smartInsights.weekGrowth >= 0 ? '↑' : '↓'} {Math.abs(smartInsights.weekGrowth)}%
            </span>
          </div>

          {/* Follow-up needed */}
          {(smartInsights.pendingDue > 0 || smartInsights.overdueCount > 0) && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500">ফলো-আপ দরকার</span>
              <div className="flex gap-2">
                {smartInsights.pendingDue > 0 && <span className="text-[10px] bg-warning-light text-warning-dark px-2 py-0.5 rounded-full font-semibold">{smartInsights.pendingDue} পেন্ডিং</span>}
                {smartInsights.overdueCount > 0 && <span className="text-[10px] bg-danger-light text-danger-dark px-2 py-0.5 rounded-full font-semibold">{smartInsights.overdueCount} ওভারডিউ</span>}
              </div>
            </div>
          )}

          {/* Top services */}
          {smartInsights.topServices.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] text-gray-400 mb-1.5">🏆 টপ সেবা</p>
              <div className="flex gap-1.5 flex-wrap">
                {smartInsights.topServices.map(([name], i) => (
                  <span key={i} className="text-[10px] bg-primary-50 text-primary px-2 py-1 rounded-lg font-medium">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Due Aging */}
      {(smartInsights.due1to7 > 0 || smartInsights.due8to30 > 0 || smartInsights.due30plus > 0) && (
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-200/60">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">⏳ বাকি বয়স বিশ্লেষণ</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-gray-500">১-৭ দিন</p>
                <p className="text-sm font-bold text-success">{formatTaka(smartInsights.due1to7)}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-gray-500">৮-৩০ দিন</p>
                <p className="text-sm font-bold text-warning">{formatTaka(smartInsights.due8to30)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-gray-500">৩০+ দিন</p>
                <p className="text-sm font-bold text-danger">{formatTaka(smartInsights.due30plus)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reminders */}
      <UpcomingRemindersMobile navigate={navigate} />

      {/* Chart */}
      {serviceWiseIncome.length > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-200/60">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">📊 আজকের সেবা-wise আয়</h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={serviceWiseIncome} layout="vertical"><XAxis type="number" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : undefined }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : undefined }} width={50} /><Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`৳${v}`, 'আয়']} /><Bar dataKey="amount" radius={[0, 6, 6, 0]}>{serviceWiseIncome.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Due Customers */}
      {topDueCustomers.length > 0 && (
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-200/60">
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-600"><AlertCircle size={14} className="inline text-orange-500 mr-1" />বাকি তালিকা</h3><button onClick={() => navigate('due-list')} className="text-xs text-primary font-medium">সব</button></div>
            {topDueCustomers.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-xs font-bold text-orange-600">{item.customer?.name.charAt(0)}</div><div><p className="text-sm font-medium text-gray-700">{item.customer?.name}</p><p className="text-[10px] text-gray-400">{item.customer?.mobile}</p></div></div>
                <span className="text-sm font-bold text-orange-600">{formatTaka(item.due)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Jobs */}
      <div className="px-4 mt-4 mb-4">
        <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-600 flex items-center gap-1.5"><Clock size={16} className="text-primary" />আজকের কাজ</h3><button onClick={() => navigate('jobs')} className="text-xs text-primary font-semibold flex items-center gap-0.5">সব <ChevronRight size={14} /></button></div>
        {todayJobs.length === 0 ? <EmptyState icon="📝" title="আজ কোনো কাজ নেই" action="+ নতুন কাজ" onAction={() => navigate('job-form')} /> : (
          <div className="space-y-2.5">{todayJobs.slice(0, 5).map((job, i) => <JobListItem key={job.id} job={job} onClick={() => navigate('job-detail', { jobId: job.id })} index={i} />)}</div>
        )}
      </div>
    </div>
  );
}

// ═══ NEW STAT CARD ═══
function StatCardNew({ icon, label, value, trend, trendUp, sub, className = '', onClick }: {
  icon: string; label: string; value: string; trend?: string; trendUp?: boolean; sub?: string; className?: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className={`stat-card bg-white rounded-2xl border border-gray-200/60 p-5 text-left w-full ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{
          background: className.includes('income') ? '#F0FDF4' : className.includes('expense') ? '#FFF1F2' : className.includes('due') ? '#FFFBEB' : '#EFF6FF'
        }}>{icon}</div>
        {trend && (
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <p className="text-[13px] text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1.5">{sub}</p>}
    </button>
  );
}

// ═══ JOB LIST ITEM — with status bar ═══
function JobListItem({ job, onClick, index }: { job: Job; onClick: () => void; index: number }) {
  const customer = getCustomerById(job.customerId);
  const statusCfg: Record<string, { label: string; cls: string; bar: string }> = {
    'pending': { label: 'পেন্ডিং', cls: 'status-pending', bar: 'status-bar-pending' },
    'in-progress': { label: 'চলমান', cls: 'status-in-progress', bar: 'status-bar-in-progress' },
    'completed': { label: 'সম্পন্ন', cls: 'status-completed', bar: 'status-bar-completed' },
    'cancelled': { label: 'বাতিল', cls: 'status-cancelled', bar: 'status-bar-cancelled' },
  };
  const s = statusCfg[job.status];
  return (
    <button onClick={onClick} className={`animate-item list-item-status ${s.bar} w-full bg-white rounded-2xl border border-gray-200/60 p-4 flex items-center gap-4 text-left`} style={{ animationDelay: `${index * 50}ms` }}>
      <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700 font-bold text-base flex-shrink-0">{customer?.name.charAt(0) || '?'}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2"><p className="text-sm font-semibold text-gray-800 truncate">{customer?.name || 'অজানা'}</p><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span></div>
        <p className="text-xs text-gray-400 truncate mt-0.5">{job.services.map(sv => sv.serviceName).join(', ')}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[15px] font-bold text-gray-800">{formatTaka(job.totalAmount)}</p>
        {job.due > 0 && <p className="text-[10px] text-orange-500 mt-0.5">বাকি {formatTaka(job.due)}</p>}
      </div>
    </button>
  );
}

// ═══ EMPTY STATE ═══
function EmptyState({ icon, title, action, onAction }: { icon: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 p-10 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-4xl mx-auto mb-4 empty-illustration">{icon}</div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      {action && <button onClick={onAction} className="mt-3 text-primary text-sm font-semibold">{action}</button>}
    </div>
  );
}

// ═══ DESKTOP QUICK ACTION ═══
function QuickActionCard({ icon, label, desc, color, onClick }: { icon: React.ReactNode; label: string; desc: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-white rounded-2xl shadow-sm p-5 text-left hover:shadow-md transition-all flex items-center gap-4 border border-gray-200/60">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white`}>{icon}</div>
      <div><p className="font-semibold text-gray-800">{label}</p><p className="text-xs text-gray-400">{desc}</p></div>
    </button>
  );
}

// ═══ REMINDERS ═══
function UpcomingRemindersMobile({ navigate }: { navigate: (p: Page, params?: Record<string, string>) => void }) {
  const reminders = getUpcomingReminders().slice(0, 3);
  if (!reminders.length) return null;
  const isOverdue = (d: number) => { const t = new Date(); t.setHours(0,0,0,0); return d < t.getTime(); };
  return (
    <div className="px-4 mt-3"><div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-200/60">
      <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-600">⏰ রিমাইন্ডার</h3><button onClick={() => navigate('reminders')} className="text-xs text-purple-600 font-medium">সব</button></div>
      <div className="space-y-2">{reminders.map(r => (
        <div key={r.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${isOverdue(r.date) ? 'bg-red-50' : 'bg-gray-50'}`}>
          <span className="text-lg">{r.type === 'payment' ? '💰' : r.type === 'bill' ? '📄' : '📝'}</span>
          <div className="flex-1 min-w-0"><p className="text-sm text-gray-700 truncate">{r.title}</p><p className={`text-[10px] ${isOverdue(r.date) ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{r.time}</p></div>
        </div>
      ))}</div>
    </div></div>
  );
}

function UpcomingRemindersCard({ navigate }: { navigate: (p: Page, params?: Record<string, string>) => void }) {
  const reminders = getUpcomingReminders().slice(0, 3);
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200/60">
      <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-700">⏰ রিমাইন্ডার</h3><button onClick={() => navigate('reminders')} className="text-xs text-purple-600 font-medium">সব</button></div>
      {!reminders.length ? <p className="text-center text-gray-400 text-sm py-4">কোনো রিমাইন্ডার নেই</p> : (
        <div className="space-y-2">{reminders.map(r => (
          <div key={r.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl"><span className="text-sm">{r.type === 'bill' ? '📄' : r.type === 'payment' ? '💰' : '📝'}</span><div className="flex-1 min-w-0"><p className="text-xs text-gray-700 truncate">{r.title}</p><p className="text-[10px] text-gray-400">{r.time}</p></div></div>
        ))}</div>
      )}
    </div>
  );
}

import { getCustomers } from '../store';
function SearchResults({ query, navigate: nav }: { query: string; navigate: (p: Page, params?: Record<string, string>) => void }) {
  const q = query.toLowerCase().trim();
  const cs = getCustomers().filter(c => c.name.toLowerCase().includes(q) || c.mobile.includes(q)).slice(0, 3);
  const js = getJobs().filter(j => { const c = getCustomerById(j.customerId); return c?.name.toLowerCase().includes(q) || c?.mobile.includes(q) || j.services.some(s => s.serviceName.toLowerCase().includes(q)) || (j.jobNumber||'').toLowerCase().includes(q); }).slice(0, 3);
  if (!cs.length && !js.length) return <p className="text-white/40 text-xs text-center mt-3">কিছু পাওয়া যায়নি</p>;
  return (
    <div className="mt-3 rounded-xl overflow-hidden" style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.12)' }}>
      {cs.length > 0 && <div><p className="text-[10px] text-blue-300 uppercase tracking-wider px-3 pt-2 font-semibold">গ্রাহক</p>{cs.map(c => <button key={c.id} onClick={() => nav('customer-detail',{customerId:c.id})} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 text-left"><div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-xs font-bold text-white">{c.name.charAt(0)}</div><div><p className="text-sm text-white">{c.name}</p><p className="text-[10px] text-white/50">{c.mobile}</p></div></button>)}</div>}
      {js.length > 0 && <div><p className="text-[10px] text-blue-300 uppercase tracking-wider px-3 pt-2 font-semibold">কাজ</p>{js.map(j => { const c = getCustomerById(j.customerId); return <button key={j.id} onClick={() => nav('job-detail',{jobId:j.id})} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 text-left"><div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-xs text-white">📋</div><div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{c?.name} — {j.services.map(s=>s.serviceName).join(', ')}</p><p className="text-[10px] text-white/50">{formatTaka(j.totalAmount)}</p></div></button>; })}</div>}
    </div>
  );
}

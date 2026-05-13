import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import useResponsive from '../../hooks/useResponsive';
import type { Page } from '../../App';
import { Home, Briefcase, Users, Plus, X, MoreHorizontal, PieChart, AlertTriangle, Clock, Calendar, Cloud, Settings, FileText } from 'lucide-react';

interface Props {
  children: ReactNode;
  currentPage: Page;
  navigate: (page: Page, params?: Record<string, string>) => void;
  fabOpen: boolean;
  setFabOpen: (open: boolean) => void;
}

export default function ResponsiveLayout({ children, currentPage, navigate, fabOpen, setFabOpen }: Props) {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="pb-24">
          <div className="page-enter">{children}</div>
        </div>
        <MobileFAB currentPage={currentPage} navigate={navigate} fabOpen={fabOpen} setFabOpen={setFabOpen} />
        <MobileBottomNav currentPage={currentPage} navigate={navigate} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar currentPage={currentPage} navigate={navigate} collapsed={isTablet} />
      <main className="flex-1 overflow-auto">
        <div className={`min-h-screen ${isDesktop ? 'p-6' : 'p-4'}`}>
          <div className="page-enter max-w-6xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}

// ═══ Mobile FAB ═══
function MobileFAB({ currentPage, navigate, fabOpen, setFabOpen }: { currentPage: Page; navigate: (p: Page) => void; fabOpen: boolean; setFabOpen: (o: boolean) => void }) {
  const isMainPage = ['dashboard', 'jobs', 'customers'].includes(currentPage);
  if (!isMainPage) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50">
      {fabOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-2 slide-up">
          {[
            { page: 'job-form' as Page, icon: <Briefcase size={16} className="text-blue-600" />, label: 'নতুন কাজ', bg: 'bg-blue-100' },
            { page: 'customer-form' as Page, icon: <Users size={16} className="text-green-600" />, label: 'নতুন গ্রাহক', bg: 'bg-green-100' },
            { page: 'transaction-form' as Page, icon: <span className="text-purple-600 text-xs font-bold">৳</span>, label: 'নতুন হিসাব', bg: 'bg-purple-100' },
            { page: 'reminder-form' as Page, icon: <span className="text-orange-600 text-sm">⏰</span>, label: 'রিমাইন্ডার', bg: 'bg-orange-100' },
          ].map(item => (
            <button key={item.page} onClick={() => { navigate(item.page); setFabOpen(false); }}
              className="flex items-center gap-2 bg-white shadow-lg rounded-full px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all whitespace-nowrap">
              <span className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center`}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
      {fabOpen && <div className="fixed inset-0 bg-black/20 z-[-1]" onClick={() => setFabOpen(false)} />}
      <button onClick={() => setFabOpen(!fabOpen)}
        className={`relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${fabOpen ? 'bg-red-500 rotate-45' : 'bg-primary fab-pulse'}`}>
        {fabOpen ? <X size={24} className="text-white" /> : <Plus size={28} className="text-white" />}
      </button>
    </div>
  );
}

// ═══ Mobile Bottom Nav with "আরও" menu ═══
const MORE_MENU_ITEMS: { page: Page; icon: ReactNode; label: string }[] = [
  { page: 'transaction-list', icon: <FileText size={20} />, label: 'হিসাব' },
  { page: 'reports', icon: <PieChart size={20} />, label: 'রিপোর্ট' },
  { page: 'due-list', icon: <AlertTriangle size={20} />, label: 'বাকি তালিকা' },
  { page: 'reminders', icon: <Clock size={20} />, label: 'রিমাইন্ডার' },
  { page: 'calendar', icon: <Calendar size={20} />, label: 'ক্যালেন্ডার' },
  { page: 'cloud-sync', icon: <Cloud size={20} />, label: 'ক্লাউড সিঙ্ক' },
  { page: 'settings', icon: <Settings size={20} />, label: 'সেটিংস' },
  { page: 'notifications', icon: <span className="text-lg">🔔</span>, label: 'নোটিফিকেশন' },
];

function MobileBottomNav({ currentPage, navigate }: { currentPage: Page; navigate: (p: Page) => void }) {
  const [showMore, setShowMore] = useState(false);
  const isMainPage = ['dashboard', 'jobs', 'customers'].includes(currentPage);
  const isMorePage = MORE_MENU_ITEMS.some(m => m.page === currentPage);

  if (!isMainPage && !isMorePage) return null;

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div className="fixed inset-0 z-[45]" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-20 left-3 right-3 bg-white rounded-3xl shadow-xl border border-gray-200/60 p-4 slide-up" onClick={e => e.stopPropagation()}>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">আরও অপশন</p>
            <div className="grid grid-cols-4 gap-2">
              {MORE_MENU_ITEMS.map(item => (
                <button key={item.page} onClick={() => { navigate(item.page); setShowMore(false); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95 ${currentPage === item.page ? 'bg-primary-50 text-primary' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {item.icon}
                  <span className="text-[10px] font-semibold leading-tight text-center">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 p-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="glass-nav rounded-[28px] flex items-center justify-around py-2 px-2">
          <NavItem icon={<Home size={22} />} label="হোম" active={currentPage === 'dashboard'} onClick={() => navigate('dashboard')} />
          <NavItem icon={<Briefcase size={22} />} label="কাজ" active={currentPage === 'jobs'} onClick={() => navigate('jobs')} />
          <NavItem icon={<Users size={22} />} label="গ্রাহক" active={currentPage === 'customers'} onClick={() => navigate('customers')} />
          <NavItem icon={<MoreHorizontal size={22} />} label="আরও" active={isMorePage || showMore} onClick={() => setShowMore(!showMore)} />
        </div>
      </nav>
    </>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all min-w-[56px] ${active ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
      <div className={`transition-all ${active ? 'scale-110' : ''}`}>{icon}</div>
      <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>{label}</span>
      {active && <div className="w-4 h-0.5 bg-primary rounded-full" />}
    </button>
  );
}

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import useResponsive from '../../hooks/useResponsive';
import type { Page } from '../../App';
import { Home, Briefcase, Users, Plus, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  currentPage: Page;
  navigate: (page: Page, params?: Record<string, string>) => void;
  fabOpen: boolean;
  setFabOpen: (open: boolean) => void;
}

export default function ResponsiveLayout({ 
  children, 
  currentPage, 
  navigate, 
  fabOpen, 
  setFabOpen 
}: Props) {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // মোবাইল লেআউট
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Main Content */}
        <div className="pb-20">
          <div className="page-enter">
            {children}
          </div>
        </div>

        {/* FAB Button - মোবাইলে */}
        <MobileFAB 
          currentPage={currentPage}
          navigate={navigate}
          fabOpen={fabOpen}
          setFabOpen={setFabOpen}
        />

        {/* Bottom Navigation - মোবাইলে */}
        <MobileBottomNav currentPage={currentPage} navigate={navigate} />
      </div>
    );
  }

  // ট্যাবলেট ও ডেস্কটপ লেআউট
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar 
        currentPage={currentPage} 
        navigate={navigate} 
        collapsed={isTablet}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className={`min-h-screen ${isDesktop ? 'p-6' : 'p-4'}`}>
          <div className="page-enter max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

// মোবাইল FAB বাটন
function MobileFAB({ currentPage, navigate, fabOpen, setFabOpen }: {
  currentPage: Page;
  navigate: (page: Page) => void;
  fabOpen: boolean;
  setFabOpen: (open: boolean) => void;
}) {
  const isMainPage = ['dashboard', 'jobs', 'customers'].includes(currentPage);
  
  if (!isMainPage) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50">
      {/* FAB menu items */}
      {fabOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-2 slide-up">
          <button
            onClick={() => { navigate('job-form'); setFabOpen(false); }}
            className="flex items-center gap-2 bg-white shadow-lg rounded-full px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 transition-all whitespace-nowrap"
          >
            <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Briefcase size={16} className="text-blue-600" />
            </span>
            নতুন কাজ
          </button>
          <button
            onClick={() => { navigate('customer-form'); setFabOpen(false); }}
            className="flex items-center gap-2 bg-white shadow-lg rounded-full px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-green-50 transition-all whitespace-nowrap"
          >
            <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Users size={16} className="text-green-600" />
            </span>
            নতুন গ্রাহক
          </button>
          <button
            onClick={() => { navigate('transaction-form'); setFabOpen(false); }}
            className="flex items-center gap-2 bg-white shadow-lg rounded-full px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-purple-50 transition-all whitespace-nowrap"
          >
            <span className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-purple-600 text-xs font-bold">৳</span>
            </span>
            নতুন হিসাব
          </button>
          <button
            onClick={() => { navigate('reminder-form'); setFabOpen(false); }}
            className="flex items-center gap-2 bg-white shadow-lg rounded-full px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-orange-50 transition-all whitespace-nowrap"
          >
            <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-orange-600 text-sm">⏰</span>
            </span>
            রিমাইন্ডার
          </button>
        </div>
      )}
      
      {/* Overlay */}
      {fabOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[-1]"
          onClick={() => setFabOpen(false)}
        />
      )}
      
      {/* FAB button */}
      <button
        onClick={() => setFabOpen(!fabOpen)}
        className={`relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          fabOpen
            ? 'bg-red-500 rotate-45'
            : 'bg-primary fab-pulse'
        }`}
      >
        {fabOpen ? (
          <X size={24} className="text-white" />
        ) : (
          <Plus size={28} className="text-white" />
        )}
      </button>
    </div>
  );
}

// মোবাইল বটম নেভিগেশন
function MobileBottomNav({ currentPage, navigate }: {
  currentPage: Page;
  navigate: (page: Page) => void;
}) {
  const isMainPage = ['dashboard', 'jobs', 'customers'].includes(currentPage);
  
  if (!isMainPage) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex items-center justify-around py-1">
        <NavItem
          icon={<Home size={22} />}
          label="হোম"
          active={currentPage === 'dashboard'}
          onClick={() => navigate('dashboard')}
        />
        <NavItem
          icon={<Briefcase size={22} />}
          label="কাজ"
          active={currentPage === 'jobs'}
          onClick={() => navigate('jobs')}
        />
        <NavItem
          icon={<Users size={22} />}
          label="গ্রাহক"
          active={currentPage === 'customers'}
          onClick={() => navigate('customers')}
        />
      </div>
    </nav>
  );
}

function NavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-all ${
        active
          ? 'text-primary'
          : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <div className={`transition-all ${active ? 'scale-110' : ''}`}>
        {icon}
      </div>
      <span className={`text-xs font-medium ${active ? 'font-semibold' : ''}`}>{label}</span>
      {active && <div className="w-5 h-0.5 bg-primary rounded-full mt-0.5" />}
    </button>
  );
}

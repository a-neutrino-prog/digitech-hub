import { useState, useCallback, useEffect } from 'react';
import ResponsiveLayout from './components/layout/ResponsiveLayout';
import LoginScreen from './components/LoginScreen';
import PinLock from './components/PinLock';
import Dashboard from './components/Dashboard';
import JobList from './components/JobList';
import CustomerList from './components/CustomerList';
import JobForm from './components/JobForm';
import CustomerForm from './components/CustomerForm';
import JobDetail from './components/JobDetail';
import CustomerDetail from './components/CustomerDetail';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import Reports from './components/Reports';
import Settings from './components/Settings';
import NotificationPanel from './components/NotificationPanel';
import DueList from './components/DueList';
import ReminderList from './components/ReminderList';
import ReminderForm from './components/ReminderForm';
import CalendarView from './components/CalendarView';
import CloudSync from './components/CloudSync';
import { isPinEnabled, getDarkMode } from './store';
import { listenAuth, getCurrentUser, startRealtimeSync, isRealtimeActive, enableAutoUpload } from './firebase/sync';
import { isFirebaseConfigured } from './firebase/config';

export type Page =
  | 'dashboard'
  | 'jobs'
  | 'customers'
  | 'job-form'
  | 'customer-form'
  | 'job-detail'
  | 'customer-detail'
  | 'transaction-form'
  | 'transaction-list'
  | 'reports'
  | 'settings'
  | 'notifications'
  | 'due-list'
  | 'reminders'
  | 'reminder-form'
  | 'calendar'
  | 'cloud-sync';

export interface NavigationState {
  page: Page;
  params?: Record<string, string>;
}

export default function App() {
  const [nav, setNav] = useState<NavigationState>({ page: 'dashboard' });
  const [fabOpen, setFabOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [locked, setLocked] = useState(isPinEnabled());
  const [user, setUser] = useState(getCurrentUser());
  const [authChecking, setAuthChecking] = useState(true);

  // Init dark mode and Auth
  useEffect(() => {
    if (getDarkMode()) {
      document.documentElement.classList.add('dark');
    }
    
    // Listen to Firebase Auth
    const unsub = listenAuth((u) => {
      setUser(u);
      setAuthChecking(false);
      
      // Auto enable real-time sync for logged in users
      if (u && !isRealtimeActive()) {
        startRealtimeSync(() => {
          setRefreshKey(k => k + 1);
        });
        enableAutoUpload();
        localStorage.setItem('realtime_sync', 'true');
      }
    });
    
    return () => unsub();
  }, []);

  const navigate = useCallback((page: Page, params?: Record<string, string>) => {
    setNav({ page, params });
    setFabOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  // Loading Screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Mandatory Login Screen
  if (!user && isFirebaseConfigured()) {
    return <LoginScreen />;
  }

  // PIN Lock Screen
  if (locked) {
    return <PinLock onUnlock={() => setLocked(false)} />;
  }

  const renderPage = () => {
    switch (nav.page) {
      case 'dashboard':
        return <Dashboard key={refreshKey} navigate={navigate} />;
      case 'jobs':
        return <JobList key={refreshKey} navigate={navigate} />;
      case 'customers':
        return <CustomerList key={refreshKey} navigate={navigate} />;
      case 'job-form':
        return <JobForm navigate={navigate} refresh={refresh} editId={nav.params?.editId} />;
      case 'customer-form':
        return <CustomerForm navigate={navigate} refresh={refresh} editId={nav.params?.editId} />;
      case 'job-detail':
        return <JobDetail navigate={navigate} refresh={refresh} jobId={nav.params?.jobId || ''} />;
      case 'customer-detail':
        return <CustomerDetail key={refreshKey} navigate={navigate} refresh={refresh} customerId={nav.params?.customerId || ''} />;
      case 'transaction-form':
        return <TransactionForm navigate={navigate} refresh={refresh} editId={nav.params?.editId} />;
      case 'transaction-list':
        return <TransactionList key={refreshKey} navigate={navigate} />;
      case 'reports':
        return <Reports navigate={navigate} />;
      case 'settings':
        return <Settings navigate={navigate} refresh={refresh} />;
      case 'notifications':
        return <NotificationPanel navigate={navigate} />;
      case 'due-list':
        return <DueList key={refreshKey} navigate={navigate} refresh={refresh} />;
      case 'reminders':
        return <ReminderList key={refreshKey} navigate={navigate} />;
      case 'reminder-form':
        return <ReminderForm navigate={navigate} refresh={refresh} editId={nav.params?.editId} />;
      case 'calendar':
        return <CalendarView key={refreshKey} navigate={navigate} />;
      case 'cloud-sync':
        return <CloudSync navigate={navigate} refresh={refresh} />;
      default:
        return <Dashboard key={refreshKey} navigate={navigate} />;
    }
  };

  return (
    <ResponsiveLayout
      currentPage={nav.page}
      navigate={navigate}
      fabOpen={fabOpen}
      setFabOpen={setFabOpen}
    >
      {renderPage()}
    </ResponsiveLayout>
  );
}

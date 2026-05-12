import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';

type ToastType = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: string;
  title: string;
  desc?: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: {
    success: (title: string, desc?: string) => void;
    error: (title: string, desc?: string) => void;
    warning: (title: string, desc?: string) => void;
    info: (title: string, desc?: string) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, desc?: string) => {
    const id = Date.now().toString(36);
    setToasts(prev => [...prev, { id, title, desc, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (title: string, desc?: string) => addToast('success', title, desc),
    error: (title: string, desc?: string) => addToast('error', title, desc),
    warning: (title: string, desc?: string) => addToast('warning', title, desc),
    info: (title: string, desc?: string) => addToast('info', title, desc),
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

const ICONS: Record<ToastType, string> = {
  success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️'
};

const BORDER_COLORS: Record<ToastType, string> = {
  success: '#22C55E', error: '#F43F5E', warning: '#F59E0B', info: '#3B82F6'
};

function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast-item"
          style={{ borderLeft: `3px solid ${BORDER_COLORS[t.type]}` }}
        >
          <span className="text-xl flex-shrink-0">{ICONS[t.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{t.title}</p>
            {t.desc && <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>}
          </div>
          <button
            onClick={() => onClose(t.id)}
            className="text-slate-500 hover:text-white text-sm flex-shrink-0 ml-2"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { ConfirmDialog } from '../components/ui/Modal';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: { title: '', message: '' },
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const handleClose = () => {
    state.resolve?.(false);
    setState(s => ({ ...s, open: false, resolve: null }));
  };

  const handleConfirm = () => {
    state.resolve?.(true);
    setState(s => ({ ...s, open: false, resolve: null }));
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        open={state.open}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={state.options.title}
        message={state.options.message}
        confirmText={state.options.confirmText}
        cancelText={state.options.cancelText}
        danger={state.options.danger}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be inside ConfirmProvider');
  return ctx.confirm;
}

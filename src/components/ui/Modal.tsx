import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, subtitle, children }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm fade-in" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl md:rounded-3xl p-6 pb-8 slide-up z-10 max-h-[85vh] overflow-y-auto"
        style={{ boxShadow: '0 -10px 40px rgba(0,0,0,0.15)' }}>
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-5 md:hidden" />

        {title && <h3 className="text-lg font-bold text-gray-800 mb-1">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-500 mb-5">{subtitle}</p>}

        {children}
      </div>
    </div>
  );
}

// Confirm Dialog — alert()/confirm() replacement
interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'নিশ্চিত', cancelText = 'বাতিল', danger = false }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
          style={{ background: danger ? '#FFF1F2' : '#EFF6FF' }}>
          {danger ? '⚠️' : 'ℹ️'}
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose}
          className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-gray-100 text-gray-700 border border-gray-200 active:scale-[0.97] transition-all">
          {cancelText}
        </button>
        <button onClick={() => { onConfirm(); onClose(); }}
          className={`flex-1 py-3 rounded-2xl font-semibold text-sm text-white active:scale-[0.97] transition-all ${
            danger
              ? 'bg-gradient-to-r from-danger to-danger-dark shadow-[0_8px_24px_rgba(244,63,94,0.2)]'
              : 'bg-gradient-to-r from-primary to-primary-dark shadow-[0_8px_24px_rgba(37,99,235,0.2)]'
          }`}>
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

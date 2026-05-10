import { useState } from 'react';
import { formatTaka } from '../store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => void;
  maxAmount: number;
  customerName?: string;
}

export default function DuePaymentModal({ isOpen, onClose, onSubmit, maxAmount, customerName }: Props) {
  const [amount, setAmount] = useState<string>(maxAmount.toString());

  // Reset amount when modal opens with new maxAmount
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(amount, 10);
    if (!isNaN(val) && val > 0 && val <= maxAmount) {
      onSubmit(val);
      onClose();
    } else {
      alert('সঠিক টাকার পরিমাণ দিন!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">বাকি আদায়</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {customerName && (
             <p className="text-sm text-gray-600">গ্রাহক: <span className="font-semibold text-gray-800">{customerName}</span></p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              টাকার পরিমাণ (সর্বোচ্চ {formatTaka(maxAmount)})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              max={maxAmount}
              min="1"
              required
              autoFocus
            />
          </div>
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium text-sm"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-medium text-sm"
            >
              আদায় করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

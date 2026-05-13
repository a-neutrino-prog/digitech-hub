import { useState } from 'react';
import { addTransaction, updateTransaction, getTransactions, EXPENSE_CATEGORIES } from '../store';
import { useToast } from '../hooks/useToast';
import type { Page } from '../App';
import { ArrowLeft, Save, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
  refresh: () => void;
  editId?: string;
}

const INCOME_CATEGORIES = ['সেবা', 'স্টক বিক্রি', 'অন্যান্য আয়'];

export default function TransactionForm({ navigate, refresh, editId }: Props) {
  const { toast } = useToast();
  const existingTx = editId ? getTransactions().find(t => t.id === editId) : null;

  const [type, setType] = useState<'income' | 'expense'>(existingTx?.type || 'expense');
  const [category, setCategory] = useState(existingTx?.category || '');
  const [amount, setAmount] = useState(existingTx?.amount?.toString() || '');
  const [description, setDescription] = useState(existingTx?.description || '');

  const handleSave = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) { toast.error('সঠিক টাকার পরিমাণ দিন'); return; }
    if (!category) { toast.error('ক্যাটাগরি নির্বাচন করুন'); return; }

    const txData = { type, category, amount: amountNum, description: description.trim(), date: existingTx?.date || Date.now() };
    if (editId) { updateTransaction(editId, txData); toast.success('হিসাব আপডেট হয়েছে'); }
    else { addTransaction(txData); toast.success('হিসাব যোগ হয়েছে'); }

    refresh();
    navigate('transaction-list');
  };

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-200/60 flex items-center gap-3">
        <button onClick={() => navigate('transaction-list')} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center" aria-label="ফিরে যান">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-800">{editId ? '✏️ হিসাব এডিট' : '➕ নতুন হিসাব'}</h2>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Type Toggle */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">ধরন নির্বাচন</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setType('income'); setCategory(''); }}
              className={`py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
                type === 'income'
                  ? 'text-white shadow-md'
                  : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`}
              style={type === 'income' ? { background: 'linear-gradient(135deg, #22C55E, #15803D)', boxShadow: '0 6px 20px rgba(34,197,94,0.25)' } : undefined}>
              <TrendingUp size={18} /> আয়
            </button>
            <button onClick={() => { setType('expense'); setCategory(''); }}
              className={`py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
                type === 'expense'
                  ? 'text-white shadow-md'
                  : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`}
              style={type === 'expense' ? { background: 'linear-gradient(135deg, #F43F5E, #BE123C)', boxShadow: '0 6px 20px rgba(244,63,94,0.25)' } : undefined}>
              <TrendingDown size={18} /> ব্যয়
            </button>
          </div>
        </div>

        {/* Amount — Big input */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">পরিমাণ</p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-2xl">৳</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-3xl font-extrabold text-center tracking-tight form-input-wc"
              autoFocus />
          </div>
        </div>

        {/* Category Chips */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">ক্যাটাগরি</p>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  category === cat
                    ? type === 'income'
                      ? 'bg-success text-white shadow-sm'
                      : 'bg-danger text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">বিবরণ (ঐচ্ছিক)</p>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="কোনো বিবরণ থাকলে লিখুন..."
            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm resize-none h-20 form-input-wc" />
        </div>

        {/* Save */}
        <button onClick={handleSave}
          className="w-full py-4 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
          style={{
            background: type === 'income' ? 'linear-gradient(135deg, #22C55E, #15803D)' : 'linear-gradient(135deg, #F43F5E, #BE123C)',
            boxShadow: type === 'income' ? '0 8px 24px rgba(34,197,94,0.25)' : '0 8px 24px rgba(244,63,94,0.25)',
          }}>
          <Save size={18} />
          {editId ? 'আপডেট করুন' : 'হিসাব সেভ করুন'}
        </button>
      </div>
    </div>
  );
}

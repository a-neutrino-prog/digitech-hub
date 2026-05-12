import { useState } from 'react';
import { addTransaction, updateTransaction, getTransactions, EXPENSE_CATEGORIES } from '../store';
import { useToast } from '../hooks/useToast';
import type { Page } from '../App';
import { ArrowLeft, Save } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
  refresh: () => void;
  editId?: string;
}

export default function TransactionForm({ navigate, refresh, editId }: Props) {
  const { toast } = useToast();
  const existingTx = editId ? getTransactions().find(t => t.id === editId) : null;

  const [type, setType] = useState<'income' | 'expense'>(existingTx?.type || 'expense');
  const [category, setCategory] = useState(existingTx?.category || '');
  const [amount, setAmount] = useState(existingTx?.amount?.toString() || '');
  const [description, setDescription] = useState(existingTx?.description || '');

  const incomeCategories = ['সেবা', 'স্টক বিক্রি', 'অন্যান্য আয়'];

  const handleSave = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('সঠিক টাকার পরিমাণ লিখুন');
      return;
    }
    if (!category) {
      toast.error('ক্যাটাগরি নির্বাচন করুন');
      return;
    }

    const txData = {
      type,
      category,
      amount: amountNum,
      description: description.trim(),
      date: existingTx?.date || Date.now(),
    };

    if (editId) {
      updateTransaction(editId, txData);
    } else {
      addTransaction(txData);
    }

    refresh();
    navigate('transaction-list');
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-800">
          {editId ? 'হিসাব এডিট' : 'নতুন হিসাব যোগ'}
        </h2>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Type Toggle */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-sm font-semibold text-gray-700 mb-3 block">ধরন নির্বাচন করুন</label>
          <div className="flex gap-2">
            <button
              onClick={() => { setType('income'); setCategory(''); }}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                type === 'income'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              📈 আয়
            </button>
            <button
              onClick={() => { setType('expense'); setCategory(''); }}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                type === 'expense'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              📉 ব্যয়
            </button>
          </div>
        </div>

        {/* Category */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">ক্যাটাগরি</label>
          <div className="flex flex-wrap gap-2">
            {(type === 'income' ? incomeCategories : EXPENSE_CATEGORIES).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  category === cat
                    ? type === 'income'
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">টাকার পরিমাণ</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-bold">৳</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              autoFocus
            />
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">বিবরণ (ঐচ্ছিক)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="কোনো বিবরণ থাকলে লিখুন..."
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`w-full py-3.5 text-white rounded-2xl font-semibold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
            type === 'income'
              ? 'bg-green-500 shadow-green-200'
              : 'bg-red-500 shadow-red-200'
          }`}
        >
          <Save size={18} />
          {editId ? 'আপডেট করুন' : 'হিসাব সেভ করুন'}
        </button>
      </div>
    </div>
  );
}

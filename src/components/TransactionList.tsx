import { useState, useMemo } from 'react';
import { getTransactions, deleteTransaction, formatTaka, formatDateShort } from '../store';
import type { Page } from '../App';
import { ArrowLeft, Plus, Trash2, Edit, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

export default function TransactionList({ navigate }: Props) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const transactions = useMemo(() => getTransactions().sort((a, b) => b.date - a.date), []);

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter(t => t.type === filter);
  }, [transactions, filter]);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = totalIncome - totalExpense;

  const handleDelete = (id: string) => {
    if (confirm('এই হিসাব ডিলিট করতে চান?')) {
      deleteTransaction(id);
      window.location.reload();
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <h2 className="text-lg font-bold text-gray-800">হিসাব-নিকাশ</h2>
        </div>
        <button
          onClick={() => navigate('transaction-form')}
          className="w-9 h-9 rounded-full bg-primary flex items-center justify-center"
        >
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {/* Summary */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <TrendingUp size={16} className="text-green-500 mx-auto mb-1" />
            <p className="text-[10px] text-green-600">মোট আয়</p>
            <p className="text-sm font-bold text-green-700">{formatTaka(totalIncome)}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <TrendingDown size={16} className="text-red-500 mx-auto mb-1" />
            <p className="text-[10px] text-red-600">মোট ব্যয়</p>
            <p className="text-sm font-bold text-red-700">{formatTaka(totalExpense)}</p>
          </div>
          <div className={`${profit >= 0 ? 'bg-blue-50' : 'bg-orange-50'} rounded-xl p-3 text-center`}>
            <p className="text-lg mb-0.5">{profit >= 0 ? '📈' : '📉'}</p>
            <p className={`text-[10px] ${profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {profit >= 0 ? 'লাভ' : 'ক্ষতি'}
            </p>
            <p className={`text-sm font-bold ${profit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              {formatTaka(Math.abs(profit))}
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 flex gap-1.5">
        {[
          { value: 'all', label: 'সব' },
          { value: 'income', label: 'আয়' },
          { value: 'expense', label: 'ব্যয়' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value as 'all' | 'income' | 'expense')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === opt.value
                ? 'bg-primary text-white'
                : 'bg-white text-gray-500 hover:bg-gray-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="px-4 py-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-2">💰</div>
            <p className="text-gray-400 text-sm">কোনো হিসাব নেই</p>
          </div>
        ) : (
          filtered.map(tx => (
            <div key={tx.id} className="bg-white rounded-xl shadow-sm p-3.5 card-hover">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  tx.type === 'income' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {tx.type === 'income' ? (
                    <TrendingUp size={18} className="text-green-500" />
                  ) : (
                    <TrendingDown size={18} className="text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700 truncate">{tx.category}</p>
                    <p className={`text-sm font-bold ${
                      tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}{formatTaka(tx.amount)}
                    </p>
                  </div>
                  {tx.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{tx.description}</p>
                  )}
                  <p className="text-[10px] text-gray-300 mt-0.5">{formatDateShort(tx.date)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => navigate('transaction-form', { editId: tx.id })}
                    className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center"
                  >
                    <Edit size={12} className="text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

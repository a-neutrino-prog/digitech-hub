import { useState, useMemo } from 'react';
import { getTransactions, deleteTransaction, formatTaka } from '../store';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import type { Page } from '../App';
import { ArrowLeft, Plus, Trash2, Edit, TrendingUp, TrendingDown, Search, Calendar, Filter, X } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

export default function TransactionList({ navigate }: Props) {
  const cfm = useConfirm();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [ver, setVer] = useState(0);

  const allTx = useMemo(() => getTransactions().sort((a, b) => b.date - a.date), [ver]);

  const filtered = useMemo(() => {
    return allTx.filter(t => {
      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Search
      if (search) {
        const q = search.toLowerCase();
        if (!t.category.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false;
      }

      // Date range
      if (dateRange === 'today') {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (t.date < today.getTime()) return false;
      } else if (dateRange === 'week') {
        const week = new Date(); week.setDate(week.getDate() - 7);
        if (t.date < week.getTime()) return false;
      } else if (dateRange === 'month') {
        const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
        if (t.date < month.getTime()) return false;
      } else if (dateRange === 'custom' && customFrom && customTo) {
        const from = new Date(customFrom).getTime();
        const to = new Date(customTo).getTime() + 86400000;
        if (t.date < from || t.date > to) return false;
      }

      return true;
    });
  }, [allTx, typeFilter, search, dateRange, customFrom, customTo]);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = totalIncome - totalExpense;

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(t => {
      const key = new Date(t.date).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filtered]);

  const handleDelete = async (id: string) => {
    const ok = await cfm({ title: 'হিসাব ডিলিট', message: 'এই হিসাব ডিলিট করতে চান?', danger: true, confirmText: 'ডিলিট' });
    if (ok) { deleteTransaction(id); setVer(v => v + 1); toast.success('হিসাব ডিলিট হয়েছে'); }
  };

  const dateRangeLabel: Record<string, string> = { all: 'সব সময়', today: 'আজ', week: 'এই সপ্তাহ', month: 'এই মাস', custom: 'কাস্টম' };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-200/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('dashboard')} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center" aria-label="ফিরে যান">
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-800">💰 হিসাব-নিকাশ</h2>
          </div>
          <button onClick={() => navigate('transaction-form')} className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center" aria-label="নতুন হিসাব">
            <Plus size={18} className="text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ক্যাটাগরি বা বিবরণ খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm form-input-wc" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-gray-400" /></button>}
        </div>

        {/* Date Range */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
          {(['all', 'today', 'week', 'month', 'custom'] as const).map(d => (
            <button key={d} onClick={() => { setDateRange(d); if (d === 'custom') setShowDatePicker(true); else setShowDatePicker(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${dateRange === d ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
              {d === 'custom' && <Calendar size={12} />}
              {dateRangeLabel[d]}
            </button>
          ))}
        </div>

        {/* Custom Date Picker */}
        {showDatePicker && dateRange === 'custom' && (
          <div className="flex gap-2 mb-3 fade-in">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
            <span className="text-gray-400 self-center text-xs">→</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
          </div>
        )}

        {/* Type Filter */}
        <div className="flex gap-1.5">
          {([{ v: 'all', l: 'সব', icon: <Filter size={12} /> }, { v: 'income', l: 'আয়', icon: <TrendingUp size={12} /> }, { v: 'expense', l: 'ব্যয়', icon: <TrendingDown size={12} /> }] as const).map(opt => (
            <button key={opt.v} onClick={() => setTypeFilter(opt.v)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${typeFilter === opt.v ? opt.v === 'income' ? 'bg-success-light text-success-dark' : opt.v === 'expense' ? 'bg-danger-light text-danger-dark' : 'bg-primary-50 text-primary' : 'bg-gray-50 text-gray-500'}`}>
              {opt.icon}{opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl border border-gray-200/60 p-3 text-center">
            <TrendingUp size={14} className="text-success mx-auto mb-1" />
            <p className="text-[10px] text-gray-400">আয়</p>
            <p className="text-sm font-bold text-success">{formatTaka(totalIncome)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/60 p-3 text-center">
            <TrendingDown size={14} className="text-danger mx-auto mb-1" />
            <p className="text-[10px] text-gray-400">ব্যয়</p>
            <p className="text-sm font-bold text-danger">{formatTaka(totalExpense)}</p>
          </div>
          <div className={`bg-white rounded-2xl border border-gray-200/60 p-3 text-center`}>
            <p className="text-lg mb-0.5">{profit >= 0 ? '📈' : '📉'}</p>
            <p className="text-[10px] text-gray-400">{profit >= 0 ? 'লাভ' : 'ক্ষতি'}</p>
            <p className={`text-sm font-bold ${profit >= 0 ? 'text-primary' : 'text-warning'}`}>{formatTaka(Math.abs(profit))}</p>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-2">{filtered.length}টি লেনদেন — {dateRangeLabel[dateRange]}</p>
      </div>

      {/* Transaction List — Grouped by Date */}
      <div className="px-4 pb-6 space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/60 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-3xl mx-auto mb-3 empty-illustration">💰</div>
            <p className="text-gray-500 font-medium">কোনো হিসাব পাওয়া যায়নি</p>
            <button onClick={() => navigate('transaction-form')} className="mt-2 text-primary text-sm font-semibold">+ হিসাব যোগ করুন</button>
          </div>
        ) : (
          Object.entries(grouped).map(([date, txs]) => (
            <div key={date}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{date}</p>
              <div className="space-y-2">
                {txs.map((tx, i) => (
                  <div key={tx.id} className={`animate-item bg-white rounded-2xl border border-gray-200/60 p-4 card-hover`} style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'income' ? 'bg-success-light' : 'bg-danger-light'}`}>
                        {tx.type === 'income' ? <TrendingUp size={18} className="text-success" /> : <TrendingDown size={18} className="text-danger" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-700 truncate">{tx.category}</p>
                          <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                            {tx.type === 'income' ? '+' : '-'}{formatTaka(tx.amount)}
                          </p>
                        </div>
                        {tx.description && <p className="text-xs text-gray-400 truncate mt-0.5">{tx.description}</p>}
                      </div>
                      <div className="flex flex-col gap-1 ml-1">
                        <button onClick={() => navigate('transaction-form', { editId: tx.id })} className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center" aria-label="এডিট">
                          <Edit size={12} className="text-blue-500" />
                        </button>
                        <button onClick={() => handleDelete(tx.id)} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center" aria-label="ডিলিট">
                          <Trash2 size={12} className="text-danger" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

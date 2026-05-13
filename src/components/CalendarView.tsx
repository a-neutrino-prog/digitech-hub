import { useState, useMemo } from 'react';
import { getJobs, getTransactions, getCustomers, getCustomerById, getServices, addJob, addTransaction, formatTaka, EXPENSE_CATEGORIES } from '../store';
import { useToast } from '../hooks/useToast';
import type { Page } from '../App';
import useResponsive from '../hooks/useResponsive';
import Modal from './ui/Modal';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Briefcase, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

const WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

export default function CalendarView({ navigate }: Props) {
  const { isMobile } = useResponsive();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [ver, setVer] = useState(0);

  // Quick-add modals
  const [showJobModal, setShowJobModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);

  // Quick job form
  const [qCustomerId, setQCustomerId] = useState('');
  const [qServiceId, setQServiceId] = useState('');
  const [qQty, setQQty] = useState('1');
  const [qNote, setQNote] = useState('');

  // Quick transaction form
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txCategory, setTxCategory] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const allJobs = useMemo(() => getJobs(), [ver]);
  const allTxs = useMemo(() => getTransactions(), [ver]);
  const customers = useMemo(() => getCustomers(), []);
  const services = useMemo(() => getServices().filter(s => s.isActive), []);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [year, month]);

  const jobsByDay = useMemo(() => {
    const map: Record<number, { count: number; income: number; pending: number }> = {};
    allJobs.forEach(job => {
      const d = new Date(job.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = { count: 0, income: 0, pending: 0 };
        map[day].count++;
        if (job.status !== 'cancelled') map[day].income += job.totalAmount;
        if (job.status === 'pending' || job.status === 'in-progress') map[day].pending++;
      }
    });
    return map;
  }, [allJobs, year, month]);

  // Selected date data
  const selStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
  const selEnd = selStart + 86400000;

  const dayJobs = useMemo(() => allJobs.filter(j => j.date >= selStart && j.date < selEnd).sort((a, b) => b.createdAt - a.createdAt), [allJobs, selStart, selEnd]);
  const dayTxs = useMemo(() => allTxs.filter(t => t.date >= selStart && t.date < selEnd), [allTxs, selStart, selEnd]);
  const dayIncome = dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const dayExpense = dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const today = new Date();
  const isTodayFn = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isSelectedFn = (day: number) => day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();

  const statusCfg: Record<string, { label: string; cls: string }> = {
    pending: { label: 'পেন্ডিং', cls: 'status-pending' },
    'in-progress': { label: 'চলমান', cls: 'status-in-progress' },
    completed: { label: 'সম্পন্ন', cls: 'status-completed' },
    cancelled: { label: 'বাতিল', cls: 'status-cancelled' },
  };

  // Quick add job
  const handleQuickJob = () => {
    if (!qCustomerId) { toast.error('গ্রাহক সিলেক্ট করুন'); return; }
    if (!qServiceId) { toast.error('সেবা সিলেক্ট করুন'); return; }
    const svc = services.find(s => s.id === qServiceId);
    if (!svc) return;
    const qty = parseInt(qQty) || 1;
    const total = svc.defaultRate * qty;

    addJob({
      customerId: qCustomerId,
      services: [{ serviceId: svc.id, serviceName: svc.name, quantity: qty, rate: svc.defaultRate, total }],
      totalAmount: total,
      advance: 0,
      due: total,
      date: selectedDate.getTime(),
      status: 'pending',
      notes: qNote,
      payments: [],
    });

    toast.success('কাজ যোগ হয়েছে!');
    setShowJobModal(false);
    setQCustomerId(''); setQServiceId(''); setQQty('1'); setQNote('');
    setVer(v => v + 1);
  };

  // Quick add transaction
  const handleQuickTx = () => {
    const amt = parseFloat(txAmount);
    if (!amt || amt <= 0) { toast.error('সঠিক পরিমাণ দিন'); return; }
    if (!txCategory) { toast.error('ক্যাটাগরি সিলেক্ট করুন'); return; }

    addTransaction({
      type: txType,
      category: txCategory,
      amount: amt,
      description: txDesc.trim(),
      date: selectedDate.getTime(),
    });

    toast.success(`${txType === 'income' ? 'আয়' : 'ব্যয়'} যোগ হয়েছে!`);
    setShowTxModal(false);
    setTxAmount(''); setTxCategory(''); setTxDesc('');
    setVer(v => v + 1);
  };

  const selectedLabel = `${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  return (
    <div className={isMobile ? 'bg-gray-100 min-h-screen' : 'space-y-6'}>
      {/* Header */}
      {isMobile ? (
        <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-200/60 flex items-center gap-3">
          <button onClick={() => navigate('dashboard')} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center" aria-label="ফিরে যান">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <h2 className="text-lg font-bold text-gray-800">📅 ক্যালেন্ডার</h2>
        </div>
      ) : (
        <h1 className="text-2xl font-bold text-gray-800">📅 ক্যালেন্ডার ভিউ</h1>
      )}

      <div className={`${isMobile ? 'px-4 py-3 space-y-3' : 'grid grid-cols-3 gap-6'}`}>
        {/* Calendar Grid */}
        <div className={`bg-white rounded-2xl border border-gray-200/60 p-4 ${!isMobile ? 'col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"><ChevronLeft size={18} className="text-gray-600" /></button>
            <h3 className="text-base font-bold text-gray-800">{MONTHS[month]} {year}</h3>
            <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"><ChevronRight size={18} className="text-gray-600" /></button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={i} />;
              const dd = jobsByDay[day];
              return (
                <button key={i} onClick={() => setSelectedDate(new Date(year, month, day))}
                  className={`relative p-1 rounded-xl text-center transition-all min-h-[44px] min-w-[44px] flex flex-col items-center justify-start active:scale-95 ${
                    isSelectedFn(day) ? 'bg-primary text-white shadow-md' : isTodayFn(day) ? 'bg-blue-50 text-primary font-bold' : 'hover:bg-gray-50'
                  }`}>
                  <span className={`text-sm ${isSelectedFn(day) ? 'font-bold' : 'font-medium'}`}>{day}</span>
                  {dd && (
                    <div className="flex gap-0.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelectedFn(day) ? 'bg-white/70' : 'bg-blue-400'}`} />
                      {dd.pending > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelectedFn(day) ? 'bg-yellow-300' : 'bg-yellow-400'}`} />}
                    </div>
                  )}
                  {dd && !isMobile && <span className={`text-[9px] mt-0.5 ${isSelectedFn(day) ? 'text-white/80' : 'text-gray-400'}`}>{dd.count}টি</span>}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> কাজ আছে</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> পেন্ডিং</span>
          </div>
        </div>

        {/* ═══ Side Panel — Selected Day ═══ */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4 space-y-4">
          {/* Date Header */}
          <div>
            <h3 className="text-sm font-bold text-gray-800">📋 {selectedLabel}</h3>
            <p className="text-[10px] text-gray-400">{dayJobs.length}টি কাজ • আয়: {formatTaka(dayIncome)} • ব্যয়: {formatTaka(dayExpense)}</p>
          </div>

          {/* Quick Add Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowJobModal(true)}
              className="py-2.5 bg-primary text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm">
              <Briefcase size={14} /> নতুন কাজ
            </button>
            <button onClick={() => setShowTxModal(true)}
              className="py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-gray-200 active:scale-95 transition-all">
              <Plus size={14} /> আয়/ব্যয়
            </button>
          </div>

          {/* Day Summary */}
          {(dayIncome > 0 || dayExpense > 0) && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 rounded-xl p-2.5 text-center">
                <TrendingUp size={14} className="text-success mx-auto mb-1" />
                <p className="text-[10px] text-gray-400">আয়</p>
                <p className="text-sm font-bold text-success">{formatTaka(dayIncome)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-2.5 text-center">
                <TrendingDown size={14} className="text-danger mx-auto mb-1" />
                <p className="text-[10px] text-gray-400">ব্যয়</p>
                <p className="text-sm font-bold text-danger">{formatTaka(dayExpense)}</p>
              </div>
            </div>
          )}

          {/* Jobs List */}
          {dayJobs.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">📝</div>
              <p className="text-gray-400 text-xs">এই তারিখে কোনো কাজ নেই</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {dayJobs.map(job => {
                const customer = getCustomerById(job.customerId);
                const st = statusCfg[job.status];
                return (
                  <button key={job.id} onClick={() => navigate('job-detail', { jobId: job.id })}
                    className="w-full p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-left transition-all active:scale-[0.98]">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{customer?.name || 'অজানা'}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{job.services.map(s => s.serviceName).join(', ')}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs font-semibold text-gray-700">{formatTaka(job.totalAmount)}</span>
                      {job.due > 0 && <span className="text-[10px] text-orange-600 font-semibold">বাকি: {formatTaka(job.due)}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Transactions for the day */}
          {dayTxs.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">💰 এই দিনের হিসাব</p>
              <div className="space-y-1">
                {dayTxs.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {tx.type === 'income' ? <TrendingUp size={12} className="text-success" /> : <TrendingDown size={12} className="text-danger" />}
                      <span className="text-xs text-gray-600">{tx.category}</span>
                    </div>
                    <span className={`text-xs font-semibold ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatTaka(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Quick Job Modal ═══ */}
      <Modal open={showJobModal} onClose={() => setShowJobModal(false)} title="📋 দ্রুত কাজ যোগ" subtitle={selectedLabel}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">গ্রাহক *</label>
            <select value={qCustomerId} onChange={e => setQCustomerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm form-input-wc">
              <option value="">গ্রাহক নির্বাচন করুন</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">সেবা *</label>
            <select value={qServiceId} onChange={e => setQServiceId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm form-input-wc">
              <option value="">সেবা নির্বাচন করুন</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} (৳{s.defaultRate})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">পরিমাণ</label>
            <input type="number" value={qQty} onChange={e => setQQty(e.target.value)} min="1"
              className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm form-input-wc" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">নোট (ঐচ্ছিক)</label>
            <input type="text" value={qNote} onChange={e => setQNote(e.target.value)} placeholder="বিশেষ নোট..."
              className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm form-input-wc" />
          </div>
          {qServiceId && (
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">মোট</p>
              <p className="text-xl font-bold text-primary">{formatTaka((services.find(s => s.id === qServiceId)?.defaultRate || 0) * (parseInt(qQty) || 1))}</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setShowJobModal(false)} className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-gray-100 text-gray-700 border border-gray-200 active:scale-[0.97] transition-all">বাতিল</button>
          <button onClick={handleQuickJob} className="flex-[2] py-3 rounded-2xl font-semibold text-sm text-white active:scale-[0.97] transition-all"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 8px 24px rgba(37,99,235,0.2)' }}>
            ✅ কাজ যোগ করুন
          </button>
        </div>
      </Modal>

      {/* ═══ Quick Transaction Modal ═══ */}
      <Modal open={showTxModal} onClose={() => setShowTxModal(false)} title="💰 আয়/ব্যয় যোগ" subtitle={selectedLabel}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setTxType('income'); setTxCategory(''); }}
              className={`py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
                txType === 'income' ? 'text-white shadow-md' : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`} style={txType === 'income' ? { background: 'linear-gradient(135deg, #22C55E, #15803D)' } : undefined}>
              <TrendingUp size={16} /> আয়
            </button>
            <button onClick={() => { setTxType('expense'); setTxCategory(''); }}
              className={`py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
                txType === 'expense' ? 'text-white shadow-md' : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`} style={txType === 'expense' ? { background: 'linear-gradient(135deg, #F43F5E, #BE123C)' } : undefined}>
              <TrendingDown size={16} /> ব্যয়
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">পরিমাণ *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">৳</span>
              <input type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-xl font-bold text-center form-input-wc" autoFocus />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">ক্যাটাগরি *</label>
            <div className="flex flex-wrap gap-2">
              {(txType === 'income' ? ['সেবা', 'স্টক বিক্রি', 'অন্যান্য আয়'] : EXPENSE_CATEGORIES).map(cat => (
                <button key={cat} onClick={() => setTxCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                    txCategory === cat
                      ? txType === 'income' ? 'bg-success text-white' : 'bg-danger text-white'
                      : 'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>{cat}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">বিবরণ (ঐচ্ছিক)</label>
            <input type="text" value={txDesc} onChange={e => setTxDesc(e.target.value)} placeholder="বিবরণ..."
              className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm form-input-wc" />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={() => setShowTxModal(false)} className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-gray-100 text-gray-700 border border-gray-200 active:scale-[0.97] transition-all">বাতিল</button>
          <button onClick={handleQuickTx} className="flex-[2] py-3 rounded-2xl font-semibold text-sm text-white active:scale-[0.97] transition-all"
            style={{
              background: txType === 'income' ? 'linear-gradient(135deg, #22C55E, #15803D)' : 'linear-gradient(135deg, #F43F5E, #BE123C)',
              boxShadow: txType === 'income' ? '0 8px 24px rgba(34,197,94,0.2)' : '0 8px 24px rgba(244,63,94,0.2)',
            }}>
            ✅ {txType === 'income' ? 'আয়' : 'ব্যয়'} যোগ
          </button>
        </div>
      </Modal>
    </div>
  );
}

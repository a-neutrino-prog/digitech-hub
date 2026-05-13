import { useState, useMemo } from 'react';
import { getTransactions, getJobs, getCustomerById, formatTaka } from '../store';
import type { Page } from '../App';
import useResponsive from '../hooks/useResponsive';
import { ArrowLeft, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { generateReportPDF } from '../utils/pdf';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

type Period = 'day' | 'week' | 'month' | 'year';

export default function Reports({ navigate }: Props) {
  const { isMobile } = useResponsive();
  const [period, setPeriod] = useState<Period>('month');

  const transactions = useMemo(() => getTransactions(), []);
  const jobs = useMemo(() => getJobs(), []);
  
  const periodLabels: Record<Period, string> = {
    'day': 'আজ',
    'week': 'গত ৭ দিন',
    'month': 'এই মাস',
    'year': 'এই বছর',
  };

  // Filter by period
  const periodStart = useMemo(() => {
    const d = new Date();
    switch (period) {
      case 'day':
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      case 'week':
        d.setDate(d.getDate() - 7);
        return d.getTime();
      case 'month':
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      case 'year':
        d.setMonth(0, 1);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }
  }, [period]);

  const filteredTx = transactions.filter(t => t.date >= periodStart);
  const filteredJobs = jobs.filter(j => j.date >= periodStart);

  const totalIncome = filteredTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = totalIncome - totalExpense;

  // Service-wise income
  const serviceIncome = useMemo(() => {
    const map: Record<string, number> = {};
    filteredJobs.forEach(job => {
      job.services.forEach(s => {
        map[s.serviceName] = (map[s.serviceName] || 0) + s.total;
      });
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name: name.length > 8 ? name.slice(0, 8) + '..' : name, fullName: name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [filteredJobs]);

  // Customer-wise due
  const customerDue = useMemo(() => {
    const map: Record<string, number> = {};
    jobs.filter(j => j.status !== 'cancelled' && j.due > 0).forEach(j => {
      map[j.customerId] = (map[j.customerId] || 0) + j.due;
    });
    return Object.entries(map)
      .map(([customerId, due]) => ({
        name: getCustomerById(customerId)?.name || 'অজানা',
        due,
      }))
      .sort((a, b) => b.due - a.due)
      .slice(0, 5);
  }, [jobs]);

  // Expense by category (for pie chart)
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTx.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTx]);

  // Daily income trend (for line chart)
  const dailyTrend = useMemo(() => {
    const days: Record<string, { income: number; expense: number }> = {};
    const numDays = period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 12;

    for (let i = 0; i < Math.min(numDays, 30); i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getDate()}/${d.getMonth() + 1}`;
      days[key] = { income: 0, expense: 0 };
    }

    filteredTx.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getDate()}/${d.getMonth() + 1}`;
      if (days[key]) {
        if (t.type === 'income') days[key].income += t.amount;
        else days[key].expense += t.amount;
      }
    });

    return Object.entries(days)
      .map(([date, data]) => ({ date, ...data }))
      .reverse();
  }, [filteredTx, period]);

  const COLORS = ['#2563EB', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#ec4899', '#06b6d4'];

  const handleExportPDF = () => {
    const data = serviceIncome.map(s => ({
      label: s.fullName,
      value: s.amount,
    }));
    generateReportPDF(
      'আয়-ব্যয় রিপোর্ট',
      periodLabels[period],
      totalIncome,
      totalExpense,
      data
    );
  };

  return (
    <div className={`bg-gray-100 min-h-screen ${!isMobile ? 'p-0' : ''}`}>
      {/* Header */}
      <div className={`bg-white flex items-center justify-between ${isMobile ? 'px-4 pt-4 pb-3 border-b border-gray-200/60' : 'px-6 py-4 rounded-2xl border border-gray-200/60 mb-6'}`}>
        <div className="flex items-center gap-3">
          {isMobile && (
            <button onClick={() => navigate('dashboard')} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center" aria-label="ফিরে যান">
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
          )}
          <h2 className={`font-bold text-gray-800 ${isMobile ? 'text-lg' : 'text-2xl'}`}>📊 রিপোর্ট ও বিশ্লেষণ</h2>
        </div>
        <button onClick={handleExportPDF}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 6px 20px rgba(37,99,235,0.2)' }}>
          <Download size={16} /> PDF
        </button>
      </div>

      {/* Period Selector */}
      {/* Period Selector */}
      <div className="px-4 py-3">
        <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 border border-gray-200/60">
          {([
            { value: 'day', label: 'আজ' },
            { value: 'week', label: 'সপ্তাহ' },
            { value: 'month', label: 'মাস' },
            { value: 'year', label: 'বছর' },
          ] as { value: Period; label: string }[]).map(opt => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                period === opt.value ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}>{opt.label}</button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3 pb-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl border border-gray-200/60 p-3 text-center">
            <p className="text-[10px] text-gray-400">আয়</p>
            <p className="text-sm font-bold text-success">{formatTaka(totalIncome)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/60 p-3 text-center">
            <p className="text-[10px] text-gray-400">ব্যয়</p>
            <p className="text-sm font-bold text-danger">{formatTaka(totalExpense)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/60 p-3 text-center">
            <p className="text-[10px] text-gray-400">{profit >= 0 ? 'লাভ' : 'ক্ষতি'}</p>
            <p className={`text-sm font-bold ${profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {formatTaka(Math.abs(profit))}
            </p>
          </div>
        </div>

        {/* Jobs Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">📋 কাজের সারাংশ</h3>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">{filteredJobs.length}</p>
              <p className="text-[10px] text-gray-400">মোট</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-600">{filteredJobs.filter(j => j.status === 'pending').length}</p>
              <p className="text-[10px] text-gray-400">পেন্ডিং</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{filteredJobs.filter(j => j.status === 'in-progress').length}</p>
              <p className="text-[10px] text-gray-400">চলমান</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{filteredJobs.filter(j => j.status === 'completed').length}</p>
              <p className="text-[10px] text-gray-400">সম্পন্ন</p>
            </div>
          </div>
        </div>

        {/* Income Trend Chart */}
        {dailyTrend.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📈 আয়-ব্যয় ট্রেন্ড</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} name="আয়" dot={false} />
                <Line type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} name="ব্যয়" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Service-wise Income */}
        {serviceIncome.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 সেবা-wise আয়</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={serviceIncome}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: any) => [`৳${value}`, 'আয়']} />
                <Bar dataKey="amount" fill="#2563EB" radius={[4, 4, 0, 0]} name="আয়" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Expense Pie Chart */}
        {expenseByCategory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">🥧 ব্যয়ের বিভাজন</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {expenseByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Customer-wise Due */}
        {customerDue.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">⚠️ গ্রাহক-wise বাকি</h3>
              <button
                onClick={() => navigate('due-list')}
                className="text-xs text-primary font-medium"
              >
                সব দেখুন
              </button>
            </div>
            <div className="space-y-2">
              {customerDue.map((cd, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-xs font-bold text-orange-600">
                      {i + 1}
                    </div>
                    <span className="text-sm text-gray-700">{cd.name}</span>
                  </div>
                  <span className="text-sm font-bold text-orange-600">{formatTaka(cd.due)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredTx.length === 0 && filteredJobs.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-gray-400 text-sm">এই সময়ে কোনো ডেটা নেই</p>
            <p className="text-gray-300 text-xs mt-1">কাজ এবং হিসাব যোগ করুন রিপোর্ট দেখতে</p>
          </div>
        )}
      </div>
    </div>
  );
}

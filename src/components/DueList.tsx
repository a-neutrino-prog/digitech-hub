import { useState, useMemo } from 'react';
import { getJobs, getCustomerById, addPaymentToJob, formatTaka, formatDateShort } from '../store';
import { useToast } from '../hooks/useToast';
import type { Page } from '../App';
import Modal from './ui/Modal';
import { ArrowLeft, ChevronRight, Phone, CreditCard, MessageCircle } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

export default function DueList({ navigate }: Props) {
  const { toast } = useToast();
  const [ver, setVer] = useState(0);
  const [payModal, setPayModal] = useState<{ jobId: string; customerName: string; due: number } | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const dueData = useMemo(() => {
    const jobs = getJobs().filter(j => j.due > 0 && j.status !== 'cancelled');
    const customerMap: Record<string, { customerId: string; totalDue: number; jobs: typeof jobs }> = {};

    jobs.forEach(job => {
      if (!customerMap[job.customerId]) {
        customerMap[job.customerId] = { customerId: job.customerId, totalDue: 0, jobs: [] };
      }
      customerMap[job.customerId].totalDue += job.due;
      customerMap[job.customerId].jobs.push(job);
    });

    return Object.values(customerMap)
      .map(item => ({ ...item, customer: getCustomerById(item.customerId) }))
      .filter(item => item.customer)
      .sort((a, b) => b.totalDue - a.totalDue);
  }, [ver]);

  const totalDue = dueData.reduce((sum, d) => sum + d.totalDue, 0);

  const handleWhatsAppReminder = (mobile: string, name: string, due: number) => {
    const message = `প্রিয় ${name},\n\nআপনার বাকি ${formatTaka(due)} টাকা পরিশোধ করার জন্য অনুরোধ করা হলো।\n\nধন্যবাদ।`;
    window.open(`https://wa.me/88${mobile}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const openPayModal = (jobId: string, customerName: string, due: number) => {
    setPayModal({ jobId, customerName, due });
    setPayAmount(due.toString());
  };

  const handlePayment = () => {
    if (!payModal) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { toast.error('সঠিক পরিমাণ দিন'); return; }
    if (amount > payModal.due) { toast.error(`বাকি ৳${payModal.due} এর বেশি দেওয়া যাবে না`); return; }

    addPaymentToJob(payModal.jobId, amount);
    toast.success(`৳${amount} পেমেন্ট গ্রহণ করা হয়েছে`);
    setPayModal(null);
    setPayAmount('');
    setVer(v => v + 1);
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden text-white px-4 pt-4 pb-6" style={{ background: 'linear-gradient(135deg, #EA580C, #DC2626)', borderRadius: '0 0 24px 24px' }}>
        <div className="absolute right-[-30px] top-[-30px] w-[150px] h-[150px] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <button onClick={() => navigate('dashboard')} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }} aria-label="ফিরে যান">
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-bold">⚠️ বাকি তালিকা</h2>
        </div>

        <div className="relative z-10 rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <p className="text-orange-100 text-sm">মোট বাকি</p>
          <p className="text-3xl font-extrabold mt-1 tracking-tight">{formatTaka(totalDue)}</p>
          <p className="text-orange-200 text-xs mt-1">{dueData.length}জন গ্রাহক</p>
        </div>
      </div>

      {/* Due List */}
      <div className="px-4 py-3 space-y-3">
        {dueData.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/60 p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center text-4xl mx-auto mb-4 empty-illustration">✅</div>
            <p className="text-gray-700 font-semibold">কোনো বাকি নেই!</p>
            <p className="text-gray-400 text-xs mt-1">সব পেমেন্ট পরিশোধ হয়েছে</p>
          </div>
        ) : (
          dueData.map(item => (
            <div key={item.customerId} className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden animate-item">
              {/* Customer Header */}
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {item.customer?.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold text-gray-800">{item.customer?.name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <Phone size={10} />
                      <a href={`tel:${item.customer?.mobile}`} className="hover:text-primary">{item.customer?.mobile}</a>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-orange-600 tracking-tight">{formatTaka(item.totalDue)}</p>
                    <p className="text-[10px] text-gray-400">{item.jobs.length}টি কাজ</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate('customer-detail', { customerId: item.customerId })}
                    className="flex-1 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-gray-200/60 active:scale-95 transition-all"
                  >
                    প্রোফাইল
                  </button>
                  <button
                    onClick={() => handleWhatsAppReminder(item.customer!.mobile, item.customer!.name, item.totalDue)}
                    className="flex-1 py-2.5 bg-green-50 text-green-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-green-200/60 active:scale-95 transition-all"
                  >
                    <MessageCircle size={14} />
                    রিমাইন্ডার
                  </button>
                </div>
              </div>

              {/* Jobs List with Payment Button */}
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">বাকি কাজের তালিকা</p>
                {item.jobs.slice(0, 5).map(job => (
                  <div key={job.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <button
                      onClick={() => navigate('job-detail', { jobId: job.id })}
                      className="text-left flex-1 min-w-0"
                    >
                      <p className="text-xs text-gray-700 truncate">
                        {job.services.map(s => s.serviceName).join(', ')}
                      </p>
                      <p className="text-[10px] text-gray-400">{formatDateShort(job.date)}</p>
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-xs font-bold text-orange-600">{formatTaka(job.due)}</span>
                      {/* বাকি আদায় বাটন */}
                      <button
                        onClick={() => openPayModal(job.id, item.customer!.name, job.due)}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                        aria-label="বাকি আদায়"
                      >
                        <CreditCard size={12} />
                        আদায়
                      </button>
                    </div>
                  </div>
                ))}
                {item.jobs.length > 5 && (
                  <button
                    onClick={() => navigate('customer-detail', { customerId: item.customerId })}
                    className="w-full text-[10px] text-primary text-center py-2 font-medium flex items-center justify-center gap-1"
                  >
                    +{item.jobs.length - 5}টি আরও <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Modal */}
      <Modal
        open={!!payModal}
        onClose={() => { setPayModal(null); setPayAmount(''); }}
        title="💰 বাকি আদায় করুন"
        subtitle={payModal ? `${payModal.customerName}-এর বাকি: ${formatTaka(payModal.due)}` : ''}
      >
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">পরিমাণ</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">৳</span>
            <input
              type="number"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              placeholder="0"
              className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-xl font-bold text-center form-input-wc"
              autoFocus
            />
          </div>
          {/* Quick amount buttons */}
          {payModal && (
            <div className="flex gap-2 mt-3">
              {[payModal.due, Math.ceil(payModal.due / 2), 100, 500].filter((v, i, a) => a.indexOf(v) === i && v <= payModal.due && v > 0).slice(0, 4).map(amount => (
                <button
                  key={amount}
                  onClick={() => setPayAmount(amount.toString())}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                    payAmount === amount.toString()
                      ? 'bg-primary text-white border-primary'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  ৳{amount}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setPayModal(null); setPayAmount(''); }}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-gray-100 text-gray-700 border border-gray-200 active:scale-[0.97] transition-all"
          >
            বাতিল
          </button>
          <button
            onClick={handlePayment}
            className="flex-[2] py-3 rounded-2xl font-semibold text-sm text-white active:scale-[0.97] transition-all"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 8px 24px rgba(37,99,235,0.2)' }}
          >
            ✅ পেমেন্ট নিশ্চিত
          </button>
        </div>
      </Modal>
    </div>
  );
}

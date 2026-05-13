import { useState, useMemo, useEffect } from 'react';
import { getJobs, getCustomerById, addPaymentToJob, formatTaka, formatDateShort, formatDate, getDueTracker, addDueFollowUp, refreshDueStatuses, DUE_STATUS_CONFIG, type DueStatus } from '../store';
import { useToast } from '../hooks/useToast';
import type { Page } from '../App';
import Modal from './ui/Modal';
import { ArrowLeft, ChevronRight, Phone, CreditCard, MessageCircle, Plus, Clock, CheckCircle } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

export default function DueList({ navigate }: Props) {
  const { toast } = useToast();
  const [ver, setVer] = useState(0);
  const [payModal, setPayModal] = useState<{ jobId: string; customerName: string; due: number } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [followUpModal, setFollowUpModal] = useState<{ jobId: string; customerId: string; customerName: string } | null>(null);
  const [fuType, setFuType] = useState<'call' | 'visit' | 'whatsapp' | 'note'>('call');
  const [fuNote, setFuNote] = useState('');
  const [fuPromisedDate, setFuPromisedDate] = useState('');
  const [fuPromisedAmount, setFuPromisedAmount] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DueStatus>('all');

  // Refresh overdue statuses
  useEffect(() => {
    refreshDueStatuses();
  }, [ver]);

  const dueData = useMemo(() => {
    const jobs = getJobs().filter(j => j.due > 0 && j.status !== 'cancelled');
    const customerMap: Record<string, { customerId: string; totalDue: number; jobs: typeof jobs }> = {};
    jobs.forEach(job => {
      if (!customerMap[job.customerId]) customerMap[job.customerId] = { customerId: job.customerId, totalDue: 0, jobs: [] };
      customerMap[job.customerId].totalDue += job.due;
      customerMap[job.customerId].jobs.push(job);
    });
    return Object.values(customerMap)
      .map(item => ({ ...item, customer: getCustomerById(item.customerId) }))
      .filter(item => item.customer)
      .sort((a, b) => b.totalDue - a.totalDue);
  }, [ver]);

  // Filter by due status
  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return dueData;
    return dueData.filter(item => item.jobs.some(j => {
      const tracker = getDueTracker(j.id);
      return tracker?.status === statusFilter || (!tracker && statusFilter === 'new');
    }));
  }, [dueData, statusFilter]);

  const totalDue = dueData.reduce((sum, d) => sum + d.totalDue, 0);

  const handlePayment = () => {
    if (!payModal) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { toast.error('সঠিক পরিমাণ দিন'); return; }
    if (amount > payModal.due) { toast.error(`বাকি ৳${payModal.due} এর বেশি দেওয়া যাবে না`); return; }
    addPaymentToJob(payModal.jobId, amount);
    toast.success(`৳${amount} পেমেন্ট গ্রহণ করা হয়েছে`);
    setPayModal(null); setPayAmount(''); setVer(v => v + 1);
  };

  const handleFollowUp = () => {
    if (!followUpModal) return;
    if (!fuNote.trim()) { toast.error('নোট লিখুন'); return; }
    addDueFollowUp(followUpModal.jobId, followUpModal.customerId, {
      type: fuType,
      note: fuNote.trim(),
      promisedDate: fuPromisedDate ? new Date(fuPromisedDate).getTime() : undefined,
      promisedAmount: fuPromisedAmount ? parseFloat(fuPromisedAmount) : undefined,
    });
    toast.success('ফলো-আপ সেভ হয়েছে');
    setFollowUpModal(null); setFuNote(''); setFuPromisedDate(''); setFuPromisedAmount(''); setFuType('call'); setVer(v => v + 1);
  };

  const handleWhatsApp = (mobile: string, name: string, due: number) => {
    window.open(`https://wa.me/88${mobile}?text=${encodeURIComponent(`প্রিয় ${name},\n\nআপনার বাকি ${formatTaka(due)} টাকা পরিশোধ করার জন্য অনুরোধ করা হলো।\n\nধন্যবাদ।`)}`, '_blank');
  };

  const FU_TYPES = [
    { v: 'call' as const, icon: '📞', label: 'কল' },
    { v: 'visit' as const, icon: '🚶', label: 'ভিজিট' },
    { v: 'whatsapp' as const, icon: '💬', label: 'WhatsApp' },
    { v: 'note' as const, icon: '📝', label: 'নোট' },
  ];

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden text-white px-4 pt-4 pb-6" style={{ background: 'linear-gradient(135deg, #EA580C, #DC2626)', borderRadius: '0 0 24px 24px' }}>
        <div className="absolute right-[-30px] top-[-30px] w-[150px] h-[150px] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <button onClick={() => navigate('dashboard')} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }} aria-label="ফিরে যান"><ArrowLeft size={18} /></button>
          <h2 className="text-lg font-bold">⚠️ বাকি তালিকা</h2>
        </div>
        <div className="relative z-10 rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <p className="text-orange-100 text-sm">মোট বাকি</p>
          <p className="text-3xl font-extrabold mt-1 tracking-tight">{formatTaka(totalDue)}</p>
          <p className="text-orange-200 text-xs mt-1">{dueData.length}জন গ্রাহক</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="px-4 py-3 flex gap-1.5 overflow-x-auto">
        {[
          { v: 'all' as const, l: 'সব' },
          { v: 'new' as const, l: '🆕 নতুন' },
          { v: 'followed-up' as const, l: '📞 ফলো-আপ' },
          { v: 'promised' as const, l: '🤝 প্রতিশ্রুতি' },
          { v: 'overdue' as const, l: '⚠️ ওভারডিউ' },
        ].map(f => (
          <button key={f.v} onClick={() => setStatusFilter(f.v)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${statusFilter === f.v ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Due List */}
      <div className="px-4 space-y-3 pb-6">
        {filteredData.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/60 p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center text-4xl mx-auto mb-4 empty-illustration">✅</div>
            <p className="text-gray-700 font-semibold">{statusFilter === 'all' ? 'কোনো বাকি নেই!' : 'এই ক্যাটাগরিতে কোনো বাকি নেই'}</p>
          </div>
        ) : (
          filteredData.map(item => (
            <div key={item.customerId} className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden animate-item">
              {/* Customer Header */}
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">{item.customer?.name.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold text-gray-800">{item.customer?.name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><Phone size={10} /><a href={`tel:${item.customer?.mobile}`}>{item.customer?.mobile}</a></div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-orange-600 tracking-tight">{formatTaka(item.totalDue)}</p>
                    <p className="text-[10px] text-gray-400">{item.jobs.length}টি কাজ</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => navigate('customer-detail', { customerId: item.customerId })}
                    className="flex-1 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-gray-200/60 active:scale-95 transition-all">
                    প্রোফাইল
                  </button>
                  <button onClick={() => handleWhatsApp(item.customer!.mobile, item.customer!.name, item.totalDue)}
                    className="flex-1 py-2.5 bg-green-50 text-green-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-green-200/60 active:scale-95 transition-all">
                    <MessageCircle size={14} /> রিমাইন্ডার
                  </button>
                </div>
              </div>

              {/* Jobs with Status & Actions */}
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">বাকি কাজের তালিকা</p>
                {item.jobs.slice(0, 5).map(job => {
                  const tracker = getDueTracker(job.id);
                  const statusCfg = DUE_STATUS_CONFIG[tracker?.status || 'new'];

                  return (
                    <div key={job.id} className="py-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center justify-between">
                        <button onClick={() => navigate('job-detail', { jobId: job.id })} className="text-left flex-1 min-w-0">
                          <p className="text-xs text-gray-700 truncate">{job.services.map(s => s.serviceName).join(', ')}</p>
                          <p className="text-[10px] text-gray-400">{formatDateShort(job.date)}</p>
                        </button>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {/* Due Status Badge */}
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
                            {statusCfg.icon} {statusCfg.label}
                          </span>
                          <span className="text-xs font-bold text-orange-600">{formatTaka(job.due)}</span>
                        </div>
                      </div>

                      {/* Promised date info */}
                      {tracker?.promisedDate && (
                        <div className={`mt-1.5 text-[10px] flex items-center gap-1 ${tracker.promisedDate < Date.now() ? 'text-danger font-semibold' : 'text-green-600'}`}>
                          <Clock size={10} />
                          {tracker.promisedDate < Date.now() ? '⚠️ প্রতিশ্রুত তারিখ পেরিয়ে গেছে: ' : '🤝 পরিশোধের তারিখ: '}
                          {formatDate(tracker.promisedDate)}
                          {tracker.promisedAmount ? ` (৳${tracker.promisedAmount})` : ''}
                        </div>
                      )}

                      {/* Follow-up timeline (last 2) */}
                      {tracker && tracker.followUps.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {tracker.followUps.slice(-2).map(fu => (
                            <div key={fu.id} className="flex items-start gap-2 text-[10px] text-gray-500 bg-white rounded-lg px-2 py-1.5">
                              <span>{fu.type === 'call' ? '📞' : fu.type === 'visit' ? '🚶' : fu.type === 'whatsapp' ? '💬' : '📝'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-600 truncate">{fu.note}</p>
                                <p className="text-gray-400">{formatDateShort(fu.date)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => setPayModal({ jobId: job.id, customerName: item.customer!.name, due: job.due })}
                          className="flex-1 py-2 bg-primary text-white rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm">
                          <CreditCard size={12} /> আদায়
                        </button>
                        <button onClick={() => setFollowUpModal({ jobId: job.id, customerId: item.customerId, customerName: item.customer!.name })}
                          className="flex-1 py-2 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 border border-purple-200 active:scale-95 transition-all">
                          <Plus size={12} /> ফলো-আপ
                        </button>
                      </div>
                    </div>
                  );
                })}
                {item.jobs.length > 5 && (
                  <button onClick={() => navigate('customer-detail', { customerId: item.customerId })}
                    className="w-full text-[10px] text-primary text-center py-2 font-medium flex items-center justify-center gap-1">
                    +{item.jobs.length - 5}টি আরও <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Modal */}
      <Modal open={!!payModal} onClose={() => { setPayModal(null); setPayAmount(''); }} title="💰 বাকি আদায়" subtitle={payModal ? `${payModal.customerName} — বাকি: ${formatTaka(payModal.due)}` : ''}>
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">পরিমাণ</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">৳</span>
            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0"
              className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-xl font-bold text-center form-input-wc" autoFocus />
          </div>
          {payModal && (
            <div className="flex gap-2 mt-3">
              {[payModal.due, Math.ceil(payModal.due / 2), 100, 500].filter((v, i, a) => a.indexOf(v) === i && v <= payModal.due && v > 0).slice(0, 4).map(amt => (
                <button key={amt} onClick={() => setPayAmount(amt.toString())}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${payAmount === amt.toString() ? 'bg-primary text-white border-primary' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>৳{amt}</button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setPayModal(null)} className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-gray-100 text-gray-700 border border-gray-200 active:scale-[0.97] transition-all">বাতিল</button>
          <button onClick={handlePayment} className="flex-[2] py-3 rounded-2xl font-semibold text-sm text-white active:scale-[0.97] transition-all" style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 8px 24px rgba(37,99,235,0.2)' }}>
            <CheckCircle size={16} className="inline mr-1" /> নিশ্চিত
          </button>
        </div>
      </Modal>

      {/* Follow-Up Modal */}
      <Modal open={!!followUpModal} onClose={() => { setFollowUpModal(null); setFuNote(''); setFuPromisedDate(''); setFuPromisedAmount(''); }} title="📝 ফলো-আপ যোগ করুন" subtitle={followUpModal?.customerName || ''}>
        <div className="space-y-4">
          {/* Follow-up Type */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">ধরন</p>
            <div className="grid grid-cols-4 gap-2">
              {FU_TYPES.map(t => (
                <button key={t.v} onClick={() => setFuType(t.v)}
                  className={`py-2.5 rounded-xl text-center transition-all active:scale-95 ${fuType === t.v ? 'bg-primary text-white shadow-sm' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                  <span className="text-lg block">{t.icon}</span>
                  <span className="text-[9px] font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">নোট *</p>
            <textarea value={fuNote} onChange={e => setFuNote(e.target.value)} placeholder="কী বলা হয়েছে, কী সিদ্ধান্ত হয়েছে..."
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm resize-none h-20 form-input-wc" autoFocus />
          </div>

          {/* Promised Date & Amount */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">🤝 পরিশোধের প্রতিশ্রুতি (ঐচ্ছিক)</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 mb-1 block">কবে দেবে?</label>
                <input type="date" value={fuPromisedDate} onChange={e => setFuPromisedDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-xs form-input-wc" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 mb-1 block">কত দেবে? (৳)</label>
                <input type="number" value={fuPromisedAmount} onChange={e => setFuPromisedAmount(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-xs form-input-wc" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={() => setFollowUpModal(null)} className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-gray-100 text-gray-700 border border-gray-200 active:scale-[0.97] transition-all">বাতিল</button>
          <button onClick={handleFollowUp} className="flex-[2] py-3 rounded-2xl font-semibold text-sm text-white active:scale-[0.97] transition-all" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 8px 24px rgba(124,58,237,0.25)' }}>
            📝 ফলো-আপ সেভ করুন
          </button>
        </div>
      </Modal>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { getJobs, getCustomerById, completeJob, addPaymentToJob, deleteJob, deletePaymentFromJob, updatePaymentInJob, updateJob, formatTaka, formatDate, getShopInfo } from '../store';
import type { Page } from '../App';
import { ArrowLeft, Edit, Trash2, CheckCircle, CreditCard, Share2, Printer, X, Save, Download, Clock, Play, FileText } from 'lucide-react';
import { generateJobReceipt, generateInvoice, shareReceipt } from '../utils/pdf';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import Modal from './ui/Modal';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
  refresh: () => void;
  jobId: string;
}

export default function JobDetail({ navigate, refresh, jobId }: Props) {
  const [job, setJob] = useState(getJobs().find(j => j.id === jobId));
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const { toast } = useToast();
  const confirm = useConfirm();

  const reloadJob = () => setJob(getJobs().find(j => j.id === jobId));
  useEffect(() => { reloadJob(); }, [jobId]);

  if (!job) return <div className="bg-gray-100 min-h-screen flex items-center justify-center"><p className="text-gray-400">কাজ পাওয়া যায়নি</p></div>;

  const customer = getCustomerById(job.customerId);
  const shopInfo = getShopInfo();

  const statusMap: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
    'pending': { label: 'পেন্ডিং', class: 'status-pending', icon: <Clock size={14} /> },
    'in-progress': { label: 'চলমান', class: 'status-in-progress', icon: <Play size={14} /> },
    'completed': { label: 'সম্পন্ন', class: 'status-completed', icon: <CheckCircle size={14} /> },
    'cancelled': { label: 'বাতিল', class: 'status-cancelled', icon: <X size={14} /> },
  };
  const status = statusMap[job.status];

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'completed') { handleComplete(); }
    else { updateJob(jobId, { status: newStatus as any }); reloadJob(); refresh(); toast.success('স্ট্যাটাস আপডেট হয়েছে'); }
    setShowStatusMenu(false);
  };

  const handleComplete = async () => {
    const ok = await confirm({ title: 'কাজ সম্পন্ন', message: 'কাজটি সম্পন্ন হিসেবে মার্ক করতে চান?', confirmText: 'সম্পন্ন করুন' });
    if (!ok) return;
    let collectDue = false;
    if (job.due > 0) {
      collectDue = await confirm({ title: 'বাকি পরিশোধ', message: `বাকি ৳${job.due} টাকা এখন পরিশোধ করা হয়েছে?`, confirmText: 'হ্যাঁ, পরিশোধ হয়েছে', cancelText: 'না, বাকি থাকবে' });
    }
    completeJob(jobId, collectDue);
    reloadJob(); refresh();
    toast.success('কাজ সম্পন্ন হয়েছে!');
  };

  const handlePayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { toast.error('সঠিক টাকার পরিমাণ দিন'); return; }
    addPaymentToJob(jobId, amount);
    reloadJob(); setShowPayment(false); setPaymentAmount(''); refresh();
    toast.success(`৳${amount} পেমেন্ট গ্রহণ করা হয়েছে`);
  };

  const handleDeletePayment = async (index: number) => {
    const ok = await confirm({ title: 'পেমেন্ট ডিলিট', message: 'এই পেমেন্ট ডিলিট করতে চান?', danger: true, confirmText: 'ডিলিট' });
    if (ok) { deletePaymentFromJob(jobId, index); reloadJob(); refresh(); toast.success('পেমেন্ট ডিলিট হয়েছে'); }
  };

  const handleEditPayment = (index: number) => { setEditingPaymentIndex(index); setEditPaymentAmount(job.payments[index].amount.toString()); };

  const handleSaveEditPayment = () => {
    if (editingPaymentIndex === null) return;
    const newAmount = parseFloat(editPaymentAmount);
    if (!newAmount || newAmount <= 0) { toast.error('সঠিক পরিমাণ দিন'); return; }
    updatePaymentInJob(jobId, editingPaymentIndex, newAmount);
    setEditingPaymentIndex(null); setEditPaymentAmount(''); reloadJob(); refresh();
    toast.success('পেমেন্ট আপডেট হয়েছে');
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: 'কাজ ডিলিট', message: 'এই কাজটি ডিলিট করতে চান? এটি ফিরিয়ে আনা যাবে না।', danger: true, confirmText: 'ডিলিট করুন' });
    if (ok) { deleteJob(jobId); refresh(); navigate('jobs'); toast.success('কাজ ডিলিট হয়েছে'); }
  };

  const handleDownloadPDF = () => { generateJobReceipt(job); toast.success('PDF ডাউনলোড হচ্ছে'); };

  const handleWhatsApp = () => {
    if (!customer?.mobile) return;
    const msg = `*${shopInfo.shopName||'ডিজিটেক হাব'}*\n\nপ্রিয় ${customer.name},\n\n${job.services.map(s=>`• ${s.serviceName} (${s.quantity}x) = ৳${s.total}`).join('\n')}\n\nমোট: ৳${job.totalAmount}\nপরিশোধ: ৳${job.totalAmount-job.due}\nবাকি: ৳${job.due}\nস্ট্যাটাস: ${status.label}\n\nধন্যবাদ!`;
    window.open(`https://wa.me/88${customer.mobile}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden text-white px-5 pt-5 pb-7" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)', borderRadius: '0 0 24px 24px' }}>
        <div className="absolute right-[-30px] top-[-30px] w-[150px] h-[150px] rounded-full" style={{ background: 'rgba(96,165,250,0.08)' }} />
        <div className="flex items-center justify-between relative z-10">
          <button onClick={() => navigate('jobs')} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }} aria-label="ফিরে যান"><ArrowLeft size={18} /></button>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('job-form', { editId: jobId })} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }} aria-label="এডিট"><Edit size={16} /></button>
            <button onClick={handleDelete} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.2)', border: '1px solid rgba(244,63,94,0.3)' }} aria-label="ডিলিট"><Trash2 size={16} /></button>
          </div>
        </div>
        <div className="mt-5 text-center relative z-10">
          <div className="relative inline-block">
            <button onClick={() => setShowStatusMenu(!showStatusMenu)} className={`text-xs px-3 py-1 rounded-full font-semibold ${status.class} flex items-center gap-1`}>
              {status.icon}{status.label}{job.status !== 'completed' && job.status !== 'cancelled' && <span className="ml-1 text-[8px]">▼</span>}
            </button>
            {showStatusMenu && job.status !== 'completed' && job.status !== 'cancelled' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-2xl shadow-xl py-2 z-20 min-w-36 border border-gray-200 fade-in-scale">
                {Object.entries(statusMap).filter(([k]) => k !== job.status && k !== 'cancelled').map(([key, val]) => (
                  <button key={key} onClick={() => handleStatusChange(key)} className="w-full px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">{val.icon}{val.label}</button>
                ))}
              </div>
            )}
          </div>
          <h2 className="text-3xl font-extrabold mt-3 tracking-tight">{formatTaka(job.totalAmount)}</h2>
          <p className="text-blue-300 text-sm mt-1">{customer?.name || 'অজানা গ্রাহক'}</p>
          <p className="text-blue-400/60 text-xs">{formatDate(job.date)}</p>
        </div>
      </div>

      {showStatusMenu && <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />}

      <div className="px-4 -mt-4 space-y-3 pb-6">
        {/* Amount Summary */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'মোট', val: formatTaka(job.totalAmount), color: 'text-gray-800' },
            { label: 'পরিশোধ', val: formatTaka(job.totalAmount - job.due), color: 'text-success' },
            { label: 'বাকি', val: formatTaka(job.due), color: job.due > 0 ? 'text-warning' : 'text-success' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200/60 p-3 text-center"><p className="text-[10px] text-gray-400">{s.label}</p><p className={`text-sm font-bold ${s.color}`}>{s.val}</p></div>
          ))}
        </div>

        {/* Customer */}
        {customer && (
          <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">👤 গ্রাহক তথ্য</p>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary font-bold">{customer.name.charAt(0)}</div>
              <div className="flex-1"><p className="text-sm font-semibold text-gray-800">{customer.name}</p><p className="text-xs text-gray-400">{customer.mobile}</p>{customer.address && <p className="text-xs text-gray-400">{customer.address}</p>}</div>
              <button onClick={() => navigate('customer-detail', { customerId: customer.id })} className="text-xs text-primary font-semibold px-3 py-1.5 bg-primary-50 rounded-xl">প্রোফাইল</button>
            </div>
          </div>
        )}

        {/* Services */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">📋 সেবার বিবরণ</p>
          {job.services.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
              <div><p className="text-sm text-gray-700">{s.serviceName}</p><p className="text-xs text-gray-400">{s.quantity}টি × ৳{s.rate}</p></div>
              <p className="text-sm font-bold text-gray-800">{formatTaka(s.total)}</p>
            </div>
          ))}
        </div>

        {/* Payments */}
        {job.payments.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">💳 পেমেন্ট হিস্ট্রি</p>
            {job.payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                {editingPaymentIndex === i ? (
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-sm text-gray-500">৳</span>
                    <input type="number" value={editPaymentAmount} onChange={e => setEditPaymentAmount(e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm form-input-wc" autoFocus />
                    <button onClick={handleSaveEditPayment} className="w-9 h-9 rounded-xl bg-success-light flex items-center justify-center" aria-label="সেভ"><Save size={14} className="text-success" /></button>
                    <button onClick={() => setEditingPaymentIndex(null)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center" aria-label="বাতিল"><X size={14} className="text-gray-400" /></button>
                  </div>
                ) : (
                  <>
                    <div><p className="text-sm text-gray-700 font-medium">{formatTaka(p.amount)}</p><p className="text-xs text-gray-400">{formatDate(p.date)}</p></div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 bg-success-light text-success-dark rounded-full">নগদ</span>
                      <button onClick={() => handleEditPayment(i)} className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center" aria-label="এডিট"><Edit size={12} className="text-blue-500" /></button>
                      <button onClick={() => handleDeletePayment(i)} className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center" aria-label="ডিলিট"><Trash2 size={12} className="text-danger" /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {job.notes && (
          <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">📝 নোট</p>
            <p className="text-sm text-gray-600 leading-relaxed">{job.notes}</p>
          </div>
        )}

        {/* Payment Modal */}
        <Modal open={showPayment} onClose={() => setShowPayment(false)} title="পেমেন্ট গ্রহণ করুন" subtitle={`${customer?.name || 'গ্রাহক'}-এর বাকি: ৳${job.due}`}>
          <div className="mb-5">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">পরিমাণ</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">৳</span>
              <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0"
                className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-xl font-bold text-center form-input-wc" autoFocus />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowPayment(false)} className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-gray-100 text-gray-700 border border-gray-200 active:scale-[0.97] transition-all">বাতিল</button>
            <button onClick={handlePayment} className="flex-2 py-3 rounded-2xl font-semibold text-sm text-white active:scale-[0.97] transition-all bg-gradient-to-r from-primary to-primary-dark shadow-[0_8px_24px_rgba(37,99,235,0.2)] flex-[2]">✅ নিশ্চিত করুন</button>
          </div>
        </Modal>

        {/* Actions */}
        <div className="space-y-2.5">
          {job.status !== 'completed' && job.status !== 'cancelled' && (
            <>
              <button onClick={handleComplete} className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all bg-gradient-to-r from-success to-success-dark shadow-[0_8px_24px_rgba(34,197,94,0.2)]">
                <CheckCircle size={18} />সম্পন্ন করুন
              </button>
              {job.due > 0 && (
                <button onClick={() => setShowPayment(true)} className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all bg-gradient-to-r from-warning to-warning-dark shadow-[0_8px_24px_rgba(245,158,11,0.2)]">
                  <CreditCard size={18} />পেমেন্ট নিন
                </button>
              )}
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleDownloadPDF} className="py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-medium text-xs flex items-center justify-center gap-1.5 card-hover" aria-label="রসিদ"><Printer size={14} />রসিদ</button>
            <button onClick={() => generateInvoice(job)} className="py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-medium text-xs flex items-center justify-center gap-1.5 card-hover" aria-label="ইনভয়েস"><FileText size={14} />ইনভয়েস (A4)</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleWhatsApp} className="py-3 bg-success-light border border-green-200 text-success-dark rounded-2xl font-medium text-xs flex items-center justify-center gap-1.5 card-hover" aria-label="WhatsApp"><Share2 size={14} />WhatsApp</button>
            <button onClick={() => shareReceipt(job)} className="py-3 bg-primary-50 border border-blue-200 text-primary rounded-2xl font-medium text-xs flex items-center justify-center gap-1.5 card-hover" aria-label="শেয়ার"><Download size={14} />শেয়ার</button>
          </div>
        </div>
      </div>
    </div>
  );
}

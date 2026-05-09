import { useState, useEffect } from 'react';
import { getJobs, getCustomerById, completeJob, addPaymentToJob, deleteJob, deletePaymentFromJob, updatePaymentInJob, updateJob, formatTaka, formatDate, getShopInfo } from '../store';
import type { Page } from '../App';
import { ArrowLeft, Edit, Trash2, CheckCircle, CreditCard, Share2, Printer, X, Save, Download, Clock, Play } from 'lucide-react';
import { generateJobReceipt } from '../utils/pdf';

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

  const reloadJob = () => {
    setJob(getJobs().find(j => j.id === jobId));
  };

  useEffect(() => {
    reloadJob();
  }, [jobId]);

  if (!job) {
    return (
      <div className="bg-gray-100 min-h-screen flex items-center justify-center">
        <p className="text-gray-400">কাজ পাওয়া যায়নি</p>
      </div>
    );
  }

  const customer = getCustomerById(job.customerId);
  const shopInfo = getShopInfo();

  const statusMap: Record<string, { label: string; class: string; bg: string; icon: React.ReactNode }> = {
    'pending': { label: 'পেন্ডিং', class: 'status-pending', bg: 'bg-yellow-500', icon: <Clock size={14} /> },
    'in-progress': { label: 'চলমান', class: 'status-in-progress', bg: 'bg-blue-500', icon: <Play size={14} /> },
    'completed': { label: 'সম্পন্ন', class: 'status-completed', bg: 'bg-green-500', icon: <CheckCircle size={14} /> },
    'cancelled': { label: 'বাতিল', class: 'status-cancelled', bg: 'bg-red-500', icon: <X size={14} /> },
  };
  const status = statusMap[job.status];

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'completed') {
      handleComplete();
    } else {
      updateJob(jobId, { status: newStatus as any });
      reloadJob();
      refresh();
    }
    setShowStatusMenu(false);
  };

  const handleComplete = () => {
    if (confirm('কাজ সম্পন্ন হিসেবে মার্ক করতে চান?')) {
      completeJob(jobId);
      reloadJob();
      refresh();
    }
  };

  const handlePayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      alert('সঠিক টাকার পরিমাণ লিখুন');
      return;
    }
    addPaymentToJob(jobId, amount);
    reloadJob();
    setShowPayment(false);
    setPaymentAmount('');
    refresh();
  };

  const handleDeletePayment = (index: number) => {
    if (confirm('এই পেমেন্ট ডিলিট করতে চান?')) {
      deletePaymentFromJob(jobId, index);
      reloadJob();
      refresh();
    }
  };

  const handleEditPayment = (index: number) => {
    setEditingPaymentIndex(index);
    setEditPaymentAmount(job.payments[index].amount.toString());
  };

  const handleSaveEditPayment = () => {
    if (editingPaymentIndex === null) return;
    const newAmount = parseFloat(editPaymentAmount);
    if (!newAmount || newAmount <= 0) {
      alert('সঠিক টাকার পরিমাণ লিখুন');
      return;
    }
    updatePaymentInJob(jobId, editingPaymentIndex, newAmount);
    setEditingPaymentIndex(null);
    setEditPaymentAmount('');
    reloadJob();
    refresh();
  };

  const handleDelete = () => {
    if (confirm('এই কাজ ডিলিট করতে চান? এটি ফিরিয়ে আনা যাবে না।')) {
      deleteJob(jobId);
      refresh();
      navigate('jobs');
    }
  };

  const handleDownloadPDF = () => {
    generateJobReceipt(job);
  };

  const handlePrint = () => {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;
    const html = `
      <html>
      <head>
        <meta charset="UTF-8">
        <title>রসিদ</title>
        <style>
          body { font-family: 'Hind Siliguri', Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 2px 0; font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #eee; font-size: 13px; }
          th { background: #f5f5f5; }
          .total { font-weight: bold; font-size: 15px; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #999; }
          @media print { body { padding: 5px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${shopInfo.shopName || 'ডিজিটেক হাব'}</h1>
          <p>${shopInfo.address || ''}</p>
          <p>ফোন: ${shopInfo.phone || ''}</p>
        </div>
        <p><strong>তারিখ:</strong> ${formatDate(job.date)}</p>
        <p><strong>গ্রাহক:</strong> ${customer?.name || 'N/A'}</p>
        <p><strong>মোবাইল:</strong> ${customer?.mobile || 'N/A'}</p>
        <table>
          <tr><th>সেবা</th><th>পরিমাণ</th><th>রেট</th><th>মোট</th></tr>
          ${job.services.map(s => `<tr><td>${s.serviceName}</td><td>${s.quantity}</td><td>৳${s.rate}</td><td>৳${s.total}</td></tr>`).join('')}
        </table>
        <p class="total">মোট: ৳${job.totalAmount}</p>
        <p>পরিশোধ: ৳${job.totalAmount - job.due}</p>
        <p style="color: ${job.due > 0 ? 'red' : 'green'}">বাকি: ৳${job.due}</p>
        <p>স্ট্যাটাস: ${status.label}</p>
        <div class="footer">
          <p>ধন্যবাদ আপনার সেবা গ্রহণের জন্য!</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;
    receiptWindow.document.write(html);
    receiptWindow.document.close();
  };

  const handleWhatsApp = () => {
    if (!customer?.mobile) return;
    const message = `*${shopInfo.shopName || 'ডিজিটেক হাব'}*\n\nপ্রিয় ${customer.name},\n\nআপনার কাজের বিবরণ:\n${job.services.map(s => `• ${s.serviceName} (${s.quantity}x) = ৳${s.total}`).join('\n')}\n\nমোট: ৳${job.totalAmount}\nপরিশোধ: ৳${job.totalAmount - job.due}\nবাকি: ৳${job.due}\nস্ট্যাটাস: ${status.label}\n\nধন্যবাদ!`;
    const url = `https://wa.me/88${customer.mobile}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-blue-700 text-white px-4 pt-4 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('jobs')} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('job-form', { editId: jobId })}
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
              title="এডিট করুন"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={handleDelete}
              className="w-9 h-9 rounded-full bg-red-500/30 flex items-center justify-center"
              title="ডিলিট করুন"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          {/* Status with dropdown */}
          <div className="relative inline-block">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className={`text-xs px-3 py-1 rounded-full font-medium ${status.class} flex items-center gap-1`}
            >
              {status.icon}
              {status.label}
              {job.status !== 'completed' && job.status !== 'cancelled' && (
                <span className="ml-1">▼</span>
              )}
            </button>
            
            {showStatusMenu && job.status !== 'completed' && job.status !== 'cancelled' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-lg py-1 z-10 min-w-32">
                {Object.entries(statusMap).map(([key, val]) => (
                  key !== job.status && key !== 'cancelled' && (
                    <button
                      key={key}
                      onClick={() => handleStatusChange(key)}
                      className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span className={`w-2 h-2 rounded-full ${val.bg}`} />
                      {val.label}
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
          
          <h2 className="text-2xl font-bold mt-2">{formatTaka(job.totalAmount)}</h2>
          <p className="text-blue-200 text-sm mt-1">{customer?.name || 'অজানা গ্রাহক'}</p>
          <p className="text-blue-300 text-xs">{formatDate(job.date)}</p>
        </div>
      </div>

      {/* Click outside to close status menu */}
      {showStatusMenu && (
        <div className="fixed inset-0 z-5" onClick={() => setShowStatusMenu(false)} />
      )}

      <div className="px-4 -mt-3 space-y-3">
        {/* Amount Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl shadow-sm p-3 text-center">
            <p className="text-[10px] text-gray-400">মোট</p>
            <p className="text-sm font-bold text-gray-800">{formatTaka(job.totalAmount)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 text-center">
            <p className="text-[10px] text-gray-400">পরিশোধ</p>
            <p className="text-sm font-bold text-green-600">{formatTaka(job.totalAmount - job.due)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 text-center">
            <p className="text-[10px] text-gray-400">বাকি</p>
            <p className={`text-sm font-bold ${job.due > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {formatTaka(job.due)}
            </p>
          </div>
        </div>

        {/* Customer Info */}
        {customer && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-400 mb-2">👤 গ্রাহক তথ্য</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {customer.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{customer.name}</p>
                <p className="text-xs text-gray-400">{customer.mobile}</p>
                {customer.address && (
                  <p className="text-xs text-gray-400">{customer.address}</p>
                )}
              </div>
              <button
                onClick={() => navigate('customer-detail', { customerId: customer.id })}
                className="text-xs text-primary font-medium px-2 py-1 bg-blue-50 rounded-lg"
              >
                প্রোফাইল
              </button>
            </div>
          </div>
        )}

        {/* Services */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-xs font-semibold text-gray-400 mb-2">📋 সেবার বিবরণ</h3>
          <div className="space-y-2">
            {job.services.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-700">{s.serviceName}</p>
                  <p className="text-xs text-gray-400">{s.quantity}টি × ৳{s.rate}</p>
                </div>
                <p className="text-sm font-semibold text-gray-800">{formatTaka(s.total)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        {job.payments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-400 mb-2">💳 পেমেন্ট হিস্ট্রি</h3>
            <div className="space-y-2">
              {job.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  {editingPaymentIndex === i ? (
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-sm text-gray-500">৳</span>
                      <input
                        type="number"
                        value={editPaymentAmount}
                        onChange={e => setEditPaymentAmount(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEditPayment}
                        className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center"
                      >
                        <Save size={14} className="text-green-600" />
                      </button>
                      <button
                        onClick={() => setEditingPaymentIndex(null)}
                        className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"
                      >
                        <X size={14} className="text-gray-400" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm text-gray-700">{formatTaka(p.amount)}</p>
                        <p className="text-xs text-gray-400">{formatDate(p.date)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full mr-1">নগদ</span>
                        <button
                          onClick={() => handleEditPayment(i)}
                          className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"
                          title="এডিট"
                        >
                          <Edit size={12} className="text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDeletePayment(i)}
                          className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center"
                          title="ডিলিট"
                        >
                          <Trash2 size={12} className="text-red-500" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {job.notes && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-400 mb-2">📝 নোট</h3>
            <p className="text-sm text-gray-600">{job.notes}</p>
          </div>
        )}

        {/* Payment Modal */}
        {showPayment && (
          <div className="bg-white rounded-2xl shadow-sm p-4 border-2 border-primary">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">💰 পেমেন্ট যোগ করুন</h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder={`বাকি: ৳${job.due}`}
                className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
              <button
                onClick={handlePayment}
                className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium"
              >
                সেভ
              </button>
              <button
                onClick={() => setShowPayment(false)}
                className="px-3 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm"
              >
                বাতিল
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pb-4">
          {job.status !== 'completed' && job.status !== 'cancelled' && (
            <>
              <button
                onClick={handleComplete}
                className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <CheckCircle size={18} />
                সম্পন্ন করুন
              </button>

              {job.due > 0 && (
                <button
                  onClick={() => setShowPayment(true)}
                  className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <CreditCard size={18} />
                  পেমেন্ট নিন
                </button>
              )}
            </>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleDownloadPDF}
              className="py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium text-xs flex items-center justify-center gap-1 card-hover"
            >
              <Download size={14} />
              PDF
            </button>
            <button
              onClick={handlePrint}
              className="py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium text-xs flex items-center justify-center gap-1 card-hover"
            >
              <Printer size={14} />
              প্রিন্ট
            </button>
            <button
              onClick={handleWhatsApp}
              className="py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl font-medium text-xs flex items-center justify-center gap-1 card-hover"
            >
              <Share2 size={14} />
              WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { getJobs, getCustomerById, formatTaka, formatDateShort, payCustomerDue } from '../store';
import type { Page } from '../App';
import { ArrowLeft, ChevronRight, Phone, Banknote } from 'lucide-react';
import { useState } from 'react';
import DuePaymentModal from './DuePaymentModal';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
  refresh: () => void;
}

export default function DueList({ navigate, refresh }: Props) {
  const [modalData, setModalData] = useState<{ isOpen: boolean; customerId: string; maxAmount: number; customerName: string }>({
    isOpen: false,
    customerId: '',
    maxAmount: 0,
    customerName: ''
  });

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
      .map(item => ({
        ...item,
        customer: getCustomerById(item.customerId),
      }))
      .filter(item => item.customer)
      .sort((a, b) => b.totalDue - a.totalDue);
  }, []);

  const totalDue = dueData.reduce((sum, d) => sum + d.totalDue, 0);

  const handleWhatsAppReminder = (mobile: string, name: string, due: number) => {
    const message = `প্রিয় ${name},\n\nআপনার বাকি ${formatTaka(due)} টাকা পরিশোধ করার জন্য অনুরোধ করা হলো।\n\nধন্যবাদ।`;
    const url = `https://wa.me/88${mobile}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleCollectDueClick = (customerId: string, totalDue: number, customerName: string) => {
    if (totalDue <= 0) return;
    setModalData({
      isOpen: true,
      customerId,
      maxAmount: totalDue,
      customerName
    });
  };

  const handleDuePayment = (amount: number) => {
    if (modalData.customerId) {
      payCustomerDue(modalData.customerId, amount);
      refresh();
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white px-4 pt-4 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('dashboard')} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-bold">⚠️ বাকি তালিকা</h2>
        </div>

        <div className="bg-white/15 rounded-xl p-4 text-center">
          <p className="text-orange-100 text-sm">মোট বাকি</p>
          <p className="text-3xl font-bold mt-1">{formatTaka(totalDue)}</p>
          <p className="text-orange-200 text-xs mt-1">{dueData.length}জন গ্রাহক</p>
        </div>
      </div>

      {/* Due List */}
      <div className="px-4 py-3 space-y-3">
        {dueData.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-gray-500 text-sm font-medium">কোনো বাকি নেই!</p>
            <p className="text-gray-400 text-xs mt-1">সব পেমেন্ট পরিশোধ হয়েছে</p>
          </div>
        ) : (
          dueData.map(item => (
            <div key={item.customerId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Customer Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-lg font-bold">
                    {item.customer?.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{item.customer?.name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <Phone size={10} />
                      {item.customer?.mobile}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-600">{formatTaka(item.totalDue)}</p>
                    <p className="text-[10px] text-gray-400">{item.jobs.length}টি কাজ</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleCollectDueClick(item.customerId, item.totalDue, item.customer?.name || '')}
                    className="flex-1 py-2 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                  >
                    <Banknote size={12} />
                    বাকি আদায়
                  </button>
                  <button
                    onClick={() => navigate('customer-detail', { customerId: item.customerId })}
                    className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                  >
                    প্রোফাইল
                  </button>
                  <button
                    onClick={() => handleWhatsAppReminder(item.customer!.mobile, item.customer!.name, item.totalDue)}
                    className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                  >
                    📱 রিমাইন্ডার
                  </button>
                </div>
              </div>

              {/* Jobs List */}
              <div className="px-4 py-2 bg-gray-50">
                <p className="text-[10px] text-gray-400 mb-1">বাকি কাজের তালিকা</p>
                {item.jobs.slice(0, 3).map(job => (
                  <button
                    key={job.id}
                    onClick={() => navigate('job-detail', { jobId: job.id })}
                    className="w-full flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="text-left">
                      <p className="text-xs text-gray-600">
                        {job.services.map(s => s.serviceName).join(', ')}
                      </p>
                      <p className="text-[10px] text-gray-400">{formatDateShort(job.date)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-orange-600">{formatTaka(job.due)}</span>
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </button>
                ))}
                {item.jobs.length > 3 && (
                  <p className="text-[10px] text-gray-400 text-center py-1">
                    +{item.jobs.length - 3}টি আরও...
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <DuePaymentModal
        isOpen={modalData.isOpen}
        onClose={() => setModalData({ ...modalData, isOpen: false })}
        onSubmit={handleDuePayment}
        maxAmount={modalData.maxAmount}
        customerName={modalData.customerName}
      />
    </div>
  );
}

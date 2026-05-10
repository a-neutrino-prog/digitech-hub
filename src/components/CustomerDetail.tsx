import { useState, useMemo } from 'react';
import { getCustomerById, getJobs, deleteCustomer, formatTaka, formatDateShort, getCustomerPhoto, payCustomerDue } from '../store';
import type { Page } from '../App';
import { ArrowLeft, Edit, Trash2, Star, Phone, MapPin, ChevronRight, CreditCard, MessageCircle, Banknote } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
  refresh: () => void;
  customerId: string;
}

export default function CustomerDetail({ navigate, refresh, customerId }: Props) {
  const customer = getCustomerById(customerId);
  const [activeTab, setActiveTab] = useState<'history' | 'due' | 'info'>('history');

  const customerJobs = useMemo(() => {
    return getJobs()
      .filter(j => j.customerId === customerId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [customerId]);

  const totalDue = customerJobs.filter(j => j.status !== 'cancelled').reduce((sum, j) => sum + j.due, 0);
  const totalSpent = customerJobs.filter(j => j.status !== 'cancelled').reduce((sum, j) => sum + j.totalAmount, 0);
  const dueJobs = customerJobs.filter(j => j.due > 0 && j.status !== 'cancelled');

  if (!customer) {
    return (
      <div className="bg-gray-100 min-h-screen flex items-center justify-center">
        <p className="text-gray-400">গ্রাহক পাওয়া যায়নি</p>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm('এই গ্রাহক ডিলিট করতে চান? সম্পর্কিত সব তথ্য মুছে যাবে।')) {
      deleteCustomer(customerId);
      refresh();
      navigate('customers');
    }
  };

  const handleWhatsAppReminder = () => {
    if (totalDue <= 0) return;
    const message = `প্রিয় ${customer.name},\n\nআপনার বাকি ${formatTaka(totalDue)} টাকা পরিশোধ করার জন্য অনুরোধ করা হলো।\n\nধন্যবাদ।`;
    const url = `https://wa.me/88${customer.mobile}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleCollectDue = () => {
    if (totalDue <= 0) return;
    const amountStr = window.prompt(`বাকি আদায়ের পরিমাণ লিখুন (সর্বোচ্চ ${totalDue}):`, totalDue.toString());
    if (amountStr) {
      const amount = parseInt(amountStr, 10);
      if (!isNaN(amount) && amount > 0) {
        if (amount > totalDue) {
          alert('মোট বাকির চেয়ে বেশি পরিমাণ দেওয়া যাবে না!');
          return;
        }
        payCustomerDue(customerId, amount);
        refresh();
      } else {
        alert('সঠিক টাকার পরিমাণ দিন!');
      }
    }
  };

  const statusMap: Record<string, { label: string; class: string }> = {
    'pending': { label: 'পেন্ডিং', class: 'status-pending' },
    'in-progress': { label: 'চলমান', class: 'status-in-progress' },
    'completed': { label: 'সম্পন্ন', class: 'status-completed' },
    'cancelled': { label: 'বাতিল', class: 'status-cancelled' },
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-blue-700 text-white px-4 pt-4 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('customers')} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('customer-form', { editId: customerId })}
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={handleDelete}
              className="w-9 h-9 rounded-full bg-red-500/30 flex items-center justify-center"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold mx-auto overflow-hidden">
            {getCustomerPhoto(customer.id) ? (
              <img src={getCustomerPhoto(customer.id)!} alt="" className="w-full h-full object-cover" />
            ) : (
              customer.name.charAt(0)
            )}
          </div>
          <h2 className="text-xl font-bold mt-2 flex items-center justify-center gap-1.5">
            {customer.name}
            {customer.isRegular && <Star size={16} className="text-yellow-400 fill-yellow-400" />}
          </h2>
          <div className="flex items-center justify-center gap-1 text-blue-200 text-sm mt-1">
            <Phone size={12} />
            <a href={`tel:${customer.mobile}`} className="underline">{customer.mobile}</a>
          </div>
          {customer.address && (
            <div className="flex items-center justify-center gap-1 text-blue-300 text-xs mt-0.5">
              <MapPin size={10} />
              {customer.address}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl shadow-sm p-3 text-center">
            <p className="text-[10px] text-gray-400">মোট কাজ</p>
            <p className="text-sm font-bold text-gray-800">{customerJobs.length}টি</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 text-center">
            <p className="text-[10px] text-gray-400">মোট খরচ</p>
            <p className="text-sm font-bold text-gray-800">{formatTaka(totalSpent)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 text-center">
            <p className="text-[10px] text-gray-400">বাকি</p>
            <p className={`text-sm font-bold ${totalDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {formatTaka(totalDue)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {totalDue > 0 && (
        <div className="px-4 mt-3">
          <div className="flex gap-2">
            <button
              onClick={() => navigate('job-form')}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
            >
              <CreditCard size={14} />
              নতুন কাজ
            </button>
            <button
              onClick={handleCollectDue}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
            >
              <Banknote size={14} />
              বাকি আদায়
            </button>
            <button
              onClick={handleWhatsAppReminder}
              className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
            >
              <MessageCircle size={14} />
              রিমাইন্ডার
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'history' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
            }`}
          >
            হিস্ট্রি
          </button>
          <button
            onClick={() => setActiveTab('due')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'due' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
            }`}
          >
            বাকি ({dueJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'info' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
            }`}
          >
            তথ্য
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-3 space-y-2 pb-4">
          {activeTab === 'history' && (
            <>
              {customerJobs.length === 0 ? (
                <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                  <p className="text-gray-400 text-sm">কোনো কাজের ইতিহাস নেই</p>
                </div>
              ) : (
                customerJobs.map(job => {
                  const st = statusMap[job.status];
                  return (
                    <button
                      key={job.id}
                      onClick={() => navigate('job-detail', { jobId: job.id })}
                      className="w-full bg-white rounded-xl shadow-sm p-3 text-left card-hover"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-700 truncate">
                              {job.services.map(s => s.serviceName).join(', ')}
                            </p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.class}`}>
                              {st.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-semibold text-gray-700">{formatTaka(job.totalAmount)}</span>
                            {job.due > 0 && (
                              <span className="text-[10px] text-orange-600">বাকি: {formatTaka(job.due)}</span>
                            )}
                            <span className="text-[10px] text-gray-400">{formatDateShort(job.date)}</span>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-gray-300" />
                      </div>
                    </button>
                  );
                })
              )}
            </>
          )}

          {activeTab === 'due' && (
            <>
              {dueJobs.length === 0 ? (
                <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-gray-400 text-sm">কোনো বাকি নেই!</p>
                </div>
              ) : (
                dueJobs.map(job => (
                  <button
                    key={job.id}
                    onClick={() => navigate('job-detail', { jobId: job.id })}
                    className="w-full bg-white rounded-xl shadow-sm p-3 text-left card-hover"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          {job.services.map(s => s.serviceName).join(', ')}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDateShort(job.date)}</p>
                      </div>
                      <span className="text-sm font-bold text-orange-600">{formatTaka(job.due)}</span>
                    </div>
                  </button>
                ))
              )}
            </>
          )}

          {activeTab === 'info' && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">পূর্ণ নাম</p>
                  <p className="text-sm text-gray-800 font-medium mt-0.5">{customer.name}</p>
                </div>
                
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">মোবাইল নম্বর</p>
                  <p className="text-sm text-gray-800 font-medium mt-0.5">{customer.mobile}</p>
                </div>
                
                {customer.address && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">ঠিকানা</p>
                    <p className="text-sm text-gray-800 font-medium mt-0.5">{customer.address}</p>
                  </div>
                )}
                
                {customer.nid && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">NID নম্বর</p>
                    <p className="text-sm text-gray-800 font-medium mt-0.5">{customer.nid}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">গ্রাহক ধরন</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {customer.isRegular ? (
                      <>
                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-sm text-yellow-600 font-medium">নিয়মিত গ্রাহক</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-600">সাধারণ গ্রাহক</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 uppercase">যোগদানের তারিখ</p>
                  <p className="text-sm text-gray-800 font-medium mt-0.5">
                    {new Date(customer.createdAt).toLocaleDateString('bn-BD', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

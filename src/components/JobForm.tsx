import { useState, useMemo } from 'react';
import { getCustomers, getServices, addJob, getJobs, updateJob, type JobService } from '../store';
import type { Page } from '../App';
import { ArrowLeft, Search, Plus, Minus, X, Save, Star, Percent } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
  refresh: () => void;
  editId?: string;
}

export default function JobForm({ navigate, refresh, editId }: Props) {
  const customers = useMemo(() => getCustomers().sort((a, b) => a.name.localeCompare(b.name)), []);
  const services = useMemo(() => getServices().filter(s => s.isActive), []);
  const existingJob = editId ? getJobs().find(j => j.id === editId) : null;

  const [customerId, setCustomerId] = useState(existingJob?.customerId || '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedServices, setSelectedServices] = useState<JobService[]>(
    existingJob?.services || []
  );
  const [advance, setAdvance] = useState(existingJob?.advance?.toString() || '0');
  const [notes, setNotes] = useState(existingJob?.notes || '');
  const [status, setStatus] = useState<'pending' | 'in-progress' | 'completed' | 'cancelled'>(existingJob?.status || 'pending');
  const [discount, setDiscount] = useState('0');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const s = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(s) || c.mobile.includes(s)
    );
  }, [customers, customerSearch]);

  const selectedCustomer = customers.find(c => c.id === customerId);

  const subtotal = selectedServices.reduce((sum, s) => sum + s.total, 0);
  const discountNum = parseFloat(discount) || 0;
  const discountAmount = discountType === 'percent' 
    ? Math.round(subtotal * discountNum / 100)
    : discountNum;
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const advanceNum = parseFloat(advance) || 0;
  const due = Math.max(0, totalAmount - advanceNum);

  const addServiceToList = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    const existing = selectedServices.find(s => s.serviceId === serviceId);
    if (existing) {
      setSelectedServices(selectedServices.map(s =>
        s.serviceId === serviceId
          ? { ...s, quantity: s.quantity + 1, total: (s.quantity + 1) * s.rate }
          : s
      ));
    } else {
      setSelectedServices([...selectedServices, {
        serviceId,
        serviceName: service.name,
        quantity: 1,
        rate: service.defaultRate,
        total: service.defaultRate,
      }]);
    }
  };

  const updateServiceQuantity = (serviceId: string, qty: number) => {
    if (qty <= 0) {
      setSelectedServices(selectedServices.filter(s => s.serviceId !== serviceId));
    } else {
      setSelectedServices(selectedServices.map(s =>
        s.serviceId === serviceId
          ? { ...s, quantity: qty, total: qty * s.rate }
          : s
      ));
    }
  };

  const updateServiceRate = (serviceId: string, rate: number) => {
    setSelectedServices(selectedServices.map(s =>
      s.serviceId === serviceId
        ? { ...s, rate, total: s.quantity * rate }
        : s
    ));
  };

  const removeService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(s => s.serviceId !== serviceId));
  };

  const handleSave = () => {
    if (!customerId) {
      alert('গ্রাহক সিলেক্ট করুন');
      return;
    }
    if (selectedServices.length === 0) {
      alert('কমপক্ষে একটি সেবা যোগ করুন');
      return;
    }

    const jobData = {
      customerId,
      services: selectedServices,
      totalAmount,
      advance: advanceNum,
      due,
      date: existingJob?.date || Date.now(),
      status: status as 'pending' | 'in-progress' | 'completed' | 'cancelled',
      notes: discountAmount > 0 ? `${notes}\n[ডিসকাউন্ট: ৳${discountAmount}]` : notes,
      payments: existingJob?.payments || (advanceNum > 0 ? [{ amount: advanceNum, date: Date.now(), method: 'cash' as const }] : []),
    };

    if (editId) {
      updateJob(editId, jobData);
    } else {
      addJob(jobData);
    }

    refresh();
    navigate('jobs');
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('jobs')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-800">
          {editId ? 'কাজ এডিট করুন' : 'নতুন কাজ যোগ করুন'}
        </h2>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Customer Selection */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            👤 গ্রাহক সিলেক্ট করুন
          </label>

          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-blue-50 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-gray-800">{selectedCustomer.name}</p>
                    {selectedCustomer.isRegular && (
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{selectedCustomer.mobile}</p>
                </div>
              </div>
              <button onClick={() => { setCustomerId(''); setCustomerSearch(''); }} className="text-gray-400">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="নাম বা মোবাইল দিয়ে খুঁজুন..."
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {showCustomerDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-10">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-3 text-center">
                      <p className="text-xs text-gray-400">কোনো গ্রাহক পাওয়া যায়নি</p>
                      <button
                        onClick={() => { navigate('customer-form'); }}
                        className="text-primary text-xs font-semibold mt-1"
                      >
                        + নতুন গ্রাহক যোগ করুন
                      </button>
                    </div>
                  ) : (
                    filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setCustomerId(c.id); setShowCustomerDropdown(false); setCustomerSearch(''); }}
                        className="w-full px-3 py-2.5 text-left hover:bg-blue-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
                      >
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {c.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium text-gray-700">{c.name}</p>
                            {c.isRegular && <Star size={10} className="text-yellow-500 fill-yellow-500" />}
                          </div>
                          <p className="text-[10px] text-gray-400">{c.mobile}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Regular customer discount hint */}
          {selectedCustomer?.isRegular && (
            <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1.5 rounded-lg">
              <Star size={12} className="fill-yellow-500" />
              নিয়মিত গ্রাহক - ডিসকাউন্ট দিতে পারেন!
            </div>
          )}
        </div>

        {/* Service Selection */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            📋 সেবা সিলেক্ট করুন
          </label>

          {/* Service dropdown */}
          <select
            onChange={e => { if (e.target.value) addServiceToList(e.target.value); e.target.value = ''; }}
            className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            defaultValue=""
          >
            <option value="" disabled>সেবা নির্বাচন করুন...</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} (৳{s.defaultRate})
              </option>
            ))}
          </select>

          {/* Selected services */}
          {selectedServices.length > 0 && (
            <div className="mt-3 space-y-2">
              {selectedServices.map(s => (
                <div key={s.serviceId} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{s.serviceName}</span>
                    <button onClick={() => removeService(s.serviceId)}>
                      <X size={14} className="text-gray-400" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateServiceQuantity(s.serviceId, s.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{s.quantity}</span>
                      <button
                        onClick={() => updateServiceQuantity(s.serviceId, s.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="text-xs text-gray-400">×</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={s.rate}
                        onChange={e => updateServiceRate(s.serviceId, parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-right"
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 min-w-16 text-right">
                      ৳{s.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discount (for regular customers) */}
        {selectedCustomer?.isRegular && subtotal > 0 && (
          <div className="bg-yellow-50 rounded-2xl shadow-sm p-4 border border-yellow-200">
            <label className="text-sm font-semibold text-yellow-700 mb-2 flex items-center gap-1">
              <Percent size={14} />
              ডিসকাউন্ট (নিয়মিত গ্রাহক)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white rounded-xl border border-yellow-300 p-1">
                <input
                  type="number"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  placeholder="0"
                  className="flex-1 px-2 py-1.5 text-sm focus:outline-none bg-transparent"
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => setDiscountType('amount')}
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      discountType === 'amount' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    ৳
                  </button>
                  <button
                    onClick={() => setDiscountType('percent')}
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      discountType === 'percent' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>
            </div>
            {discountAmount > 0 && (
              <p className="text-xs text-yellow-600 mt-2">
                ডিসকাউন্ট: ৳{discountAmount}
              </p>
            )}
          </div>
        )}

        {/* Amount Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-sm font-semibold text-gray-700 mb-3 block">
            💰 টাকার হিসাব
          </label>

          <div className="space-y-3">
            {discountAmount > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">সাবটোটাল</span>
                  <span className="text-gray-600">৳{subtotal}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-yellow-600">ডিসকাউন্ট</span>
                  <span className="text-yellow-600">-৳{discountAmount}</span>
                </div>
              </>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">মোট টাকা</span>
              <span className="text-lg font-bold text-gray-800">৳{totalAmount}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600">অগ্রিম টাকা</span>
              <input
                type="number"
                value={advance}
                onChange={e => setAdvance(e.target.value)}
                className="w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="০"
              />
            </div>

            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-orange-600">বাকি টাকা</span>
              <span className="text-lg font-bold text-orange-600">৳{due}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            📝 নোট
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="কোনো বিশেষ নোট থাকলে লিখুন..."
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20"
          />
        </div>

        {/* Status (edit mode) */}
        {editId && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              📊 স্ট্যাটাস
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as 'pending' | 'in-progress' | 'completed' | 'cancelled')}
              className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="pending">পেন্ডিং</option>
              <option value="in-progress">চলমান</option>
              <option value="completed">সম্পন্ন</option>
              <option value="cancelled">বাতিল</option>
            </select>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-sm shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Save size={18} />
          {editId ? 'আপডেট করুন' : 'কাজ সেভ করুন'}
        </button>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { getCustomers, getJobs, formatTaka, deleteCustomer, getCustomerPhoto } from '../store';
import type { Page } from '../App';
import useResponsive from '../hooks/useResponsive';
import { Search, Users, ChevronRight, Star, Plus, Eye, Edit, Trash2, Phone, MapPin } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

export default function CustomerList({ navigate }: Props) {
  const { isMobile } = useResponsive();
  const [search, setSearch] = useState('');
  const [customersVersion, setCustomersVersion] = useState(0);
  
  const customers = useMemo(() => getCustomers().sort((a, b) => b.createdAt - a.createdAt), [customersVersion]);
  const jobs = useMemo(() => getJobs(), []);

  const filtered = useMemo(() => {
    return customers.filter(c => {
      if (!search) return true;
      const s = search.toLowerCase();
      return c.name.toLowerCase().includes(s) ||
        c.mobile.includes(s) ||
        c.address.toLowerCase().includes(s);
    });
  }, [customers, search]);

  const getCustomerDue = (customerId: string) => {
    return jobs
      .filter(j => j.customerId === customerId && j.status !== 'cancelled')
      .reduce((sum, j) => sum + j.due, 0);
  };

  const getCustomerJobCount = (customerId: string) => {
    return jobs.filter(j => j.customerId === customerId).length;
  };

  const getTotalSpent = (customerId: string) => {
    return jobs
      .filter(j => j.customerId === customerId && j.status !== 'cancelled')
      .reduce((sum, j) => sum + j.totalAmount, 0);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('এই গ্রাহক ডিলিট করতে চান? সব ডেটা মুছে যাবে।')) {
      deleteCustomer(id);
      setCustomersVersion(v => v + 1);
    }
  };

  // Desktop Layout
  if (!isMobile) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users size={28} className="text-primary" />
              গ্রাহক তালিকা
            </h1>
            <p className="text-gray-500 text-sm mt-1">মোট {customers.length}জন গ্রাহক</p>
          </div>
          <button
            onClick={() => navigate('customer-form')}
            className="px-4 py-2.5 bg-primary text-white rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-primary-dark transition-colors shadow-sm"
          >
            <Plus size={18} />
            নতুন গ্রাহক
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="নাম, মোবাইল বা ঠিকানা খুঁজুন..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-5xl mb-3">👥</div>
            <p className="text-gray-400">কোনো গ্রাহক পাওয়া যায়নি</p>
            <button
              onClick={() => navigate('customer-form')}
              className="mt-4 text-primary font-medium"
            >
              + নতুন গ্রাহক যোগ করুন
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(customer => {
              const due = getCustomerDue(customer.id);
              const jobCount = getCustomerJobCount(customer.id);
              const totalSpent = getTotalSpent(customer.id);

              return (
                <div
                  key={customer.id}
                  className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold overflow-hidden">
                        {getCustomerPhoto(customer.id) ? (
                          <img src={getCustomerPhoto(customer.id)!} alt="" className="w-full h-full object-cover" />
                        ) : customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-gray-800">{customer.name}</h3>
                          {customer.isRegular && (
                            <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Phone size={10} />
                          {customer.mobile}
                        </p>
                      </div>
                    </div>
                  </div>

                  {customer.address && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                      <MapPin size={10} />
                      {customer.address}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-gray-800">{jobCount}</p>
                      <p className="text-[10px] text-gray-400">কাজ</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold text-gray-800">{formatTaka(totalSpent)}</p>
                      <p className="text-[10px] text-gray-400">মোট খরচ</p>
                    </div>
                    <div className={`rounded-lg p-2 text-center ${due > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                      <p className={`text-sm font-bold ${due > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatTaka(due)}
                      </p>
                      <p className="text-[10px] text-gray-400">বাকি</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate('customer-detail', { customerId: customer.id })}
                      className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:bg-gray-200 transition-colors"
                    >
                      <Eye size={14} />
                      বিস্তারিত
                    </button>
                    <button
                      onClick={() => navigate('customer-form', { editId: customer.id })}
                      className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(customer.id, e)}
                      className="w-9 h-9 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Mobile Layout
  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-4 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Users size={22} className="text-primary" />
          গ্রাহক তালিকা
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {customers.length}জন
          </span>
        </h2>

        {/* Search */}
        <div className="mt-3 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="নাম, মোবাইল বা ঠিকানা খুঁজুন..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="px-4 py-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-gray-400 text-sm">কোনো গ্রাহক পাওয়া যায়নি</p>
            <button
              onClick={() => navigate('customer-form')}
              className="mt-3 text-primary text-sm font-semibold"
            >
              + নতুন গ্রাহক যোগ করুন
            </button>
          </div>
        ) : (
          filtered.map(customer => {
            const due = getCustomerDue(customer.id);
            const jobCount = getCustomerJobCount(customer.id);
            return (
              <button
                key={customer.id}
                onClick={() => navigate('customer-detail', { customerId: customer.id })}
                className="w-full bg-white rounded-xl shadow-sm p-3.5 text-left card-hover"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
                    {getCustomerPhoto(customer.id) ? (
                      <img src={getCustomerPhoto(customer.id)!} alt="" className="w-full h-full object-cover" />
                    ) : customer.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-gray-800 truncate">{customer.name}</p>
                      {customer.isRegular && (
                        <Star size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{customer.mobile}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-gray-400">{jobCount}টি কাজ</span>
                      {due > 0 && (
                        <span className="text-[10px] text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded">
                          বাকি: {formatTaka(due)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

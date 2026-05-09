import { useState, useMemo } from 'react';
import { getJobs, getCustomerById, formatTaka, formatDateShort, formatDate, deleteJob } from '../store';
import type { Page } from '../App';
import useResponsive from '../hooks/useResponsive';
import { Search, ChevronRight, Briefcase, Edit, Trash2, MoreVertical, Plus, Eye } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'সব' },
  { value: 'pending', label: 'পেন্ডিং' },
  { value: 'in-progress', label: 'চলমান' },
  { value: 'completed', label: 'সম্পন্ন' },
  { value: 'cancelled', label: 'বাতিল' },
];

export default function JobList({ navigate }: Props) {
  const { isMobile } = useResponsive();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [jobsVersion, setJobsVersion] = useState(0);
  
  const jobs = useMemo(() => getJobs().sort((a, b) => b.createdAt - a.createdAt), [jobsVersion]);

  const filtered = useMemo(() => {
    return jobs.filter(job => {
      const customer = getCustomerById(job.customerId);
      const matchesSearch = !search ||
        customer?.name.toLowerCase().includes(search.toLowerCase()) ||
        customer?.mobile.includes(search) ||
        job.services.some(s => s.serviceName.includes(search));
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, search, statusFilter]);

  const statusMap: Record<string, { label: string; class: string }> = {
    'pending': { label: 'পেন্ডিং', class: 'status-pending' },
    'in-progress': { label: 'চলমান', class: 'status-in-progress' },
    'completed': { label: 'সম্পন্ন', class: 'status-completed' },
    'cancelled': { label: 'বাতিল', class: 'status-cancelled' },
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('এই কাজ ডিলিট করতে চান?')) {
      deleteJob(id);
      setJobsVersion(v => v + 1);
      setActiveMenu(null);
    }
  };

  const handleEdit = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate('job-form', { editId: id });
  };

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };

  // Desktop Layout
  if (!isMobile) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Briefcase size={28} className="text-primary" />
              কাজের তালিকা
            </h1>
            <p className="text-gray-500 text-sm mt-1">মোট {jobs.length}টি কাজ</p>
          </div>
          <button
            onClick={() => navigate('job-form')}
            className="px-4 py-2.5 bg-primary text-white rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-primary-dark transition-colors shadow-sm"
          >
            <Plus size={18} />
            নতুন কাজ
          </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="গ্রাহক বা সেবা খুঁজুন..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="flex gap-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-gray-400">কোনো কাজ পাওয়া যায়নি</p>
              <button
                onClick={() => navigate('job-form')}
                className="mt-4 text-primary font-medium"
              >
                + নতুন কাজ যোগ করুন
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">গ্রাহক</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">সেবা</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">তারিখ</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">মোট</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">বাকি</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase">স্ট্যাটাস</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(job => {
                  const customer = getCustomerById(job.customerId);
                  const status = statusMap[job.status];
                  return (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-sm font-bold text-blue-600">
                            {customer?.name.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{customer?.name || 'অজানা'}</p>
                            <p className="text-xs text-gray-400">{customer?.mobile}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 max-w-xs truncate">
                          {job.services.map(s => s.serviceName).join(', ')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{formatDate(job.date)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-semibold text-gray-800">{formatTaka(job.totalAmount)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className={`text-sm font-semibold ${job.due > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatTaka(job.due)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate('job-detail', { jobId: job.id })}
                            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-blue-100 transition-colors"
                            title="বিস্তারিত"
                          >
                            <Eye size={14} className="text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => handleEdit(job.id, e)}
                            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-blue-100 transition-colors"
                            title="এডিট"
                          >
                            <Edit size={14} className="text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(job.id, e)}
                            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-red-100 transition-colors"
                            title="ডিলিট"
                          >
                            <Trash2 size={14} className="text-gray-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // Mobile Layout
  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-4 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Briefcase size={22} className="text-primary" />
          কাজের তালিকা
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {jobs.length}টি
          </span>
        </h2>

        {/* Search */}
        <div className="mt-3 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="গ্রাহক বা সেবা খুঁজুন..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Filter Tabs */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === opt.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Job List */}
      <div className="px-4 py-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-gray-400 text-sm">কোনো কাজ পাওয়া যায়নি</p>
            <button
              onClick={() => navigate('job-form')}
              className="mt-3 text-primary text-sm font-semibold"
            >
              + নতুন কাজ যোগ করুন
            </button>
          </div>
        ) : (
          filtered.map(job => {
            const customer = getCustomerById(job.customerId);
            const status = statusMap[job.status];
            const isMenuOpen = activeMenu === job.id;
            
            return (
              <div key={job.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => navigate('job-detail', { jobId: job.id })}
                  className="w-full p-3.5 text-left card-hover"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {customer?.name || 'অজানা গ্রাহক'}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.class}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {job.services.map(s => `${s.serviceName}${s.quantity > 1 ? ` (${s.quantity})` : ''}`).join(', ')}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs font-semibold text-gray-700">{formatTaka(job.totalAmount)}</span>
                        {job.due > 0 && (
                          <span className="text-[10px] text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded">
                            বাকি: {formatTaka(job.due)}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">{formatDateShort(job.date)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={(e) => toggleMenu(job.id, e)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"
                      >
                        <MoreVertical size={16} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                </button>

                {isMenuOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 flex items-center gap-2">
                    <button
                      onClick={(e) => handleEdit(job.id, e)}
                      className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <Edit size={14} />
                      এডিট
                    </button>
                    <button
                      onClick={() => navigate('job-detail', { jobId: job.id })}
                      className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <ChevronRight size={14} />
                      বিস্তারিত
                    </button>
                    <button
                      onClick={(e) => handleDelete(job.id, e)}
                      className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={14} />
                      ডিলিট
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {activeMenu && (
        <div className="fixed inset-0 z-[-1]" onClick={() => setActiveMenu(null)} />
      )}
    </div>
  );
}

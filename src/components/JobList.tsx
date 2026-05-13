import { useState, useMemo } from 'react';
import { getJobs, getCustomerById, formatTaka, formatDateShort, formatDate, deleteJob, updateJob } from '../store';
import type { Page } from '../App';
import useResponsive from '../hooks/useResponsive';
import { usePageLoad } from '../hooks/useLoading';
import { SkeletonJobList } from './ui/Skeleton';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { Search, ChevronRight, Briefcase, Edit, Trash2, MoreVertical, Plus, Eye } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'সব' },
  { value: 'pending', label: 'পেন্ডিং' },
  { value: 'in-progress', label: 'চলমান' },
  { value: 'completed', label: 'সম্পন্ন' },
  { value: 'cancelled', label: 'বাতিল' },
];

const statusCfg: Record<string, { label: string; cls: string; bar: string }> = {
  'pending': { label: 'পেন্ডিং', cls: 'status-pending', bar: 'status-bar-pending' },
  'in-progress': { label: 'চলমান', cls: 'status-in-progress', bar: 'status-bar-in-progress' },
  'completed': { label: 'সম্পন্ন', cls: 'status-completed', bar: 'status-bar-completed' },
  'cancelled': { label: 'বাতিল', cls: 'status-cancelled', bar: 'status-bar-cancelled' },
};

export default function JobList({ navigate }: Props) {
  const loading = usePageLoad();
  const { isMobile } = useResponsive();
  const { toast } = useToast();
  const confirm = useConfirm();
  if (loading) return <SkeletonJobList />;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [jobsVersion, setJobsVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const bulkMode = selectedIds.size > 0;

  const jobs = useMemo(() => getJobs().sort((a, b) => b.createdAt - a.createdAt), [jobsVersion]);

  const filtered = useMemo(() => jobs.filter(job => {
    const c = getCustomerById(job.customerId);
    const matchSearch = !search || c?.name.toLowerCase().includes(search.toLowerCase()) || c?.mobile.includes(search) || job.services.some(s => s.serviceName.includes(search));
    return matchSearch && (statusFilter === 'all' || job.status === statusFilter);
  }), [jobs, search, statusFilter]);

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const ok = await confirm({ title: 'কাজ ডিলিট', message: 'এই কাজটি ডিলিট করতে চান?', danger: true, confirmText: 'ডিলিট' });
    if (ok) { deleteJob(id); setJobsVersion(v => v + 1); setActiveMenu(null); toast.success('কাজ ডিলিট হয়েছে'); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const handleBulkDelete = async () => {
    const ok = await confirm({ title: 'বাল্ক ডিলিট', message: `${selectedIds.size}টি কাজ ডিলিট করতে চান?`, danger: true, confirmText: 'সব ডিলিট' });
    if (ok) { selectedIds.forEach(id => deleteJob(id)); setSelectedIds(new Set()); setJobsVersion(v => v + 1); toast.success(`${selectedIds.size}টি কাজ ডিলিট হয়েছে`); }
  };

  const handleBulkStatus = async (status: string) => {
    const labels: Record<string, string> = { 'completed': 'সম্পন্ন', 'pending': 'পেন্ডিং', 'in-progress': 'চলমান' };
    const ok = await confirm({ title: 'স্ট্যাটাস পরিবর্তন', message: `${selectedIds.size}টি কাজ "${labels[status]}" করতে চান?`, confirmText: 'পরিবর্তন করুন' });
    if (ok) { selectedIds.forEach(id => updateJob(id, { status: status as any })); setSelectedIds(new Set()); setJobsVersion(v => v + 1); toast.success(`${selectedIds.size}টি কাজ আপডেট হয়েছে`); }
  };

  // ═══ DESKTOP ═══
  if (!isMobile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2"><Briefcase size={28} className="text-primary" />কাজের তালিকা</h1><p className="text-gray-500 text-sm mt-1">মোট {jobs.length}টি কাজ</p></div>
          <button onClick={() => navigate('job-form')} className="px-5 py-2.5 rounded-full font-semibold text-sm text-white flex items-center gap-2 btn-wc btn-primary-wc"><Plus size={18} />নতুন কাজ</button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="গ্রাহক বা সেবা খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm form-input-wc" /></div>
            <div className="flex gap-1.5">{STATUS_OPTIONS.map(opt => <button key={opt.value} onClick={() => setStatusFilter(opt.value)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${statusFilter === opt.value ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{opt.label}</button>)}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden">
          {filtered.length === 0 ? <EmptyList onAction={() => navigate('job-form')} /> : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100"><tr>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">গ্রাহক</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">সেবা</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">তারিখ</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">মোট</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">বাকি</th>
                <th className="text-center px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">স্ট্যাটাস</th>
                <th className="text-center px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">অ্যাকশন</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">{filtered.map(job => {
                const c = getCustomerById(job.customerId); const s = statusCfg[job.status];
                return (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-sm font-bold text-primary">{c?.name.charAt(0) || '?'}</div><div><p className="text-sm font-medium text-gray-800">{c?.name || 'অজানা'}</p><p className="text-xs text-gray-400">{c?.mobile}</p></div></div></td>
                    <td className="px-6 py-4"><p className="text-sm text-gray-600 max-w-xs truncate">{job.services.map(sv => sv.serviceName).join(', ')}</p></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(job.date)}</td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-800">{formatTaka(job.totalAmount)}</td>
                    <td className="px-6 py-4 text-right"><span className={`text-sm font-bold ${job.due > 0 ? 'text-warning' : 'text-success'}`}>{formatTaka(job.due)}</span></td>
                    <td className="px-6 py-4 text-center"><span className={`text-[11px] px-3 py-1 rounded-full font-semibold ${s.cls}`}>{s.label}</span></td>
                    <td className="px-6 py-4"><div className="flex items-center justify-center gap-1">
                      <button onClick={() => navigate('job-detail', { jobId: job.id })} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-blue-100 transition-colors" aria-label="বিস্তারিত"><Eye size={14} className="text-gray-600" /></button>
                      <button onClick={() => navigate('job-form', { editId: job.id })} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-blue-100 transition-colors" aria-label="এডিট"><Edit size={14} className="text-gray-600" /></button>
                      <button onClick={(e) => handleDelete(job.id, e)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-red-100 transition-colors" aria-label="ডিলিট"><Trash2 size={14} className="text-gray-600" /></button>
                    </div></td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ═══ MOBILE ═══
  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-200/60">
        {bulkMode ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedIds(new Set())} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600" aria-label="বাতিল">✕</button>
              <span className="text-sm font-semibold text-gray-800">{selectedIds.size}টি সিলেক্টেড</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleBulkStatus('completed')} className="px-3 py-1.5 bg-success-light text-success-dark rounded-xl text-xs font-semibold active:scale-95 transition-all">✅ সম্পন্ন</button>
              <button onClick={() => handleBulkStatus('pending')} className="px-3 py-1.5 bg-warning-light text-warning-dark rounded-xl text-xs font-semibold active:scale-95 transition-all">⏳ পেন্ডিং</button>
              <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-danger-light text-danger-dark rounded-xl text-xs font-semibold active:scale-95 transition-all">🗑️ ডিলিট</button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Briefcase size={22} className="text-primary" />কাজের তালিকা<span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-1">{jobs.length}টি</span></h2>
            <div className="mt-3 relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="গ্রাহক বা সেবা খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm form-input-wc" /></div>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{STATUS_OPTIONS.map(opt => <button key={opt.value} onClick={() => setStatusFilter(opt.value)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${statusFilter === opt.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{opt.label}</button>)}</div>
          </>
        )}
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {filtered.length === 0 ? <EmptyList onAction={() => navigate('job-form')} /> : filtered.map((job, i) => {
          const c = getCustomerById(job.customerId); const s = statusCfg[job.status]; const isOpen = activeMenu === job.id;
          return (
            <div key={job.id} className={`animate-item bg-white rounded-2xl border border-gray-200/60 overflow-hidden list-item-status ${s.bar}`} style={{ animationDelay: `${i * 50}ms` }}>
              <button onClick={() => bulkMode ? toggleSelect(job.id) : navigate('job-detail', { jobId: job.id })} onContextMenu={(e) => { e.preventDefault(); toggleSelect(job.id); }} className="w-full p-4 text-left">
                <div className="flex items-center gap-3.5">
                  {bulkMode ? (
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${selectedIds.has(job.id) ? 'bg-primary border-primary text-white' : 'border-gray-300'}`}>
                      {selectedIds.has(job.id) && <span className="text-xs">✓</span>}
                    </div>
                  ) : null}
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary font-bold text-base flex-shrink-0">{c?.name.charAt(0) || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><p className="text-[15px] font-semibold text-gray-800 truncate">{c?.name || 'অজানা'}</p><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.cls}`}>{s.label}</span></div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{job.services.map(sv => sv.serviceName).join(', ')}</p>
                    <div className="flex items-center gap-3 mt-1.5"><span className="text-xs font-bold text-gray-700">{formatTaka(job.totalAmount)}</span>{job.due > 0 && <span className="text-[10px] text-warning font-semibold bg-warning-light px-1.5 py-0.5 rounded">বাকি {formatTaka(job.due)}</span>}<span className="text-[10px] text-gray-400">{formatDateShort(job.date)}</span></div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setActiveMenu(isOpen ? null : job.id); }} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100" aria-label="মেনু"><MoreVertical size={16} className="text-gray-400" /></button>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50 px-3 py-2.5 flex items-center gap-2 fade-in">
                  <button onClick={() => { navigate('job-form', { editId: job.id }); }} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"><Edit size={14} />এডিট</button>
                  <button onClick={() => navigate('job-detail', { jobId: job.id })} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"><ChevronRight size={14} />বিস্তারিত</button>
                  <button onClick={(e) => handleDelete(job.id, e)} className="flex-1 py-2 bg-red-50 text-danger rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"><Trash2 size={14} />ডিলিট</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {activeMenu && <div className="fixed inset-0 z-[-1]" onClick={() => setActiveMenu(null)} />}
    </div>
  );
}

function EmptyList({ onAction }: { onAction: () => void }) {
  return (
    <div className="py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-4xl mx-auto mb-4 empty-illustration">📋</div>
      <p className="text-gray-500 font-medium">কোনো কাজ পাওয়া যায়নি</p>
      <button onClick={onAction} className="mt-3 text-primary text-sm font-semibold">+ নতুন কাজ যোগ করুন</button>
    </div>
  );
}

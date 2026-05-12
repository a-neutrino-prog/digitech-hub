import { useState, useMemo } from 'react';
import { getCustomers, getJobs, formatTaka, deleteCustomer, getCustomerPhoto } from '../store';
import type { Page } from '../App';
import useResponsive from '../hooks/useResponsive';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { Search, Users, ChevronRight, Star, Plus, Eye, Edit, Trash2, Phone, MapPin } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

export default function CustomerList({ navigate }: Props) {
  const { isMobile } = useResponsive();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [ver, setVer] = useState(0);

  const customers = useMemo(() => getCustomers().sort((a, b) => b.createdAt - a.createdAt), [ver]);
  const jobs = useMemo(() => getJobs(), []);

  const filtered = useMemo(() => customers.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.name.toLowerCase().includes(s) || c.mobile.includes(s) || c.address.toLowerCase().includes(s);
  }), [customers, search]);

  const getDue = (id: string) => jobs.filter(j => j.customerId === id && j.status !== 'cancelled').reduce((s, j) => s + j.due, 0);
  const getJobCount = (id: string) => jobs.filter(j => j.customerId === id).length;
  const getSpent = (id: string) => jobs.filter(j => j.customerId === id && j.status !== 'cancelled').reduce((s, j) => s + j.totalAmount, 0);

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const ok = await confirm({ title: 'গ্রাহক ডিলিট', message: 'এই গ্রাহক ডিলিট করতে চান? সব ডেটা মুছে যাবে।', danger: true, confirmText: 'ডিলিট' });
    if (ok) { deleteCustomer(id); setVer(v => v + 1); toast.success('গ্রাহক ডিলিট হয়েছে'); }
  };

  function Avatar({ id, name }: { id: string; name: string }) {
    const photo = getCustomerPhoto(id);
    return (
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold overflow-hidden flex-shrink-0">
        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : name.charAt(0)}
      </div>
    );
  }

  // ═══ DESKTOP ═══
  if (!isMobile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2"><Users size={28} className="text-primary" />গ্রাহক তালিকা</h1><p className="text-gray-500 text-sm mt-1">মোট {customers.length}জন</p></div>
          <button onClick={() => navigate('customer-form')} className="px-5 py-2.5 rounded-full font-semibold text-sm text-white flex items-center gap-2 btn-wc btn-primary-wc"><Plus size={18} />নতুন গ্রাহক</button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4"><div className="relative max-w-md"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="নাম, মোবাইল বা ঠিকানা খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm form-input-wc" /></div></div>
        {filtered.length === 0 ? <div className="bg-white rounded-2xl border border-gray-200/60 py-16 text-center"><div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-4xl mx-auto mb-4 empty-illustration">👥</div><p className="text-gray-500 font-medium">কোনো গ্রাহক নেই</p><button onClick={() => navigate('customer-form')} className="mt-3 text-primary text-sm font-semibold">+ গ্রাহক যোগ</button></div> : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(c => {
            const due = getDue(c.id), count = getJobCount(c.id), spent = getSpent(c.id);
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-200/60 p-5 hover:shadow-md transition-all card-hover">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3"><Avatar id={c.id} name={c.name} /><div><div className="flex items-center gap-1.5"><h3 className="font-semibold text-gray-800">{c.name}</h3>{c.isRegular && <Star size={14} className="text-yellow-500 fill-yellow-500" />}</div><p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Phone size={10} />{c.mobile}</p></div></div>
                </div>
                {c.address && <p className="text-xs text-gray-400 flex items-center gap-1 mb-3"><MapPin size={10} />{c.address}</p>}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-gray-50 rounded-xl p-2 text-center"><p className="text-lg font-bold text-gray-800">{count}</p><p className="text-[10px] text-gray-400">কাজ</p></div>
                  <div className="bg-gray-50 rounded-xl p-2 text-center"><p className="text-sm font-bold text-gray-800">{formatTaka(spent)}</p><p className="text-[10px] text-gray-400">খরচ</p></div>
                  <div className={`rounded-xl p-2 text-center ${due > 0 ? 'bg-orange-50' : 'bg-green-50'}`}><p className={`text-sm font-bold ${due > 0 ? 'text-warning' : 'text-success'}`}>{formatTaka(due)}</p><p className="text-[10px] text-gray-400">বাকি</p></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate('customer-detail', { customerId: c.id })} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 hover:bg-gray-200 transition-colors"><Eye size={14} />বিস্তারিত</button>
                  <button onClick={() => navigate('customer-form', { editId: c.id })} className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-colors" aria-label="এডিট"><Edit size={14} /></button>
                  <button onClick={(e) => handleDelete(c.id, e)} className="w-9 h-9 bg-red-50 text-danger rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors" aria-label="ডিলিট"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}</div>
        )}
      </div>
    );
  }

  // ═══ MOBILE ═══
  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-200/60">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Users size={22} className="text-primary" />গ্রাহক তালিকা<span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-1">{customers.length}জন</span></h2>
        <div className="mt-3 relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="নাম, মোবাইল বা ঠিকানা খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm form-input-wc" /></div>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        {filtered.length === 0 ? <div className="bg-white rounded-2xl border border-gray-200/60 py-12 text-center"><div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-3xl mx-auto mb-3 empty-illustration">👥</div><p className="text-gray-400 text-sm">কোনো গ্রাহক নেই</p><button onClick={() => navigate('customer-form')} className="mt-2 text-primary text-sm font-semibold">+ গ্রাহক যোগ</button></div> : (
          filtered.map((c, i) => {
            const due = getDue(c.id), count = getJobCount(c.id);
            return (
              <button key={c.id} onClick={() => navigate('customer-detail', { customerId: c.id })} className={`animate-item w-full bg-white rounded-2xl border border-gray-200/60 p-4 text-left card-hover`} style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                    {getCustomerPhoto(c.id) ? <img src={getCustomerPhoto(c.id)!} alt="" className="w-full h-full object-cover" /> : c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5"><p className="text-[15px] font-semibold text-gray-800 truncate">{c.name}</p>{c.isRegular && <Star size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}</div>
                    <p className="text-xs text-gray-400 mt-0.5">{c.mobile}</p>
                    <div className="flex items-center gap-3 mt-1"><span className="text-[10px] text-gray-400">{count}টি কাজ</span>{due > 0 && <span className="text-[10px] text-warning font-semibold bg-warning-light px-1.5 py-0.5 rounded">বাকি {formatTaka(due)}</span>}</div>
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

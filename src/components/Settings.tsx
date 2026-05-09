import { useState } from 'react';
import { getShopInfo, updateShopInfo, getServices, addService, updateService, deleteService, exportBackup, importBackup, clearAllData, isPinEnabled, setPinCode, removePinCode, exportJobsCSV, exportTransactionsCSV, exportCustomersCSV } from '../store';
import { useDarkMode } from '../hooks/useDarkMode';
import type { Page } from '../App';
import { ArrowLeft, Save, Download, Upload, Trash2, Plus, Edit, X, Moon, Sun, FileSpreadsheet, Shield } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
  refresh: () => void;
}

export default function Settings({ navigate, refresh }: Props) {
  const shopInfo = getShopInfo();
  const [shopName, setShopName] = useState(shopInfo.shopName);
  const [ownerName, setOwnerName] = useState(shopInfo.ownerName);
  const [phone, setPhone] = useState(shopInfo.phone);
  const [address, setAddress] = useState(shopInfo.address);
  const [showServices, setShowServices] = useState(false);
  const [services, setServicesState] = useState(getServices());
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceRate, setNewServiceRate] = useState('');
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceRate, setEditServiceRate] = useState('');

  // PIN
  const [pinEnabled, setPinEnabled] = useState(isPinEnabled());
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Dark Mode
  const { dark, toggle: toggleDark } = useDarkMode();

  const handleSaveShopInfo = () => {
    updateShopInfo({ shopName, ownerName, phone, address });
    alert('দোকানের তথ্য সেভ করা হয়েছে!');
    refresh();
  };

  const handleExport = () => {
    const data = exportBackup();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digitech-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = importBackup(ev.target?.result as string);
        if (result) {
          alert('ব্যাকআপ সফলভাবে রিস্টোর করা হয়েছে!');
          window.location.reload();
        } else {
          alert('ব্যাকআপ ফাইল সঠিক নয়!');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearData = () => {
    if (confirm('⚠️ সতর্কতা: সব ডেটা মুছে যাবে! আপনি কি নিশ্চিত?')) {
      if (confirm('আবারও নিশ্চিত করুন - সব ডেটা ডিলিট হবে!')) {
        clearAllData();
        window.location.reload();
      }
    }
  };

  const handleAddService = () => {
    if (!newServiceName.trim()) return;
    addService({ name: newServiceName.trim(), defaultRate: parseFloat(newServiceRate) || 0, isActive: true });
    setNewServiceName('');
    setNewServiceRate('');
    setServicesState(getServices());
  };

  const handleUpdateService = (id: string) => {
    updateService(id, { name: editServiceName, defaultRate: parseFloat(editServiceRate) || 0 });
    setEditingService(null);
    setServicesState(getServices());
  };

  const handleDeleteService = (id: string) => {
    if (confirm('এই সেবা ডিলিট করতে চান?')) {
      deleteService(id);
      setServicesState(getServices());
    }
  };

  // PIN Handlers
  const handleSetPin = () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      alert('৪ সংখ্যার PIN দিন');
      return;
    }
    if (newPin !== confirmPin) {
      alert('PIN মিলছে না!');
      return;
    }
    setPinCode(newPin);
    setPinEnabled(true);
    setShowPinSetup(false);
    setNewPin('');
    setConfirmPin('');
    alert('PIN সেট করা হয়েছে!');
  };

  const handleRemovePin = () => {
    if (confirm('PIN লক বন্ধ করতে চান?')) {
      removePinCode();
      setPinEnabled(false);
    }
  };

  // CSV Export
  const downloadCSV = (content: string, filename: string) => {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-800">⚙️ সেটিংস</h2>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Cloud Sync Link */}
        <button
          onClick={() => navigate('cloud-sync')}
          className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4 card-hover"
        >
          <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
            <span className="text-2xl">☁️</span>
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-gray-700">ক্লাউড সিঙ্ক</p>
            <p className="text-xs text-gray-400">Firebase দিয়ে অটো ব্যাকআপ ও সিঙ্ক</p>
          </div>
          <span className="text-gray-300">›</span>
        </button>

        {/* Dark Mode Toggle */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {dark ? <Moon size={20} className="text-indigo-500" /> : <Sun size={20} className="text-yellow-500" />}
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  {dark ? '🌙 ডার্ক মোড' : '☀️ লাইট মোড'}
                </p>
                <p className="text-xs text-gray-400">থিম পরিবর্তন করুন</p>
              </div>
            </div>
            <button
              onClick={toggleDark}
              className={`w-14 h-7 rounded-full transition-all relative ${dark ? 'bg-indigo-500' : 'bg-gray-300'}`}
            >
              <div className={`w-6 h-6 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${dark ? 'left-7' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        {/* PIN Lock */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-gray-700">🔐 PIN লক</p>
                <p className="text-xs text-gray-400">
                  {pinEnabled ? 'সক্রিয় - অ্যাপ খোলার সময় PIN লাগবে' : 'নিষ্ক্রিয়'}
                </p>
              </div>
            </div>
            {pinEnabled ? (
              <button
                onClick={handleRemovePin}
                className="text-xs text-red-500 font-medium px-3 py-1.5 bg-red-50 rounded-lg"
              >
                বন্ধ করুন
              </button>
            ) : (
              <button
                onClick={() => setShowPinSetup(true)}
                className="text-xs text-primary font-medium px-3 py-1.5 bg-blue-50 rounded-lg"
              >
                সেট করুন
              </button>
            )}
          </div>

          {showPinSetup && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">নতুন PIN (৪ সংখ্যা)</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-center tracking-[1em] focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">PIN নিশ্চিত করুন</label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-center tracking-[1em] focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSetPin}
                  className="flex-1 py-2 bg-primary text-white rounded-xl text-sm font-medium"
                >
                  সেভ
                </button>
                <button
                  onClick={() => { setShowPinSetup(false); setNewPin(''); setConfirmPin(''); }}
                  className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm"
                >
                  বাতিল
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Shop Info */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">🏪 দোকানের তথ্য</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">দোকানের নাম</label>
              <input type="text" value={shopName} onChange={e => setShopName(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">মালিকের নাম</label>
              <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ফোন নম্বর</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ঠিকানা</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <button onClick={handleSaveShopInfo}
              className="w-full py-2.5 bg-primary text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2">
              <Save size={16} /> সেভ করুন
            </button>
          </div>
        </div>

        {/* Service Management */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <button onClick={() => setShowServices(!showServices)} className="w-full flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">📋 সেবা রেট ম্যানেজমেন্ট</h3>
            <span className="text-xs text-primary">{showServices ? 'বন্ধ করুন' : 'দেখুন'}</span>
          </button>
          {showServices && (
            <div className="mt-3 space-y-2">
              {services.map(s => (
                <div key={s.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
                  {editingService === s.id ? (
                    <>
                      <input type="text" value={editServiceName} onChange={e => setEditServiceName(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs" />
                      <input type="number" value={editServiceRate} onChange={e => setEditServiceRate(e.target.value)}
                        className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs" />
                      <button onClick={() => handleUpdateService(s.id)} className="text-green-500"><Save size={14} /></button>
                      <button onClick={() => setEditingService(null)} className="text-gray-400"><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-700">{s.name}</span>
                      <span className="text-xs font-medium text-gray-500">৳{s.defaultRate}</span>
                      <button onClick={() => { setEditingService(s.id); setEditServiceName(s.name); setEditServiceRate(s.defaultRate.toString()); }}
                        className="w-6 h-6 rounded-md bg-white flex items-center justify-center"><Edit size={12} className="text-gray-400" /></button>
                      <button onClick={() => handleDeleteService(s.id)}
                        className="w-6 h-6 rounded-md bg-white flex items-center justify-center"><Trash2 size={12} className="text-red-400" /></button>
                    </>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <input type="text" value={newServiceName} onChange={e => setNewServiceName(e.target.value)}
                  placeholder="নতুন সেবা নাম" className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs" />
                <input type="number" value={newServiceRate} onChange={e => setNewServiceRate(e.target.value)}
                  placeholder="রেট" className="w-20 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs" />
                <button onClick={handleAddService} className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Plus size={14} className="text-white" /></button>
              </div>
            </div>
          )}
        </div>

        {/* CSV Export */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-green-600" />
            CSV/Excel এক্সপোর্ট
          </h3>
          <div className="space-y-2">
            <button onClick={() => downloadCSV(exportJobsCSV(), `jobs-${new Date().toISOString().split('T')[0]}.csv`)}
              className="w-full py-2.5 bg-green-50 text-green-700 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-green-200">
              <Download size={16} /> কাজের ডেটা (CSV)
            </button>
            <button onClick={() => downloadCSV(exportTransactionsCSV(), `transactions-${new Date().toISOString().split('T')[0]}.csv`)}
              className="w-full py-2.5 bg-blue-50 text-blue-700 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-blue-200">
              <Download size={16} /> হিসাব ডেটা (CSV)
            </button>
            <button onClick={() => downloadCSV(exportCustomersCSV(), `customers-${new Date().toISOString().split('T')[0]}.csv`)}
              className="w-full py-2.5 bg-purple-50 text-purple-700 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-purple-200">
              <Download size={16} /> গ্রাহক ডেটা (CSV)
            </button>
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">💾 ব্যাকআপ ও রিস্টোর</h3>
          <div className="space-y-2">
            <button onClick={handleExport}
              className="w-full py-2.5 bg-green-50 text-green-700 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-green-200">
              <Download size={16} /> ব্যাকআপ ডাউনলোড করুন
            </button>
            <button onClick={handleImport}
              className="w-full py-2.5 bg-blue-50 text-blue-700 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-blue-200">
              <Upload size={16} /> ব্যাকআপ রিস্টোর করুন
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-red-100">
          <h3 className="text-sm font-semibold text-red-600 mb-3">⚠️ বিপদ অঞ্চল</h3>
          <button onClick={handleClearData}
            className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-red-200">
            <Trash2 size={16} /> সব ডেটা মুছে ফেলুন
          </button>
          <p className="text-[10px] text-red-400 mt-2 text-center">সতর্কতা: এটি সব ডেটা স্থায়ীভাবে মুছে ফেলবে</p>
        </div>
      </div>
    </div>
  );
}

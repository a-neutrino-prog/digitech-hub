import { useState, useMemo } from 'react';
import { getJobs, getCustomerById, formatTaka } from '../store';
import type { Page } from '../App';
import useResponsive from '../hooks/useResponsive';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

const WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

export default function CalendarView({ navigate }: Props) {
  const { isMobile } = useResponsive();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const allJobs = useMemo(() => getJobs(), []);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return days;
  }, [year, month]);

  // Jobs count per day
  const jobsByDay = useMemo(() => {
    const map: Record<number, { count: number; income: number; pending: number }> = {};
    allJobs.forEach(job => {
      const d = new Date(job.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = { count: 0, income: 0, pending: 0 };
        map[day].count++;
        if (job.status !== 'cancelled') map[day].income += job.totalAmount;
        if (job.status === 'pending' || job.status === 'in-progress') map[day].pending++;
      }
    });
    return map;
  }, [allJobs, year, month]);

  // Selected day jobs
  const selectedDayJobs = useMemo(() => {
    if (!selectedDate) return [];
    return allJobs.filter(j => {
      const d = new Date(j.date);
      return d.getFullYear() === selectedDate.getFullYear() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getDate() === selectedDate.getDate();
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [allJobs, selectedDate]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isSelected = (day: number) =>
    selectedDate && day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();

  const statusMap: Record<string, { label: string; class: string }> = {
    'pending': { label: 'পেন্ডিং', class: 'status-pending' },
    'in-progress': { label: 'চলমান', class: 'status-in-progress' },
    'completed': { label: 'সম্পন্ন', class: 'status-completed' },
    'cancelled': { label: 'বাতিল', class: 'status-cancelled' },
  };

  return (
    <div className={isMobile ? 'bg-gray-100 min-h-screen' : 'space-y-6'}>
      {/* Header */}
      {isMobile ? (
        <div className="bg-white px-4 pt-4 pb-3 shadow-sm flex items-center gap-3">
          <button onClick={() => navigate('dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <h2 className="text-lg font-bold text-gray-800">📅 ক্যালেন্ডার ভিউ</h2>
        </div>
      ) : (
        <h1 className="text-2xl font-bold text-gray-800">📅 ক্যালেন্ডার ভিউ</h1>
      )}

      <div className={`${isMobile ? 'px-4 py-3' : ''} ${!isMobile ? 'grid grid-cols-3 gap-6' : 'space-y-3'}`}>
        {/* Calendar */}
        <div className={`bg-white rounded-2xl shadow-sm p-4 ${!isMobile ? 'col-span-2' : ''}`}>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <h3 className="text-base font-bold text-gray-800">
              {MONTHS[month]} {year}
            </h3>
            <button onClick={nextMonth} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-[10px] font-semibold text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={i} />;
              const dayData = jobsByDay[day];
              const todayClass = isToday(day);
              const selectedClass = isSelected(day);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(new Date(year, month, day))}
                  className={`relative p-1 rounded-xl text-center transition-all min-h-[44px] min-w-[44px] flex flex-col items-center justify-start active:scale-95 ${
                    selectedClass
                      ? 'bg-primary text-white shadow-md'
                      : todayClass
                      ? 'bg-blue-50 text-primary font-bold'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-sm ${selectedClass ? 'font-bold' : 'font-medium'}`}>{day}</span>
                  {dayData && (
                    <div className="flex gap-0.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedClass ? 'bg-white/70' : 'bg-blue-400'}`} />
                      {dayData.pending > 0 && (
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedClass ? 'bg-yellow-300' : 'bg-yellow-400'}`} />
                      )}
                    </div>
                  )}
                  {dayData && !isMobile && (
                    <span className={`text-[9px] mt-0.5 ${selectedClass ? 'text-white/80' : 'text-gray-400'}`}>
                      {dayData.count}টি
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> কাজ আছে</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> পেন্ডিং</span>
          </div>
        </div>

        {/* Selected Day Details */}
        <div className={`bg-white rounded-2xl shadow-sm p-4 ${!isMobile ? '' : ''}`}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {selectedDate ? (
              <>
                📋 {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]} -
                {selectedDayJobs.length > 0 ? ` ${selectedDayJobs.length}টি কাজ` : ' কোনো কাজ নেই'}
              </>
            ) : 'একটি তারিখ সিলেক্ট করুন'}
          </h3>

          {selectedDayJobs.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">📝</div>
              <p className="text-gray-400 text-xs">এই তারিখে কোনো কাজ নেই</p>
              <button
                onClick={() => navigate('job-form')}
                className="mt-2 text-primary text-xs font-semibold"
              >
                + নতুন কাজ যোগ করুন
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {selectedDayJobs.map(job => {
                const customer = getCustomerById(job.customerId);
                const status = statusMap[job.status];
                return (
                  <button
                    key={job.id}
                    onClick={() => navigate('job-detail', { jobId: job.id })}
                    className="w-full p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-left transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{customer?.name || 'অজানা'}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.class}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{job.services.map(s => s.serviceName).join(', ')}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs font-semibold text-gray-700">{formatTaka(job.totalAmount)}</span>
                      {job.due > 0 && <span className="text-[10px] text-orange-600">বাকি: {formatTaka(job.due)}</span>}
                    </div>
                  </button>
                );
              })}

              {/* Day Summary */}
              <div className="mt-2 pt-2 border-t border-gray-100 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>মোট আয়:</span>
                  <span className="font-semibold text-green-600">
                    {formatTaka(selectedDayJobs.filter(j => j.status !== 'cancelled').reduce((s, j) => s + j.totalAmount - j.due, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

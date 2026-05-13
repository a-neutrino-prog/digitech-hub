// ═══════════════════════════════════════════════════════
// STORE — Re-export Hub
// All domain logic split into src/stores/*.ts
// This file re-exports everything for backward compatibility
// ═══════════════════════════════════════════════════════

// Helpers
export { generateId, formatTaka, formatDate, formatDateShort, toBanglaNum, getTodayStart, getTodayEnd, isToday } from './stores/helpers';

// Customers
export { getCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomerById, setCustomerPhoto, getCustomerPhoto, removeCustomerPhoto } from './stores/customers';
export type { Customer } from './stores/customers';

// Services
export { getServices, addService, updateService, deleteService } from './stores/services';
export type { Service } from './stores/services';

// Jobs
export { getJobs, addJob, updateJob, completeJob, addPaymentToJob, deleteJob, deletePaymentFromJob, updatePaymentInJob, generateJobNumber } from './stores/jobs';
export type { Job, JobStatus, Payment, JobService } from './stores/jobs';

// Transactions
export { getTransactions, addTransaction, updateTransaction, deleteTransaction, EXPENSE_CATEGORIES } from './stores/transactions';
export type { Transaction } from './stores/transactions';

// Reminders
export { getReminders, addReminder, updateReminder, deleteReminder, completeReminder, getActiveReminders, getUpcomingReminders } from './stores/reminders';
export type { Reminder } from './stores/reminders';

// Due Tracking
export { getDueTrackers, getDueTracker, upsertDueTracker, addDueFollowUp, updateDueStatus, getCustomerFollowUps, getOverdueCount, refreshDueStatuses, DUE_STATUS_CONFIG } from './stores/dueTracking';
export type { DueStatus, DueFollowUp, DueTracker } from './stores/dueTracking';

// Settings & Notifications
export { getShopInfo, updateShopInfo, getNotifications, addNotification, markNotificationRead, markAllNotificationsRead, deleteNotification } from './stores/settings';
export { hashPin, getPinHash, setPinCode, verifyPin, removePinCode, isPinEnabled, getDarkMode, setDarkMode, isOnboardingComplete, completeOnboarding } from './stores/settings';
export type { ShopInfo, Notification } from './stores/settings';

// Dashboard Stats
import { getTransactions } from './stores/transactions';
import { getJobs } from './stores/jobs';
import { getTodayStart, getTodayEnd } from './stores/helpers';

export function getDashboardStats() {
  const todayStart = getTodayStart(), todayEnd = getTodayEnd();
  const txs = getTransactions();
  const jobs = getJobs();
  const todayTxs = txs.filter(t => t.date >= todayStart && t.date <= todayEnd);
  const todayIncome = todayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const todayExpense = todayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const todayJobs = jobs.filter(j => j.date >= todayStart && j.date <= todayEnd);
  return {
    todayIncome, todayExpense,
    totalDue: jobs.filter(j => j.status !== 'cancelled').reduce((s, j) => s + j.due, 0),
    todayJobsTotal: todayJobs.length,
    pendingJobs: todayJobs.filter(j => j.status === 'pending' || j.status === 'in-progress').length,
    completedJobs: todayJobs.filter(j => j.status === 'completed').length,
  };
}

// Backup / Restore
import { getCustomers } from './stores/customers';
import { getServices } from './stores/services';
import { getShopInfo, getNotifications } from './stores/settings';
import { getReminders } from './stores/reminders';
import { setItem } from './stores/helpers';

export function exportBackup(): string {
  return JSON.stringify({
    customers: getCustomers(), services: getServices(), jobs: getJobs(),
    transactions: getTransactions(), shopInfo: getShopInfo(),
    notifications: getNotifications(), reminders: getReminders(), exportedAt: Date.now(),
  }, null, 2);
}

export function importBackup(jsonStr: string): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') return { success: false, error: 'সঠিক JSON নয়' };
    const arrays = ['customers', 'jobs', 'transactions', 'services', 'notifications', 'reminders'];
    for (const key of arrays) { if (data[key] && !Array.isArray(data[key])) return { success: false, error: `"${key}" সঠিক নয়` }; }
    for (const key of arrays) { if (data[key]) setItem(key, data[key]); }
    if (data.shopInfo) setItem('shopInfo', data.shopInfo);
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message || 'ফাইল পড়া যায়নি' }; }
}

export function clearAllData(): void {
  ['customers', 'services', 'jobs', 'transactions', 'notifications', 'reminders'].forEach(k => localStorage.removeItem(k));
}

// CSV Exports
import { getCustomerById } from './stores/customers';

function csvEscape(val: any): string {
  const str = String(val ?? '');
  return (str.includes(',') || str.includes('"') || str.includes('\n')) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function exportJobsCSV(): string {
  const headers = 'Date,JobNumber,Customer,Mobile,Services,Total,Advance,Due,Status';
  const rows = getJobs().map(j => { const c = getCustomerById(j.customerId); return [csvEscape(new Date(j.date).toLocaleDateString()), csvEscape(j.jobNumber||''), csvEscape(c?.name||''), csvEscape(c?.mobile||''), csvEscape(j.services.map(s=>s.serviceName).join('; ')), j.totalAmount, j.advance, j.due, csvEscape(j.status)].join(','); });
  return [headers, ...rows].join('\n');
}

export function exportTransactionsCSV(): string {
  const headers = 'Date,Type,Category,Amount,Description';
  const rows = getTransactions().map(t => [csvEscape(new Date(t.date).toLocaleDateString()), csvEscape(t.type==='income'?'Income':'Expense'), csvEscape(t.category), t.amount, csvEscape(t.description||'')].join(','));
  return [headers, ...rows].join('\n');
}

export function exportCustomersCSV(): string {
  const headers = 'Name,Mobile,Address,NID,Regular,TotalJobs,TotalSpent,TotalDue';
  const allJobs = getJobs();
  const rows = getCustomers().map(c => { const cj = allJobs.filter(j=>j.customerId===c.id&&j.status!=='cancelled'); return [csvEscape(c.name), csvEscape(c.mobile), csvEscape(c.address||''), csvEscape(c.nid||''), c.isRegular?'Yes':'No', cj.length, cj.reduce((s,j)=>s+j.totalAmount,0), cj.reduce((s,j)=>s+j.due,0)].join(','); });
  return [headers, ...rows].join('\n');
}

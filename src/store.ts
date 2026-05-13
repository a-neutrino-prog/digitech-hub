// ═══════════════════════════════════════════════════════
// STORE — Pure Re-export Hub
// All domain logic lives in src/stores/*.ts
// This file only re-exports for backward compatibility
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

// Dashboard
export { getDashboardStats } from './stores/dashboard';

// Backup / Restore
export { exportBackup, previewBackup, importBackup, clearAllData } from './stores/backup';
export type { BackupSummary } from './stores/backup';

// CSV Exports
import { getJobs } from './stores/jobs';
import { getTransactions } from './stores/transactions';
import { getCustomers, getCustomerById } from './stores/customers';

function csvEscape(val: any): string {
  const str = String(val ?? '');
  return (str.includes(',') || str.includes('"') || str.includes('\n')) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function exportJobsCSV(): string {
  const headers = 'Date,JobNumber,Customer,Mobile,Services,Total,Advance,Due,Status';
  const rows = getJobs().map(j => {
    const c = getCustomerById(j.customerId);
    return [csvEscape(new Date(j.date).toLocaleDateString()), csvEscape(j.jobNumber || ''), csvEscape(c?.name || ''), csvEscape(c?.mobile || ''), csvEscape(j.services.map(s => s.serviceName).join('; ')), j.totalAmount, j.advance, j.due, csvEscape(j.status)].join(',');
  });
  return [headers, ...rows].join('\n');
}

export function exportTransactionsCSV(): string {
  const headers = 'Date,Type,Category,Amount,Description';
  const rows = getTransactions().map(t => [csvEscape(new Date(t.date).toLocaleDateString()), csvEscape(t.type === 'income' ? 'Income' : 'Expense'), csvEscape(t.category), t.amount, csvEscape(t.description || '')].join(','));
  return [headers, ...rows].join('\n');
}

export function exportCustomersCSV(): string {
  const headers = 'Name,Mobile,Address,NID,Regular,TotalJobs,TotalSpent,TotalDue';
  const allJobs = getJobs();
  const rows = getCustomers().map(c => {
    const cj = allJobs.filter(j => j.customerId === c.id && j.status !== 'cancelled');
    return [csvEscape(c.name), csvEscape(c.mobile), csvEscape(c.address || ''), csvEscape(c.nid || ''), c.isRegular ? 'Yes' : 'No', cj.length, cj.reduce((s, j) => s + j.totalAmount, 0), cj.reduce((s, j) => s + j.due, 0)].join(',');
  });
  return [headers, ...rows].join('\n');
}

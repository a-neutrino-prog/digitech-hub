import { getCustomers } from './customers';
import { getServices } from './services';
import { getJobs } from './jobs';
import { getTransactions } from './transactions';
import { getShopInfo, getNotifications } from './settings';
import { getReminders } from './reminders';
import { setItem } from './helpers';

export interface BackupSummary {
  version: number;
  exportedAt: number;
  counts: Record<string, number>;
  currentCounts: Record<string, number>;
}

const BACKUP_VERSION = 2;

export function exportBackup(): string {
  return JSON.stringify({
    _version: BACKUP_VERSION,
    _appName: 'ডিজিটেক হাব',
    customers: getCustomers(),
    services: getServices(),
    jobs: getJobs(),
    transactions: getTransactions(),
    shopInfo: getShopInfo(),
    notifications: getNotifications(),
    reminders: getReminders(),
    exportedAt: Date.now(),
  }, null, 2);
}

export function previewBackup(jsonStr: string): { valid: boolean; error?: string; summary?: BackupSummary } {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') return { valid: false, error: 'সঠিক JSON নয়' };
    const arrays = ['customers', 'jobs', 'transactions', 'services', 'notifications', 'reminders'];
    for (const key of arrays) if (data[key] && !Array.isArray(data[key])) return { valid: false, error: `"${key}" সঠিক নয়` };
    return {
      valid: true,
      summary: {
        version: data._version || 1,
        exportedAt: data.exportedAt || 0,
        counts: {
          customers: data.customers?.length || 0,
          jobs: data.jobs?.length || 0,
          transactions: data.transactions?.length || 0,
          services: data.services?.length || 0,
          reminders: data.reminders?.length || 0,
        },
        currentCounts: {
          customers: getCustomers().length,
          jobs: getJobs().length,
          transactions: getTransactions().length,
          services: getServices().length,
          reminders: getReminders().length,
        },
      },
    };
  } catch (e: any) {
    return { valid: false, error: e.message || 'ফাইল পড়া যায়নি' };
  }
}

export function importBackup(jsonStr: string): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') return { success: false, error: 'সঠিক JSON নয়' };
    const ver = data._version || 1;
    if (ver > BACKUP_VERSION) return { success: false, error: `ব্যাকআপ নতুন ভার্সনের (v${ver})` };
    const arrays = ['customers', 'jobs', 'transactions', 'services', 'notifications', 'reminders'];
    for (const key of arrays) if (data[key] && !Array.isArray(data[key])) return { success: false, error: `"${key}" সঠিক নয়` };
    if (data.customers) {
      for (const c of data.customers) if (!c.id || !c.name) return { success: false, error: 'গ্রাহক ডেটা corrupt' };
    }
    for (const key of arrays) if (data[key]) setItem(key, data[key]);
    if (data.shopInfo) setItem('shopInfo', data.shopInfo);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'ফাইল পড়া যায়নি' };
  }
}

export function clearAllData(): void {
  ['customers', 'services', 'jobs', 'transactions', 'notifications', 'reminders'].forEach(k => localStorage.removeItem(k));
}

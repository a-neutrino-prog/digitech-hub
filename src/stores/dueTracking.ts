import { getItem, setItem, generateId } from './helpers';

// Due Status types
export type DueStatus = 'new' | 'followed-up' | 'promised' | 'overdue' | 'partial-paid';

// Follow-up log entry
export interface DueFollowUp {
  id: string;
  jobId: string;
  customerId: string;
  type: 'call' | 'visit' | 'whatsapp' | 'note';
  note: string;
  date: number;
  promisedDate?: number;   // গ্রাহক কবে দেবে বলেছে
  promisedAmount?: number; // কত দেবে বলেছে
}

// Due tracking per job
export interface DueTracker {
  jobId: string;
  status: DueStatus;
  followUps: DueFollowUp[];
  promisedDate?: number;
  promisedAmount?: number;
  lastFollowUp?: number;
  updatedAt: number;
}

// Get all due trackers
export function getDueTrackers(): DueTracker[] {
  return getItem<DueTracker[]>('due_trackers', []);
}

// Get tracker for a specific job
export function getDueTracker(jobId: string): DueTracker | null {
  return getDueTrackers().find(t => t.jobId === jobId) || null;
}

// Create or update tracker
export function upsertDueTracker(jobId: string, data: Partial<DueTracker>): DueTracker {
  const trackers = getDueTrackers();
  const existing = trackers.findIndex(t => t.jobId === jobId);

  if (existing !== -1) {
    trackers[existing] = { ...trackers[existing], ...data, updatedAt: Date.now() };
    setItem('due_trackers', trackers);
    return trackers[existing];
  }

  const newTracker: DueTracker = {
    jobId,
    status: 'new',
    followUps: [],
    updatedAt: Date.now(),
    ...data,
  };
  trackers.push(newTracker);
  setItem('due_trackers', trackers);
  return newTracker;
}

// Add follow-up to a job's due
export function addDueFollowUp(jobId: string, customerId: string, followUp: {
  type: 'call' | 'visit' | 'whatsapp' | 'note';
  note: string;
  promisedDate?: number;
  promisedAmount?: number;
}): DueFollowUp {
  const trackers = getDueTrackers();
  let tracker = trackers.find(t => t.jobId === jobId);

  const entry: DueFollowUp = {
    id: generateId(),
    jobId,
    customerId,
    type: followUp.type,
    note: followUp.note,
    date: Date.now(),
    promisedDate: followUp.promisedDate,
    promisedAmount: followUp.promisedAmount,
  };

  if (!tracker) {
    tracker = { jobId, status: 'followed-up', followUps: [entry], updatedAt: Date.now(), lastFollowUp: Date.now() };
    if (followUp.promisedDate) {
      tracker.status = 'promised';
      tracker.promisedDate = followUp.promisedDate;
      tracker.promisedAmount = followUp.promisedAmount;
    }
    trackers.push(tracker);
  } else {
    tracker.followUps.push(entry);
    tracker.lastFollowUp = Date.now();
    tracker.updatedAt = Date.now();
    if (followUp.promisedDate) {
      tracker.status = 'promised';
      tracker.promisedDate = followUp.promisedDate;
      tracker.promisedAmount = followUp.promisedAmount;
    } else {
      tracker.status = 'followed-up';
    }
    const i = trackers.findIndex(t => t.jobId === jobId);
    trackers[i] = tracker;
  }

  setItem('due_trackers', trackers);
  return entry;
}

// Update due status
export function updateDueStatus(jobId: string, status: DueStatus): void {
  upsertDueTracker(jobId, { status });
}

// Get all follow-ups for a customer
export function getCustomerFollowUps(customerId: string): DueFollowUp[] {
  return getDueTrackers().flatMap(t => t.followUps).filter(f => f.customerId === customerId).sort((a, b) => b.date - a.date);
}

// Get overdue count (promised date passed)
export function getOverdueCount(): number {
  const now = Date.now();
  return getDueTrackers().filter(t => t.status === 'promised' && t.promisedDate && t.promisedDate < now).length;
}

// Auto-detect overdue status
export function refreshDueStatuses(): void {
  const trackers = getDueTrackers();
  const now = Date.now();
  let changed = false;

  trackers.forEach(t => {
    if (t.status === 'promised' && t.promisedDate && t.promisedDate < now) {
      t.status = 'overdue';
      t.updatedAt = now;
      changed = true;
    }
    // If no follow-up for 7+ days and still has due, mark as overdue
    if (t.status === 'new' && t.updatedAt < now - 7 * 86400000) {
      t.status = 'overdue';
      t.updatedAt = now;
      changed = true;
    }
  });

  if (changed) setItem('due_trackers', trackers);
}

// Due status labels
export const DUE_STATUS_CONFIG: Record<DueStatus, { label: string; color: string; bg: string; icon: string }> = {
  'new': { label: 'নতুন বাকি', color: 'text-blue-700', bg: 'bg-blue-50', icon: '🆕' },
  'followed-up': { label: 'ফলো-আপ করা হয়েছে', color: 'text-purple-700', bg: 'bg-purple-50', icon: '📞' },
  'promised': { label: 'পরিশোধের প্রতিশ্রুতি', color: 'text-green-700', bg: 'bg-green-50', icon: '🤝' },
  'overdue': { label: 'ওভারডিউ', color: 'text-red-700', bg: 'bg-red-50', icon: '⚠️' },
  'partial-paid': { label: 'আংশিক পরিশোধ', color: 'text-orange-700', bg: 'bg-orange-50', icon: '💰' },
};

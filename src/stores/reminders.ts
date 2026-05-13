import { getItem, setItem, generateId } from './helpers';

export interface Reminder {
  id: string;
  title: string;
  description: string;
  date: number;
  time: string;
  type: 'general' | 'payment' | 'bill' | 'customer';
  relatedId?: string;
  completed: boolean;
  createdAt: number;
}

export function getReminders(): Reminder[] { return getItem<Reminder[]>('reminders', []); }

export function addReminder(reminder: Omit<Reminder, 'id' | 'createdAt' | 'completed'>): Reminder {
  const reminders = getReminders();
  const r: Reminder = { ...reminder, id: generateId(), completed: false, createdAt: Date.now() };
  reminders.push(r); setItem('reminders', reminders); return r;
}

export function updateReminder(id: string, data: Partial<Reminder>): void {
  const reminders = getReminders();
  const i = reminders.findIndex(r => r.id === id);
  if (i !== -1) { reminders[i] = { ...reminders[i], ...data }; setItem('reminders', reminders); }
}

export function deleteReminder(id: string): void { setItem('reminders', getReminders().filter(r => r.id !== id)); }
export function completeReminder(id: string): void { updateReminder(id, { completed: true }); }
export function getActiveReminders(): Reminder[] { return getReminders().filter(r => !r.completed).sort((a, b) => a.date - b.date); }

export function getUpcomingReminders(): Reminder[] {
  return getReminders().filter(r => !r.completed && r.date >= Date.now()).sort((a, b) => a.date - b.date).slice(0, 10);
}

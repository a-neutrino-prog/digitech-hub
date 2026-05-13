// Shared helpers for all stores

export function getItem<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

// Format helpers
export function formatTaka(amount: number): string {
  return '৳' + amount.toLocaleString('bn-BD');
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateShort(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' });
}

export function toBanglaNum(num: number): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/[0-9]/g, (d) => banglaDigits[parseInt(d)]);
}

export function getTodayStart(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function getTodayEnd(): number {
  return getTodayStart() + 24 * 60 * 60 * 1000 - 1;
}

export function isToday(timestamp: number): boolean {
  return timestamp >= getTodayStart() && timestamp <= getTodayEnd();
}

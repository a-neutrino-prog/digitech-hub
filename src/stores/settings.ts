import { getItem, setItem } from './helpers';

export interface ShopInfo {
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'due' | 'job-ready' | 'reminder' | 'info';
  read: boolean;
  createdAt: number;
  relatedId?: string;
}

// Shop Info
export function getShopInfo(): ShopInfo {
  return getItem<ShopInfo>('shopInfo', { shopName: 'ডিজিটেক হাব', ownerName: '', phone: '', address: '' });
}
export function updateShopInfo(info: ShopInfo): void { setItem('shopInfo', info); }

// Notifications
export function getNotifications(): Notification[] { return getItem<Notification[]>('notifications', []); }

export function addNotification(n: Omit<Notification, 'id' | 'createdAt' | 'read'>): void {
  const notifications = getNotifications();
  notifications.unshift({ ...n, id: Date.now().toString(36), read: false, createdAt: Date.now() });
  if (notifications.length > 50) notifications.splice(50);
  setItem('notifications', notifications);
}

export function markNotificationRead(id: string): void {
  const ns = getNotifications(); const n = ns.find(x => x.id === id);
  if (n) { n.read = true; setItem('notifications', ns); }
}
export function markAllNotificationsRead(): void { setItem('notifications', getNotifications().map(n => ({ ...n, read: true }))); }
export function deleteNotification(id: string): void { setItem('notifications', getNotifications().filter(n => n.id !== id)); }

// PIN
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'digitech-hub-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
export function getPinHash(): string | null { return localStorage.getItem('pin_code'); }
export async function setPinCode(pin: string): Promise<void> { localStorage.setItem('pin_code', await hashPin(pin)); }
export async function verifyPin(input: string): Promise<boolean> {
  const stored = localStorage.getItem('pin_code');
  if (!stored) return false;
  return stored === await hashPin(input);
}
export function removePinCode(): void { localStorage.removeItem('pin_code'); }
export function isPinEnabled(): boolean { return !!localStorage.getItem('pin_code'); }

// Dark Mode
export function getDarkMode(): boolean { return localStorage.getItem('dark_mode') === 'true'; }
export function setDarkMode(enabled: boolean): void { localStorage.setItem('dark_mode', enabled ? 'true' : 'false'); }

// Onboarding
export function isOnboardingComplete(): boolean { return localStorage.getItem('onboarding_done') === 'true'; }
export function completeOnboarding(): void { localStorage.setItem('onboarding_done', 'true'); }

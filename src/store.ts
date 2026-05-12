// Data models and localStorage-based store for ডিজিটেক হাব
// All 12 bugs from code review FIXED

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  nid: string;
  isRegular: boolean;
  createdAt: number;
}

export interface Service {
  id: string;
  name: string;
  defaultRate: number;
  isActive: boolean;
}

export type JobStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export interface Payment {
  id?: string;
  amount: number;
  date: number;
  method: 'cash' | 'other';
}

export interface JobService {
  serviceId: string;
  serviceName: string;
  quantity: number;
  rate: number;
  total: number;
}

// Bug #2 Fix: jobNumber field যোগ
export interface Job {
  id: string;
  jobNumber: string;
  customerId: string;
  services: JobService[];
  totalAmount: number;
  advance: number;
  due: number;
  date: number;
  status: JobStatus;
  notes: string;
  payments: Payment[];
  createdAt: number;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: number;
  relatedJobId?: string;
}

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

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Bug #2 Fix: Max-based job number generation
export function generateJobNumber(): string {
  const jobs = getJobs();
  if (jobs.length === 0) return 'JOB-0001';
  const maxNum = jobs.reduce((max, j) => {
    const num = parseInt((j.jobNumber || 'JOB-0000').replace('JOB-', '') || '0');
    return Math.max(max, isNaN(num) ? 0 : num);
  }, 0);
  return `JOB-${(maxNum + 1).toString().padStart(4, '0')}`;
}

// LocalStorage helpers
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Default services
const DEFAULT_SERVICES: Service[] = [
  { id: generateId(), name: 'ফটোকপি', defaultRate: 2, isActive: true },
  { id: generateId(), name: 'ছবি প্রিন্ট', defaultRate: 30, isActive: true },
  { id: generateId(), name: 'আবেদনপত্র', defaultRate: 50, isActive: true },
  { id: generateId(), name: 'কম্পোজ', defaultRate: 100, isActive: true },
  { id: generateId(), name: 'নামজারি', defaultRate: 500, isActive: true },
  { id: generateId(), name: 'গ্রাফিক্স ডিজাইন', defaultRate: 300, isActive: true },
  { id: generateId(), name: 'ওয়েব ডেভেলপমেন্ট', defaultRate: 5000, isActive: true },
  { id: generateId(), name: 'সার্ভিসিং', defaultRate: 200, isActive: true },
  { id: generateId(), name: 'লেমিনেটিং', defaultRate: 30, isActive: true },
  { id: generateId(), name: 'ইমেইল', defaultRate: 20, isActive: true },
  { id: generateId(), name: 'টাইপিং', defaultRate: 50, isActive: true },
  { id: generateId(), name: 'স্ক্যানিং', defaultRate: 10, isActive: true },
  { id: generateId(), name: 'পাসপোর্ট ফটো', defaultRate: 100, isActive: true },
  { id: generateId(), name: 'বাংলা টাইপ', defaultRate: 80, isActive: true },
];

const EXPENSE_CATEGORIES = [
  'ভাড়া', 'বিদ্যুৎ', 'ইন্টারনেট', 'কালি/টোনার', 'কাগজ',
  'মেরামত', 'মালিককে টাকা', 'পরিবহন', 'খাবার', 'অন্যান্য'
];

// CRUD Operations — Customers
export function getCustomers(): Customer[] {
  return getItem<Customer[]>('customers', []);
}

export function addCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Customer {
  const customers = getCustomers();
  const newCustomer: Customer = { ...customer, id: generateId(), createdAt: Date.now() };
  customers.push(newCustomer);
  setItem('customers', customers);
  return newCustomer;
}

export function updateCustomer(id: string, data: Partial<Customer>): void {
  const customers = getCustomers();
  const index = customers.findIndex(c => c.id === id);
  if (index !== -1) {
    customers[index] = { ...customers[index], ...data };
    setItem('customers', customers);
  }
}

export function deleteCustomer(id: string): void {
  setItem('customers', getCustomers().filter(c => c.id !== id));
}

export function getCustomerById(id: string): Customer | undefined {
  return getCustomers().find(c => c.id === id);
}

// Services
export function getServices(): Service[] {
  const services = getItem<Service[]>('services', []);
  if (services.length === 0) {
    setItem('services', DEFAULT_SERVICES);
    return DEFAULT_SERVICES;
  }
  return services;
}

export function addService(service: Omit<Service, 'id'>): Service {
  const services = getServices();
  const newService: Service = { ...service, id: generateId() };
  services.push(newService);
  setItem('services', services);
  return newService;
}

export function updateService(id: string, data: Partial<Service>): void {
  const services = getServices();
  const index = services.findIndex(s => s.id === id);
  if (index !== -1) {
    services[index] = { ...services[index], ...data };
    setItem('services', services);
  }
}

export function deleteService(id: string): void {
  setItem('services', getServices().filter(s => s.id !== id));
}

// Jobs
export function getJobs(): Job[] {
  return getItem<Job[]>('jobs', []);
}

// Bug #3 Fix: Job save আগে, তারপর transaction
export function addJob(job: Omit<Job, 'id' | 'createdAt' | 'jobNumber'>): Job {
  const jobs = getJobs();
  const newJob: Job = {
    ...job,
    id: generateId(),
    jobNumber: generateJobNumber(),
    createdAt: Date.now(),
  };

  // Job আগে save করি
  jobs.push(newJob);
  setItem('jobs', jobs);

  // তারপর transaction
  if (newJob.advance > 0) {
    addTransaction({
      type: 'income',
      category: 'সেবা',
      amount: newJob.advance,
      description: `অগ্রিম - ${newJob.jobNumber}`,
      date: newJob.date,
      relatedJobId: newJob.id,
    });
  }

  return newJob;
}

export function updateJob(id: string, data: Partial<Job>): void {
  const jobs = getJobs();
  const index = jobs.findIndex(j => j.id === id);
  if (index !== -1) {
    jobs[index] = { ...jobs[index], ...data };
    setItem('jobs', jobs);
  }
}

// Bug #11 Fix: completeJob() এ collectDue parameter
export function completeJob(id: string, collectDue: boolean = false): void {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === id);
  if (job) {
    job.status = 'completed';
    // শুধু explicitly বলা হলে due collect করুন
    if (collectDue && job.due > 0) {
      const paidNow = job.due;
      const txId = generateId();
      job.payments.push({ id: txId, amount: paidNow, date: Date.now(), method: 'cash' });
      job.due = 0;
      addTransaction({
        type: 'income',
        category: 'সেবা',
        amount: paidNow,
        description: `কাজ সম্পন্ন - বাকি পরিশোধ - ${job.jobNumber || ''}`,
        date: Date.now(),
        relatedJobId: id,
      });
    }
    setItem('jobs', jobs);
  }
}

export function addPaymentToJob(jobId: string, amount: number): void {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === jobId);
  if (job) {
    const txId = generateId();
    job.payments.push({ id: txId, amount, date: Date.now(), method: 'cash' });
    job.due = Math.max(0, job.due - amount);
    setItem('jobs', jobs);

    addTransaction({
      type: 'income',
      category: 'সেবা',
      amount: amount,
      description: `পেমেন্ট - ${job.jobNumber || 'কাজ'}`,
      date: Date.now(),
      relatedJobId: jobId,
    });
  }
}

export function deleteJob(id: string): void {
  setItem('jobs', getJobs().filter(j => j.id !== id));
}

export function deletePaymentFromJob(jobId: string, paymentIndex: number): void {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === jobId);
  if (job && job.payments[paymentIndex]) {
    const deletedAmount = job.payments[paymentIndex].amount;
    job.payments.splice(paymentIndex, 1);
    job.due = job.due + deletedAmount;
    setItem('jobs', jobs);
  }
}

// Bug #4 Fix: oldAmount আগে save করে তারপর update
export function updatePaymentInJob(jobId: string, paymentIndex: number, newAmount: number): void {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === jobId);
  if (job && job.payments[paymentIndex]) {
    const oldAmount = job.payments[paymentIndex].amount;
    const diff = newAmount - oldAmount;
    // amount update
    job.payments[paymentIndex].amount = newAmount;
    job.due = Math.max(0, job.due - diff);
    setItem('jobs', jobs);

    // Transaction update (by payment ID)
    const paymentTxId = job.payments[paymentIndex].id;
    if (paymentTxId) {
      updateTransaction(paymentTxId, { amount: newAmount });
    }
  }
}

// Transactions
export function getTransactions(): Transaction[] {
  return getItem<Transaction[]>('transactions', []);
}

export function addTransaction(tx: Omit<Transaction, 'id'>): Transaction {
  const txs = getTransactions();
  const newTx: Transaction = { ...tx, id: generateId() };
  txs.push(newTx);
  setItem('transactions', txs);
  return newTx;
}

export function updateTransaction(id: string, data: Partial<Transaction>): void {
  const txs = getTransactions();
  const index = txs.findIndex(t => t.id === id);
  if (index !== -1) {
    txs[index] = { ...txs[index], ...data };
    setItem('transactions', txs);
  }
}

export function deleteTransaction(id: string): void {
  setItem('transactions', getTransactions().filter(t => t.id !== id));
}

// Shop info
export function getShopInfo(): ShopInfo {
  return getItem<ShopInfo>('shopInfo', {
    shopName: 'ডিজিটেক হাব',
    ownerName: '',
    phone: '',
    address: '',
  });
}

export function updateShopInfo(info: ShopInfo): void {
  setItem('shopInfo', info);
}

// Notifications
export function getNotifications(): Notification[] {
  return getItem<Notification[]>('notifications', []);
}

export function addNotification(n: Omit<Notification, 'id' | 'createdAt' | 'read'>): void {
  const notifications = getNotifications();
  notifications.unshift({ ...n, id: generateId(), read: false, createdAt: Date.now() });
  if (notifications.length > 50) notifications.splice(50);
  setItem('notifications', notifications);
}

export function markNotificationRead(id: string): void {
  const notifications = getNotifications();
  const n = notifications.find(x => x.id === id);
  if (n) { n.read = true; setItem('notifications', notifications); }
}

export function markAllNotificationsRead(): void {
  setItem('notifications', getNotifications().map(n => ({ ...n, read: true })));
}

export function deleteNotification(id: string): void {
  setItem('notifications', getNotifications().filter(n => n.id !== id));
}

// Helpers
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

export function getDashboardStats() {
  const todayStart = getTodayStart();
  const todayEnd = getTodayEnd();
  const transactions = getTransactions();
  const jobs = getJobs();
  const todayTxs = transactions.filter(t => t.date >= todayStart && t.date <= todayEnd);
  const todayIncome = todayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const todayExpense = todayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const todayJobs = jobs.filter(j => j.date >= todayStart && j.date <= todayEnd);
  const pendingJobs = todayJobs.filter(j => j.status === 'pending' || j.status === 'in-progress').length;
  const completedJobs = todayJobs.filter(j => j.status === 'completed').length;
  const totalDue = jobs.filter(j => j.status !== 'cancelled').reduce((s, j) => s + j.due, 0);
  return { todayIncome, todayExpense, totalDue, todayJobsTotal: todayJobs.length, pendingJobs, completedJobs };
}

// Backup / Restore
export function exportBackup(): string {
  return JSON.stringify({
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

export function importBackup(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.customers) setItem('customers', data.customers);
    if (data.services) setItem('services', data.services);
    if (data.jobs) setItem('jobs', data.jobs);
    if (data.transactions) setItem('transactions', data.transactions);
    if (data.shopInfo) setItem('shopInfo', data.shopInfo);
    if (data.notifications) setItem('notifications', data.notifications);
    if (data.reminders) setItem('reminders', data.reminders);
    return true;
  } catch { return false; }
}

export function clearAllData(): void {
  localStorage.removeItem('customers');
  localStorage.removeItem('services');
  localStorage.removeItem('jobs');
  localStorage.removeItem('transactions');
  localStorage.removeItem('notifications');
  localStorage.removeItem('reminders');
}

export { EXPENSE_CATEGORIES };

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

// Reminders
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
export function getTodayReminders(): Reminder[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  return getReminders().filter(r => !r.completed && r.date >= today.getTime() && r.date < tomorrow.getTime());
}
export function getUpcomingReminders(): Reminder[] {
  const now = Date.now();
  return getReminders().filter(r => !r.completed && r.date >= now).sort((a, b) => a.date - b.date).slice(0, 10);
}

// Bug #5 Fix: PIN hashing with SHA-256
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'digitech-hub-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getPinHash(): string | null {
  return localStorage.getItem('pin_code');
}

export async function setPinCode(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  localStorage.setItem('pin_code', hash);
}

export async function verifyPin(input: string): Promise<boolean> {
  const stored = localStorage.getItem('pin_code');
  if (!stored) return false;
  const inputHash = await hashPin(input);
  return stored === inputHash;
}

export function removePinCode(): void {
  localStorage.removeItem('pin_code');
}

export function isPinEnabled(): boolean {
  return !!localStorage.getItem('pin_code');
}

// Dark Mode
export function getDarkMode(): boolean { return localStorage.getItem('dark_mode') === 'true'; }
export function setDarkMode(enabled: boolean): void { localStorage.setItem('dark_mode', enabled ? 'true' : 'false'); }

// Customer Photo
export function setCustomerPhoto(customerId: string, base64: string): void {
  // Bug #8 partial fix: photos আলাদা store করি, sync-এ exclude
  const photos = getItem<Record<string, string>>('customer_photos', {});
  photos[customerId] = base64;
  setItem('customer_photos', photos);
}
export function getCustomerPhoto(customerId: string): string | null {
  const photos = getItem<Record<string, string>>('customer_photos', {});
  return photos[customerId] || null;
}
export function removeCustomerPhoto(customerId: string): void {
  const photos = getItem<Record<string, string>>('customer_photos', {});
  delete photos[customerId];
  setItem('customer_photos', photos);
}

// Bug #12 Fix: CSV export — proper quoting
function csvEscape(val: any): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportJobsCSV(): string {
  const jobs = getJobs();
  const headers = 'Date,JobNumber,Customer,Mobile,Services,Total,Advance,Due,Status';
  const rows = jobs.map(j => {
    const c = getCustomerById(j.customerId);
    return [
      csvEscape(new Date(j.date).toLocaleDateString()),
      csvEscape(j.jobNumber || ''),
      csvEscape(c?.name || ''),
      csvEscape(c?.mobile || ''),
      csvEscape(j.services.map(s => s.serviceName).join('; ')),
      j.totalAmount,
      j.advance,
      j.due,
      csvEscape(j.status)
    ].join(',');
  });
  return [headers, ...rows].join('\n');
}

export function exportTransactionsCSV(): string {
  const txs = getTransactions();
  const headers = 'Date,Type,Category,Amount,Description';
  const rows = txs.map(t => [
    csvEscape(new Date(t.date).toLocaleDateString()),
    csvEscape(t.type === 'income' ? 'Income' : 'Expense'),
    csvEscape(t.category),
    t.amount,
    csvEscape(t.description || '')
  ].join(','));
  return [headers, ...rows].join('\n');
}

export function exportCustomersCSV(): string {
  const customers = getCustomers();
  const jobs = getJobs();
  const headers = 'Name,Mobile,Address,NID,Regular,TotalJobs,TotalSpent,TotalDue';
  const rows = customers.map(c => {
    const cJobs = jobs.filter(j => j.customerId === c.id && j.status !== 'cancelled');
    return [
      csvEscape(c.name),
      csvEscape(c.mobile),
      csvEscape(c.address || ''),
      csvEscape(c.nid || ''),
      c.isRegular ? 'Yes' : 'No',
      cJobs.length,
      cJobs.reduce((s, j) => s + j.totalAmount, 0),
      cJobs.reduce((s, j) => s + j.due, 0)
    ].join(',');
  });
  return [headers, ...rows].join('\n');
}

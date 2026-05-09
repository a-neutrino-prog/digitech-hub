// Data models and localStorage-based store for ডিজিটেক হাব

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

export interface Job {
  id: string;
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

// Generate job number
export function generateJobNumber(): string {
  const jobs = getJobs();
  const num = jobs.length + 1;
  return `JOB-${num.toString().padStart(4, '0')}`;
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

// CRUD Operations
// Customers
export function getCustomers(): Customer[] {
  return getItem<Customer[]>('customers', []);
}

export function addCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Customer {
  const customers = getCustomers();
  const newCustomer: Customer = {
    ...customer,
    id: generateId(),
    createdAt: Date.now(),
  };
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
  // Delete all jobs of this customer (which also deletes their transactions)
  const jobs = getJobs().filter(j => j.customerId === id);
  jobs.forEach(j => deleteJob(j.id));
  
  const customers = getCustomers().filter(c => c.id !== id);
  setItem('customers', customers);
  removeCustomerPhoto(id);
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
  const services = getServices().filter(s => s.id !== id);
  setItem('services', services);
}

// Jobs
export function getJobs(): Job[] {
  return getItem<Job[]>('jobs', []);
}

export function addJob(job: Omit<Job, 'id' | 'createdAt'>): Job {
  const jobs = getJobs();
  const newJob: Job = {
    ...job,
    id: generateId(),
    createdAt: Date.now(),
  };

  // Auto-create income transaction if there's advance payment
  if (newJob.advance > 0) {
    const txId = generateId();
    if (newJob.payments && newJob.payments.length > 0) {
      newJob.payments[0].id = txId;
    }
    addTransaction({
      id: txId,
      type: 'income',
      category: 'সেবা',
      amount: newJob.advance,
      description: `অগ্রিম - জব`,
      date: newJob.date,
      relatedJobId: newJob.id,
    } as any);
  }

  jobs.push(newJob);
  setItem('jobs', jobs);
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

export function completeJob(id: string): void {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === id);
  if (job) {
    job.status = 'completed';
    // If there's remaining due, record as income
    if (job.due > 0) {
      const paidNow = job.due;
      const txId = generateId();
      job.payments.push({ id: txId, amount: paidNow, date: Date.now(), method: 'cash' });
      job.due = 0;
      addTransaction({
        id: txId,
        type: 'income',
        category: 'সেবা',
        amount: paidNow,
        description: `জব সম্পন্ন - বাকি পরিশোধ`,
        date: Date.now(),
        relatedJobId: id,
      } as any);
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
      id: txId,
      type: 'income',
      category: 'সেবা',
      amount: amount,
      description: `পেমেন্ট - জব`,
      date: Date.now(),
      relatedJobId: jobId,
    } as any);
  }
}

export function deleteJob(id: string): void {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === id);
  if (job) {
    // Delete associated transactions
    const txs = getTransactions().filter(t => t.relatedJobId !== id);
    setItem('transactions', txs);
    
    setItem('jobs', jobs.filter(j => j.id !== id));
  }
}

export function deletePaymentFromJob(jobId: string, paymentIndex: number): void {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === jobId);
  if (job && job.payments[paymentIndex]) {
    const payment = job.payments[paymentIndex];
    job.payments.splice(paymentIndex, 1);
    job.due = job.due + payment.amount;
    setItem('jobs', jobs);
    
    if (payment.id) {
      deleteTransaction(payment.id);
    } else {
      const txs = getTransactions();
      const matchedTx = txs.find(t => t.relatedJobId === jobId && t.amount === payment.amount);
      if (matchedTx) deleteTransaction(matchedTx.id);
    }
  }
}

export function updatePaymentInJob(jobId: string, paymentIndex: number, newAmount: number): void {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === jobId);
  if (job && job.payments[paymentIndex]) {
    const payment = job.payments[paymentIndex];
    const diff = newAmount - payment.amount;
    payment.amount = newAmount;
    job.due = Math.max(0, job.due - diff);
    setItem('jobs', jobs);
    
    if (payment.id) {
      updateTransaction(payment.id, { amount: newAmount });
    } else {
      const txs = getTransactions();
      const matchedTx = txs.find(t => t.relatedJobId === jobId && t.amount === (newAmount - diff));
      if (matchedTx) updateTransaction(matchedTx.id, { amount: newAmount });
    }
  }
}

// Transactions
export function getTransactions(): Transaction[] {
  return getItem<Transaction[]>('transactions', []);
}

export function addTransaction(tx: Omit<Transaction, 'id'> & { id?: string }): Transaction {
  const txs = getTransactions();
  const newTx: Transaction = { id: generateId(), ...tx }; // if tx has id, it overwrites
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
  const txs = getTransactions().filter(t => t.id !== id);
  setItem('transactions', txs);
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
  notifications.unshift({
    ...n,
    id: generateId(),
    read: false,
    createdAt: Date.now(),
  });
  // Keep only latest 50
  if (notifications.length > 50) notifications.splice(50);
  setItem('notifications', notifications);
}

export function markNotificationRead(id: string): void {
  const notifications = getNotifications();
  const n = notifications.find(x => x.id === id);
  if (n) {
    n.read = true;
    setItem('notifications', notifications);
  }
}

export function markAllNotificationsRead(): void {
  const notifications = getNotifications().map(n => ({ ...n, read: true }));
  setItem('notifications', notifications);
}

export function deleteNotification(id: string): void {
  setItem('notifications', getNotifications().filter(n => n.id !== id));
}

// Helper: Get today's data
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

// Dashboard stats
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

  return {
    todayIncome,
    todayExpense,
    totalDue,
    todayJobsTotal: todayJobs.length,
    pendingJobs,
    completedJobs,
  };
}

// Backup / Restore
export function exportBackup(): string {
  const data = {
    customers: getCustomers(),
    services: getServices(),
    jobs: getJobs(),
    transactions: getTransactions(),
    shopInfo: getShopInfo(),
    notifications: getNotifications(),
    reminders: getReminders(),
    exportedAt: Date.now(),
  };
  return JSON.stringify(data, null, 2);
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
  } catch {
    return false;
  }
}

export function clearAllData(): void {
  localStorage.removeItem('customers');
  localStorage.removeItem('services');
  localStorage.removeItem('jobs');
  localStorage.removeItem('transactions');
  localStorage.removeItem('notifications');
  localStorage.removeItem('reminders');
  localStorage.removeItem('customer_photos');
  localStorage.removeItem('shopInfo');
}

export { EXPENSE_CATEGORIES };

// Format helpers
export function formatTaka(amount: number): string {
  return '৳' + amount.toLocaleString('bn-BD');
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('bn-BD', {
    month: 'short',
    day: 'numeric',
  });
}

export function toBanglaNum(num: number): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/[0-9]/g, (d) => banglaDigits[parseInt(d)]);
}

// Reminders
export function getReminders(): Reminder[] {
  return getItem<Reminder[]>('reminders', []);
}

export function addReminder(reminder: Omit<Reminder, 'id' | 'createdAt' | 'completed'>): Reminder {
  const reminders = getReminders();
  const newReminder: Reminder = {
    ...reminder,
    id: generateId(),
    completed: false,
    createdAt: Date.now(),
  };
  reminders.push(newReminder);
  setItem('reminders', reminders);
  return newReminder;
}

export function updateReminder(id: string, data: Partial<Reminder>): void {
  const reminders = getReminders();
  const index = reminders.findIndex(r => r.id === id);
  if (index !== -1) {
    reminders[index] = { ...reminders[index], ...data };
    setItem('reminders', reminders);
  }
}

export function deleteReminder(id: string): void {
  const reminders = getReminders().filter(r => r.id !== id);
  setItem('reminders', reminders);
}

export function completeReminder(id: string): void {
  updateReminder(id, { completed: true });
}

export function getActiveReminders(): Reminder[] {
  return getReminders().filter(r => !r.completed).sort((a, b) => a.date - b.date);
}

export function getTodayReminders(): Reminder[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return getReminders().filter(r => 
    !r.completed && r.date >= today.getTime() && r.date < tomorrow.getTime()
  );
}

export function getUpcomingReminders(): Reminder[] {
  const now = Date.now();
  return getReminders()
    .filter(r => !r.completed && r.date >= now)
    .sort((a, b) => a.date - b.date)
    .slice(0, 10);
}

// PIN Lock
export function getPinCode(): string | null {
  return localStorage.getItem('pin_code');
}

export function setPinCode(pin: string): void {
  localStorage.setItem('pin_code', pin);
}

export function removePinCode(): void {
  localStorage.removeItem('pin_code');
}

export function isPinEnabled(): boolean {
  return !!localStorage.getItem('pin_code');
}

// Dark Mode
export function getDarkMode(): boolean {
  return localStorage.getItem('dark_mode') === 'true';
}

export function setDarkMode(enabled: boolean): void {
  localStorage.setItem('dark_mode', enabled ? 'true' : 'false');
}

// Customer Photo (base64 stored)
export function setCustomerPhoto(customerId: string, base64: string): void {
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

// CSV Export
export function exportJobsCSV(): string {
  const jobs = getJobs();
  const headers = ['Date,Customer,Mobile,Services,Total,Advance,Due,Status'];
  const rows = jobs.map(j => {
    const c = getCustomerById(j.customerId);
    return [
      new Date(j.date).toLocaleDateString(),
      c?.name || '',
      c?.mobile || '',
      j.services.map(s => s.serviceName).join('; '),
      j.totalAmount,
      j.advance,
      j.due,
      j.status
    ].join(',');
  });
  return headers.concat(rows).join('\n');
}

export function exportTransactionsCSV(): string {
  const txs = getTransactions();
  const headers = ['Date,Type,Category,Amount,Description'];
  const rows = txs.map(t => [
    new Date(t.date).toLocaleDateString(),
    t.type === 'income' ? 'Income' : 'Expense',
    t.category,
    t.amount,
    `"${t.description || ''}"`
  ].join(','));
  return headers.concat(rows).join('\n');
}

export function exportCustomersCSV(): string {
  const customers = getCustomers();
  const jobs = getJobs();
  const headers = ['Name,Mobile,Address,NID,Regular,TotalJobs,TotalSpent,TotalDue'];
  const rows = customers.map(c => {
    const cJobs = jobs.filter(j => j.customerId === c.id && j.status !== 'cancelled');
    return [
      c.name,
      c.mobile,
      `"${c.address || ''}"`,
      c.nid || '',
      c.isRegular ? 'Yes' : 'No',
      cJobs.length,
      cJobs.reduce((s, j) => s + j.totalAmount, 0),
      cJobs.reduce((s, j) => s + j.due, 0)
    ].join(',');
  });
  return headers.concat(rows).join('\n');
}

import { getItem, setItem, generateId } from './helpers';
import { addTransaction, getTransactions, updateTransaction } from './transactions';

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

export function generateJobNumber(): string {
  const jobs = getJobs();
  if (jobs.length === 0) return 'JOB-0001';
  const maxNum = jobs.reduce((max, j) => {
    const num = parseInt((j.jobNumber || 'JOB-0000').replace('JOB-', '') || '0');
    return Math.max(max, isNaN(num) ? 0 : num);
  }, 0);
  return `JOB-${(maxNum + 1).toString().padStart(4, '0')}`;
}

export function getJobs(): Job[] { return getItem<Job[]>('jobs', []); }

export function addJob(job: Omit<Job, 'id' | 'createdAt' | 'jobNumber'>): Job {
  const jobs = getJobs();
  const newJob: Job = { ...job, id: generateId(), jobNumber: generateJobNumber(), createdAt: Date.now() };
  jobs.push(newJob);
  setItem('jobs', jobs);
  if (newJob.advance > 0) {
    addTransaction({ type: 'income', category: 'সেবা', amount: newJob.advance, description: `অগ্রিম - ${newJob.jobNumber}`, date: newJob.date, relatedJobId: newJob.id });
  }
  return newJob;
}

export function updateJob(id: string, data: Partial<Job>): void {
  const jobs = getJobs();
  const i = jobs.findIndex(j => j.id === id);
  if (i !== -1) { jobs[i] = { ...jobs[i], ...data }; setItem('jobs', jobs); }
}

export function completeJob(id: string, collectDue: boolean = false): void {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === id);
  if (job) {
    job.status = 'completed';
    if (collectDue && job.due > 0) {
      const paidNow = job.due;
      const txId = generateId();
      job.payments.push({ id: txId, amount: paidNow, date: Date.now(), method: 'cash' });
      job.due = 0;
      addTransaction({ type: 'income', category: 'সেবা', amount: paidNow, description: `কাজ সম্পন্ন - বাকি পরিশোধ - ${job.jobNumber || ''}`, date: Date.now(), relatedJobId: id });
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
    addTransaction({ type: 'income', category: 'সেবা', amount, description: `পেমেন্ট - ${job.jobNumber || 'কাজ'}`, date: Date.now(), relatedJobId: jobId });
  }
}

export function deleteJob(id: string): void {
  setItem('jobs', getJobs().filter(j => j.id !== id));
  const txs = getTransactions().filter(t => t.relatedJobId !== id);
  setItem('transactions', txs);
}

export function deletePaymentFromJob(jobId: string, paymentIndex: number): void {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === jobId);
  if (job && job.payments[paymentIndex]) {
    job.due += job.payments[paymentIndex].amount;
    job.payments.splice(paymentIndex, 1);
    setItem('jobs', jobs);
  }
}

export function updatePaymentInJob(jobId: string, paymentIndex: number, newAmount: number): void {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === jobId);
  if (job && job.payments[paymentIndex]) {
    const oldAmount = job.payments[paymentIndex].amount;
    job.payments[paymentIndex].amount = newAmount;
    job.due = Math.max(0, job.due - (newAmount - oldAmount));
    setItem('jobs', jobs);
    const txId = job.payments[paymentIndex].id;
    if (txId) {
      updateTransaction(txId, { amount: newAmount });
    }
  }
}

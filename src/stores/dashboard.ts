import { getTransactions } from './transactions';
import { getJobs } from './jobs';
import { getTodayStart, getTodayEnd } from './helpers';

export function getDashboardStats() {
  const todayStart = getTodayStart();
  const todayEnd = getTodayEnd();
  const txs = getTransactions();
  const jobs = getJobs();
  const todayTxs = txs.filter(t => t.date >= todayStart && t.date <= todayEnd);
  const todayIncome = todayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const todayExpense = todayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const todayJobs = jobs.filter(j => j.date >= todayStart && j.date <= todayEnd);
  return {
    todayIncome,
    todayExpense,
    totalDue: jobs.filter(j => j.status !== 'cancelled').reduce((s, j) => s + j.due, 0),
    todayJobsTotal: todayJobs.length,
    pendingJobs: todayJobs.filter(j => j.status === 'pending' || j.status === 'in-progress').length,
    completedJobs: todayJobs.filter(j => j.status === 'completed').length,
  };
}

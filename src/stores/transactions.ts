import { getItem, setItem, generateId } from './helpers';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: number;
  relatedJobId?: string;
}

export const EXPENSE_CATEGORIES = [
  'ভাড়া', 'বিদ্যুৎ', 'ইন্টারনেট', 'কালি/টোনার', 'কাগজ',
  'মেরামত', 'মালিককে টাকা', 'পরিবহন', 'খাবার', 'অন্যান্য'
];

export function getTransactions(): Transaction[] { return getItem<Transaction[]>('transactions', []); }

export function addTransaction(tx: Omit<Transaction, 'id'>): Transaction {
  const txs = getTransactions();
  const t: Transaction = { ...tx, id: generateId() };
  txs.push(t); setItem('transactions', txs); return t;
}

export function updateTransaction(id: string, data: Partial<Transaction>): void {
  const txs = getTransactions();
  const i = txs.findIndex(t => t.id === id);
  if (i !== -1) { txs[i] = { ...txs[i], ...data }; setItem('transactions', txs); }
}

export function deleteTransaction(id: string): void { setItem('transactions', getTransactions().filter(t => t.id !== id)); }

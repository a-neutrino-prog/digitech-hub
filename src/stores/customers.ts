import { getItem, setItem, generateId } from './helpers';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  nid: string;
  isRegular: boolean;
  createdAt: number;
}

export function getCustomers(): Customer[] { return getItem<Customer[]>('customers', []); }

export function addCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Customer {
  const customers = getCustomers();
  const c: Customer = { ...customer, id: generateId(), createdAt: Date.now() };
  customers.push(c);
  setItem('customers', customers);
  return c;
}

export function updateCustomer(id: string, data: Partial<Customer>): void {
  const customers = getCustomers();
  const i = customers.findIndex(c => c.id === id);
  if (i !== -1) { customers[i] = { ...customers[i], ...data }; setItem('customers', customers); }
}

export function deleteCustomer(id: string): void { setItem('customers', getCustomers().filter(c => c.id !== id)); }
export function getCustomerById(id: string): Customer | undefined { return getCustomers().find(c => c.id === id); }

// Photos
export function setCustomerPhoto(customerId: string, base64: string): void {
  const photos = getItem<Record<string, string>>('customer_photos', {});
  photos[customerId] = base64;
  setItem('customer_photos', photos);
}
export function getCustomerPhoto(customerId: string): string | null {
  return getItem<Record<string, string>>('customer_photos', {})[customerId] || null;
}
export function removeCustomerPhoto(customerId: string): void {
  const photos = getItem<Record<string, string>>('customer_photos', {});
  delete photos[customerId];
  setItem('customer_photos', photos);
}

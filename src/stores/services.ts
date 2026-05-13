import { getItem, setItem, generateId } from './helpers';

export interface Service {
  id: string;
  name: string;
  defaultRate: number;
  isActive: boolean;
}

const DEFAULT_SERVICES: Service[] = [
  { id: 's1', name: 'ফটোকপি', defaultRate: 2, isActive: true },
  { id: 's2', name: 'ছবি প্রিন্ট', defaultRate: 30, isActive: true },
  { id: 's3', name: 'আবেদনপত্র', defaultRate: 50, isActive: true },
  { id: 's4', name: 'কম্পোজ', defaultRate: 100, isActive: true },
  { id: 's5', name: 'নামজারি', defaultRate: 500, isActive: true },
  { id: 's6', name: 'গ্রাফিক্স ডিজাইন', defaultRate: 300, isActive: true },
  { id: 's7', name: 'ওয়েব ডেভেলপমেন্ট', defaultRate: 5000, isActive: true },
  { id: 's8', name: 'সার্ভিসিং', defaultRate: 200, isActive: true },
  { id: 's9', name: 'লেমিনেটিং', defaultRate: 30, isActive: true },
  { id: 's10', name: 'ইমেইল', defaultRate: 20, isActive: true },
  { id: 's11', name: 'টাইপিং', defaultRate: 50, isActive: true },
  { id: 's12', name: 'স্ক্যানিং', defaultRate: 10, isActive: true },
  { id: 's13', name: 'পাসপোর্ট ফটো', defaultRate: 100, isActive: true },
  { id: 's14', name: 'বাংলা টাইপ', defaultRate: 80, isActive: true },
];

export function getServices(): Service[] {
  const services = getItem<Service[]>('services', []);
  if (services.length === 0) { setItem('services', DEFAULT_SERVICES); return DEFAULT_SERVICES; }
  return services;
}

export function addService(service: Omit<Service, 'id'>): Service {
  const services = getServices();
  const s: Service = { ...service, id: generateId() };
  services.push(s); setItem('services', services); return s;
}

export function updateService(id: string, data: Partial<Service>): void {
  const services = getServices();
  const i = services.findIndex(s => s.id === id);
  if (i !== -1) { services[i] = { ...services[i], ...data }; setItem('services', services); }
}

export function deleteService(id: string): void { setItem('services', getServices().filter(s => s.id !== id)); }

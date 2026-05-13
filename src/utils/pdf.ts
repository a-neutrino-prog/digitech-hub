import QRCode from 'qrcode';
import { getShopInfo, getCustomerById, formatDate, type Job } from '../store';

const STATUS: Record<string, string> = { pending: 'পেন্ডিং', 'in-progress': 'চলমান', completed: 'সম্পন্ন', cancelled: 'বাতিল' };

const SHARED_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans Bengali',sans-serif;color:#0F172A;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table{width:100%;border-collapse:collapse}
th{background:#F1F5F9;text-align:left;padding:8px 10px;font-size:11px;font-weight:600;color:#475569;border-bottom:2px solid #E2E8F0}
td{padding:8px 10px;border-bottom:1px solid #F1F5F9;font-size:13px}
td:last-child,th:last-child{text-align:right}
.watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:60px;font-weight:800;opacity:.04;color:#0F172A;pointer-events:none;white-space:nowrap}
@media print{body{padding:0}.no-print{display:none}}
`;

async function createQrData(data: string, width: number) {
  return QRCode.toDataURL(data, {
    width,
    margin: 1,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  });
}

async function createThermalReceiptHTML(job: Job): Promise<string> {
  const shop = getShopInfo();
  const customer = getCustomerById(job.customerId);
  const paid = job.totalAmount - job.due;
  const qr = await createQrData(`${shop.shopName}|${job.jobNumber}|${customer?.name}|${job.totalAmount}|${job.due}`, 80);

  return `<!DOCTYPE html><html lang="bn"><head><meta charset="UTF-8"><title>রসিদ - ${job.jobNumber || ''}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
<style>
${SHARED_CSS}
body{max-width:300px;margin:0 auto;padding:16px;font-size:12px}
.header{text-align:center;border-bottom:2px dashed #CBD5E1;padding-bottom:12px;margin-bottom:12px}
.header h1{font-size:18px;font-weight:700}.header p{font-size:10px;color:#64748B}
.row{display:flex;justify-content:space-between;padding:2px 0;font-size:11px}.row.label{color:#64748B}
.divider{border-top:1px dashed #CBD5E1;margin:8px 0}
.total{font-size:16px;font-weight:700}
.footer{text-align:center;margin-top:16px;font-size:9px;color:#94A3B8;border-top:2px dashed #CBD5E1;padding-top:12px}
.qr{text-align:center;margin:12px 0}.qr img{width:80px;height:80px}
</style></head><body>
<div class="header"><h1>${shop.shopName || 'ডিজিটেক হাব'}</h1>${shop.address ? `<p>${shop.address}</p>` : ''}${shop.phone ? `<p>📞 ${shop.phone}</p>` : ''}</div>
<div class="row label"><span>তারিখ</span><span>${formatDate(job.date)}</span></div>
<div class="row label"><span>রসিদ নং</span><span style="font-family:monospace">${job.jobNumber || '—'}</span></div>
<div class="row"><span>গ্রাহক</span><span><b>${customer?.name || '—'}</b></span></div>
${customer?.mobile ? `<div class="row label"><span>মোবাইল</span><span>${customer.mobile}</span></div>` : ''}
<div class="divider"></div>
<table><tr><th>সেবা</th><th>পরিমাণ</th><th>মোট</th></tr>${job.services.map(s => `<tr><td>${s.serviceName}</td><td>${s.quantity}×৳${s.rate}</td><td>৳${s.total}</td></tr>`).join('')}</table>
<div class="divider"></div>
<div class="row total"><span>মোট</span><span>৳${job.totalAmount}</span></div>
<div class="row" style="color:#16A34A"><span>পরিশোধ</span><span>৳${paid}</span></div>
${job.due > 0 ? `<div class="row" style="color:#EA580C;font-weight:700"><span>বাকি</span><span>৳${job.due}</span></div>` : ''}
<div style="text-align:center;margin-top:10px"><span style="display:inline-block;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:600;${job.status === 'completed' ? 'background:#DCFCE7;color:#14532D' : job.status === 'pending' ? 'background:#FEF3C7;color:#92400E' : 'background:#DBEAFE;color:#1E40AF'}">${STATUS[job.status] || job.status}</span></div>
<div class="qr"><img src="${qr}" alt="QR" /></div>
<div class="footer"><p>ধন্যবাদ আপনার সেবা গ্রহণের জন্য!</p><p>— ${shop.shopName || 'ডিজিটেক হাব'} —</p></div>
</body></html>`;
}

async function createInvoiceHTML(job: Job): Promise<string> {
  const shop = getShopInfo();
  const customer = getCustomerById(job.customerId);
  const paid = job.totalAmount - job.due;
  const qr = await createQrData(`${shop.shopName}|${job.jobNumber}|${customer?.name}|Total:${job.totalAmount}|Due:${job.due}`, 60);

  return `<!DOCTYPE html><html lang="bn"><head><meta charset="UTF-8"><title>ইনভয়েস - ${job.jobNumber || ''}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
<style>
${SHARED_CSS}
body{max-width:800px;margin:0 auto;padding:40px;font-size:14px;position:relative}
.invoice-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:3px solid #2563EB}
.shop-info h1{font-size:28px;font-weight:700;color:#2563EB;margin-bottom:4px}.shop-info p{font-size:12px;color:#64748B}
.invoice-meta{text-align:right}.invoice-meta .label{font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px}.invoice-meta .value{font-size:14px;font-weight:600;color:#0F172A}.invoice-meta .big{font-size:24px;font-weight:800;color:#2563EB;letter-spacing:-.5px}
.parties{display:flex;gap:40px;margin-bottom:32px}.party{flex:1}.party-label{font-size:10px;color:#94A3B8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;font-weight:600}.party-name{font-size:16px;font-weight:700;color:#0F172A}.party-detail{font-size:12px;color:#64748B;margin-top:2px}
.items-table{margin:24px 0}.items-table th{font-size:11px;text-transform:uppercase;letter-spacing:.5px;padding:12px}.items-table td{padding:12px;font-size:13px}.items-table tr:nth-child(even) td{background:#F8FAFC}
.totals{display:flex;justify-content:flex-end;margin-top:16px}.totals-box{min-width:280px}.total-row{display:flex;justify-content:space-between;padding:8px 16px;font-size:14px}.total-row.grand{background:#0F172A;color:#fff;font-size:18px;font-weight:700;border-radius:12px;margin-top:8px;padding:14px 16px}.total-row.due{color:#EA580C;font-weight:700}.total-row.paid{color:#16A34A}
.status-bar{display:flex;justify-content:space-between;align-items:center;margin-top:32px;padding:16px 20px;background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0}.qr-section{display:flex;align-items:center;gap:12px}.qr-section img{width:60px;height:60px;border-radius:8px}.qr-text{font-size:10px;color:#94A3B8}.footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #E2E8F0;font-size:11px;color:#94A3B8}
.paid-stamp{position:absolute;top:180px;right:60px;transform:rotate(-15deg);font-size:48px;font-weight:800;color:#22C55E;opacity:.12;border:4px solid #22C55E;padding:4px 24px;border-radius:12px}.due-stamp{position:absolute;top:180px;right:60px;transform:rotate(-15deg);font-size:48px;font-weight:800;color:#EA580C;opacity:.12;border:4px solid #EA580C;padding:4px 24px;border-radius:12px}
</style></head><body>
${job.due === 0 ? '<div class="paid-stamp">PAID</div>' : job.due > 0 ? '<div class="due-stamp">DUE</div>' : ''}
<div class="watermark">ডিজিটেক হাব</div>
<div class="invoice-header"><div class="shop-info"><h1>${shop.shopName || 'ডিজিটেক হাব'}</h1>${shop.address ? `<p>📍 ${shop.address}</p>` : ''}${shop.phone ? `<p>📞 ${shop.phone}</p>` : ''}</div><div class="invoice-meta"><div class="label">ইনভয়েস</div><div class="big">${job.jobNumber || '—'}</div><div style="margin-top:8px"><div class="label">তারিখ</div><div class="value">${formatDate(job.date)}</div></div></div></div>
<div class="parties"><div class="party"><div class="party-label">প্রেরক (দোকান)</div><div class="party-name">${shop.shopName || 'ডিজিটেক হাব'}</div>${shop.address ? `<div class="party-detail">${shop.address}</div>` : ''}${shop.phone ? `<div class="party-detail">📞 ${shop.phone}</div>` : ''}</div><div class="party"><div class="party-label">প্রাপক (গ্রাহক)</div><div class="party-name">${customer?.name || '—'}</div>${customer?.mobile ? `<div class="party-detail">📱 ${customer.mobile}</div>` : ''}${customer?.address ? `<div class="party-detail">📍 ${customer.address}</div>` : ''}</div></div>
<table class="items-table"><thead><tr><th>#</th><th>সেবার বিবরণ</th><th>পরিমাণ</th><th>রেট</th><th>মোট</th></tr></thead><tbody>${job.services.map((s, i) => `<tr><td>${i + 1}</td><td>${s.serviceName}</td><td>${s.quantity}টি</td><td>৳${s.rate}</td><td style="font-weight:600">৳${s.total}</td></tr>`).join('')}</tbody></table>
<div class="totals"><div class="totals-box"><div class="total-row"><span>সাবটোটাল</span><span>৳${job.totalAmount}</span></div><div class="total-row paid"><span>পরিশোধ</span><span>৳${paid}</span></div>${job.due > 0 ? `<div class="total-row due"><span>বাকি</span><span>৳${job.due}</span></div>` : ''}<div class="total-row grand"><span>সর্বমোট</span><span>৳${job.totalAmount}</span></div></div></div>
<div class="status-bar"><div><span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;${job.status === 'completed' ? 'background:#DCFCE7;color:#14532D' : job.status === 'pending' ? 'background:#FEF3C7;color:#92400E' : 'background:#DBEAFE;color:#1E40AF'}">${STATUS[job.status] || job.status}</span></div><div class="qr-section"><img src="${qr}" alt="QR" /><div class="qr-text">স্ক্যান করে<br/>বিবরণ দেখুন</div></div></div>
<div class="footer"><p>ধন্যবাদ আপনার সেবা গ্রহণের জন্য!</p><p style="margin-top:4px">এই ইনভয়েসটি কম্পিউটার দ্বারা স্বয়ংক্রিয়ভাবে তৈরি।</p></div>
</body></html>`;
}

function openAndPrint(html: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => setTimeout(() => w.print(), 600);
}

export async function generateJobReceipt(job: Job): Promise<void> {
  const html = await createThermalReceiptHTML(job);
  openAndPrint(html);
}

export async function generateInvoice(job: Job): Promise<void> {
  const html = await createInvoiceHTML(job);
  openAndPrint(html);
}

export async function printJobReceipt(job: Job): Promise<void> {
  await generateJobReceipt(job);
}

export async function shareReceipt(job: Job): Promise<void> {
  const shop = getShopInfo();
  const customer = getCustomerById(job.customerId);
  const text = `${shop.shopName || 'ডিজিটেক হাব'}\n\n📋 ${job.jobNumber || ''}\n👤 ${customer?.name || ''}\n${job.services.map(s => `• ${s.serviceName} (${s.quantity}x) = ৳${s.total}`).join('\n')}\n\nমোট: ৳${job.totalAmount}\nপরিশোধ: ৳${job.totalAmount - job.due}\nবাকি: ৳${job.due}\nস্ট্যাটাস: ${STATUS[job.status] || job.status}\n\nধন্যবাদ!`;
  if (navigator.share) {
    try { await navigator.share({ title: `রসিদ - ${job.jobNumber || ''}`, text }); } catch {}
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}

export function generateReportPDF(title: string, period: string, income: number, expense: number, data: { label: string; value: number }[]): void {
  const shop = getShopInfo();
  const profit = income - expense;
  const html = `<!DOCTYPE html><html lang="bn"><head><meta charset="UTF-8"><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
<style>${SHARED_CSS}body{max-width:800px;margin:0 auto;padding:40px}h1{font-size:28px;font-weight:700;color:#2563EB;margin-bottom:4px}.sub{font-size:14px;color:#64748B;margin-bottom:32px}.stats{display:flex;gap:16px;margin-bottom:32px}.stat{flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;padding:20px;text-align:center}.stat-label{font-size:12px;color:#64748B}.stat-value{font-size:28px;font-weight:700;margin-top:4px}.stat-value.inc{color:#16A34A}.stat-value.exp{color:#DC2626}.stat-value.prf{color:${profit >= 0 ? '#2563EB' : '#EA580C'}}.section-title{font-size:16px;font-weight:700;margin:24px 0 12px;color:#0F172A}.footer{text-align:center;margin-top:40px;font-size:11px;color:#94A3B8}</style></head><body>
<h1>${shop.shopName || 'ডিজিটেক হাব'} — ${title}</h1><p class="sub">সময়কাল: ${period} | তৈরি: ${formatDate(Date.now())}</p>
<div class="stats"><div class="stat"><div class="stat-label">মোট আয়</div><div class="stat-value inc">৳${income.toLocaleString()}</div></div><div class="stat"><div class="stat-label">মোট ব্যয়</div><div class="stat-value exp">৳${expense.toLocaleString()}</div></div><div class="stat"><div class="stat-label">${profit >= 0 ? 'লাভ' : 'ক্ষতি'}</div><div class="stat-value prf">৳${Math.abs(profit).toLocaleString()}</div></div></div>
${data.length > 0 ? `<div class="section-title">সেবা-wise আয়</div><table><thead><tr><th>#</th><th>সেবা</th><th>পরিমাণ (৳)</th></tr></thead><tbody>${data.map((d, i) => `<tr><td>${i + 1}</td><td>${d.label}</td><td style="font-weight:600">৳${d.value.toLocaleString()}</td></tr>`).join('')}</tbody></table>` : ''}
<div class="footer"><p>${formatDate(Date.now())} তারিখে তৈরি</p></div><script>window.onload=function(){setTimeout(function(){window.print()},600)}</script></body></html>`;
  openAndPrint(html);
}

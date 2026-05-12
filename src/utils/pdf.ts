import { getShopInfo, getCustomerById, formatDate, type Job } from '../store';

// বাংলা PDF — HTML render করে print/download
// jsPDF বাংলা সাপোর্ট করে না, তাই HTML approach ব্যবহার করি

function createReceiptHTML(job: Job): string {
  const shopInfo = getShopInfo();
  const customer = getCustomerById(job.customerId);

  const statusLabels: Record<string, string> = {
    'pending': 'পেন্ডিং', 'in-progress': 'চলমান',
    'completed': 'সম্পন্ন', 'cancelled': 'বাতিল',
  };

  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<title>রসিদ - ${job.jobNumber || ''}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Bengali', sans-serif;
    max-width: 380px; margin: 0 auto; padding: 24px;
    color: #0F172A; font-size: 13px; line-height: 1.6;
  }
  .header { text-align: center; border-bottom: 2px solid #0F172A; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 20px; font-weight: 700; }
  .header p { font-size: 12px; color: #475569; }
  .info { margin-bottom: 12px; }
  .info-row { display: flex; justify-content: space-between; padding: 3px 0; }
  .info-label { color: #64748B; font-size: 12px; }
  .info-val { font-weight: 600; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #F1F5F9; text-align: left; padding: 8px 10px; font-size: 11px; font-weight: 600; color: #475569; border-bottom: 2px solid #E2E8F0; }
  td { padding: 8px 10px; border-bottom: 1px solid #F1F5F9; font-size: 13px; }
  td:last-child, th:last-child { text-align: right; }
  .total-section { border-top: 2px solid #0F172A; padding-top: 10px; margin-top: 4px; }
  .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
  .total-row.grand { font-size: 18px; font-weight: 700; padding-top: 8px; }
  .total-row.due { color: #EA580C; font-weight: 700; }
  .total-row.paid { color: #16A34A; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 12px; }
  .status.pending { background: #FEF3C7; color: #92400E; }
  .status.in-progress { background: #DBEAFE; color: #1E40AF; }
  .status.completed { background: #DCFCE7; color: #14532D; }
  .status.cancelled { background: #F1F5F9; color: #64748B; }
  .footer { text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px dashed #CBD5E1; color: #94A3B8; font-size: 11px; }
  .job-number { font-family: monospace; font-size: 11px; color: #94A3B8; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <div class="header">
    <h1>${shopInfo.shopName || 'ডিজিটেক হাব'}</h1>
    ${shopInfo.address ? `<p>${shopInfo.address}</p>` : ''}
    ${shopInfo.phone ? `<p>📞 ${shopInfo.phone}</p>` : ''}
  </div>

  <div class="info">
    <div class="info-row"><span class="info-label">তারিখ:</span><span class="info-val">${formatDate(job.date)}</span></div>
    <div class="info-row"><span class="info-label">গ্রাহক:</span><span class="info-val">${customer?.name || 'N/A'}</span></div>
    <div class="info-row"><span class="info-label">মোবাইল:</span><span class="info-val">${customer?.mobile || 'N/A'}</span></div>
    ${job.jobNumber ? `<div class="info-row"><span class="info-label">রসিদ নং:</span><span class="job-number">${job.jobNumber}</span></div>` : ''}
  </div>

  <table>
    <thead><tr><th>সেবা</th><th>পরিমাণ</th><th>রেট</th><th>মোট</th></tr></thead>
    <tbody>
      ${job.services.map(s => `<tr><td>${s.serviceName}</td><td>${s.quantity}টি</td><td>৳${s.rate}</td><td>৳${s.total}</td></tr>`).join('')}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-row grand"><span>মোট:</span><span>৳${job.totalAmount}</span></div>
    <div class="total-row paid"><span>পরিশোধ:</span><span>৳${job.totalAmount - job.due}</span></div>
    <div class="total-row due"><span>বাকি:</span><span>৳${job.due}</span></div>
  </div>

  <div style="text-align:center;margin-top:12px">
    <span class="status ${job.status}">${statusLabels[job.status] || job.status}</span>
  </div>

  <div class="footer">
    <p>ধন্যবাদ আপনার সেবা গ্রহণের জন্য!</p>
    <p style="margin-top:4px">— ${shopInfo.shopName || 'ডিজিটেক হাব'} —</p>
  </div>
</body>
</html>`;
}

export function generateJobReceipt(job: Job): void {
  const html = createReceiptHTML(job);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();

  // Auto download as PDF using browser print
  w.onload = () => {
    setTimeout(() => w.print(), 500);
  };
}

export function printJobReceipt(job: Job): void {
  const html = createReceiptHTML(job);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html + '<script>window.onload=function(){setTimeout(function(){window.print()},500)}</script>');
  w.document.close();
}

export function generateReportPDF(
  title: string,
  period: string,
  income: number,
  expense: number,
  data: { label: string; value: number }[]
): void {
  const shopInfo = getShopInfo();
  const profit = income - expense;

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Noto Sans Bengali',sans-serif; max-width:700px; margin:0 auto; padding:32px; color:#0F172A; }
  h1 { font-size:24px; font-weight:700; margin-bottom:4px; }
  .sub { font-size:14px; color:#64748B; margin-bottom:24px; }
  .period { font-size:12px; color:#94A3B8; }
  .stats { display:flex; gap:16px; margin-bottom:24px; }
  .stat { flex:1; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:16px; text-align:center; }
  .stat-label { font-size:12px; color:#64748B; }
  .stat-value { font-size:24px; font-weight:700; margin-top:4px; }
  .stat-value.income { color:#16A34A; }
  .stat-value.expense { color:#DC2626; }
  .stat-value.profit { color:${profit >= 0 ? '#2563EB' : '#EA580C'}; }
  table { width:100%; border-collapse:collapse; margin-top:24px; }
  th { background:#F1F5F9; text-align:left; padding:10px 12px; font-size:13px; border-bottom:2px solid #E2E8F0; }
  td { padding:10px 12px; border-bottom:1px solid #F1F5F9; font-size:14px; }
  td:last-child,th:last-child { text-align:right; }
  .footer { text-align:center; margin-top:32px; font-size:11px; color:#94A3B8; }
  @media print { body { padding:16px; } }
</style>
</head>
<body>
  <h1>${shopInfo.shopName || 'ডিজিটেক হাব'} — ${title}</h1>
  <p class="sub">${period}</p>

  <div class="stats">
    <div class="stat"><div class="stat-label">মোট আয়</div><div class="stat-value income">৳${income.toLocaleString()}</div></div>
    <div class="stat"><div class="stat-label">মোট ব্যয়</div><div class="stat-value expense">৳${expense.toLocaleString()}</div></div>
    <div class="stat"><div class="stat-label">${profit >= 0 ? 'লাভ' : 'ক্ষতি'}</div><div class="stat-value profit">৳${Math.abs(profit).toLocaleString()}</div></div>
  </div>

  ${data.length > 0 ? `
  <h2 style="font-size:16px;margin-bottom:8px">সেবা-wise আয়</h2>
  <table>
    <thead><tr><th>সেবা</th><th>পরিমাণ (৳)</th></tr></thead>
    <tbody>${data.map(d => `<tr><td>${d.label}</td><td>৳${d.value.toLocaleString()}</td></tr>`).join('')}</tbody>
  </table>` : ''}

  <div class="footer">
    <p>${new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })} তারিখে তৈরি</p>
  </div>

  <script>window.onload=function(){setTimeout(function(){window.print()},500)}</script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

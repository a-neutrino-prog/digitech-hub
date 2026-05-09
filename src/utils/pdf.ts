import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getShopInfo, getCustomerById, type Job } from '../store';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function generateJobReceipt(job: Job): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 150] // Receipt size
  });

  const shopInfo = getShopInfo();
  const customer = getCustomerById(job.customerId);

  // Use a basic font that supports most characters
  doc.setFont('helvetica');
  
  let y = 10;
  const centerX = 40;
  const leftMargin = 5;
  const rightMargin = 75;

  // Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(shopInfo.shopName || 'DigiTech Hub', centerX, y, { align: 'center' });
  
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (shopInfo.address) {
    doc.text(shopInfo.address, centerX, y, { align: 'center' });
    y += 4;
  }
  if (shopInfo.phone) {
    doc.text(`Phone: ${shopInfo.phone}`, centerX, y, { align: 'center' });
    y += 4;
  }

  // Divider
  y += 2;
  doc.setLineWidth(0.5);
  doc.line(leftMargin, y, rightMargin, y);
  y += 5;

  // Receipt Info
  doc.setFontSize(8);
  doc.text(`Date: ${new Date(job.date).toLocaleDateString()}`, leftMargin, y);
  y += 4;
  doc.text(`Customer: ${customer?.name || 'N/A'}`, leftMargin, y);
  y += 4;
  doc.text(`Mobile: ${customer?.mobile || 'N/A'}`, leftMargin, y);
  y += 6;

  // Services Table
  doc.setLineWidth(0.3);
  doc.line(leftMargin, y, rightMargin, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.text('Item', leftMargin, y);
  doc.text('Qty', 45, y);
  doc.text('Amount', rightMargin, y, { align: 'right' });
  y += 4;
  doc.line(leftMargin, y, rightMargin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  job.services.forEach(s => {
    const name = s.serviceName.length > 15 ? s.serviceName.slice(0, 15) + '..' : s.serviceName;
    doc.text(name, leftMargin, y);
    doc.text(s.quantity.toString(), 48, y);
    doc.text(`${s.total}`, rightMargin, y, { align: 'right' });
    y += 4;
  });

  // Totals
  y += 2;
  doc.line(leftMargin, y, rightMargin, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Total:', leftMargin, y);
  doc.text(`Tk ${job.totalAmount}`, rightMargin, y, { align: 'right' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.text('Paid:', leftMargin, y);
  doc.text(`Tk ${job.totalAmount - job.due}`, rightMargin, y, { align: 'right' });
  y += 4;

  doc.setFont('helvetica', 'bold');
  if (job.due > 0) {
    doc.setTextColor(255, 100, 0);
  } else {
    doc.setTextColor(0, 150, 0);
  }
  doc.text('Due:', leftMargin, y);
  doc.text(`Tk ${job.due}`, rightMargin, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 6;

  // Status
  const statusLabels: Record<string, string> = {
    'pending': 'Pending',
    'in-progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  };
  doc.setFontSize(9);
  doc.text(`Status: ${statusLabels[job.status]}`, centerX, y, { align: 'center' });
  y += 8;

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for your business!', centerX, y, { align: 'center' });

  // Save
  doc.save(`receipt-${job.id.slice(-6)}.pdf`);
}

export function generateReportPDF(
  title: string,
  period: string,
  income: number,
  expense: number,
  data: { label: string; value: number }[]
): void {
  const doc = new jsPDF();
  const shopInfo = getShopInfo();
  
  let y = 20;
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(shopInfo.shopName || 'DigiTech Hub', 105, y, { align: 'center' });
  
  y += 10;
  doc.setFontSize(14);
  doc.text(title, 105, y, { align: 'center' });
  
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${period}`, 105, y, { align: 'center' });
  
  y += 15;
  
  // Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 20, y);
  y += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Total Income: Tk ${income.toLocaleString()}`, 25, y);
  y += 6;
  doc.text(`Total Expense: Tk ${expense.toLocaleString()}`, 25, y);
  y += 6;
  const profit = income - expense;
  doc.setTextColor(profit >= 0 ? 0 : 200, profit >= 0 ? 150 : 0, 0);
  doc.text(`${profit >= 0 ? 'Profit' : 'Loss'}: Tk ${Math.abs(profit).toLocaleString()}`, 25, y);
  doc.setTextColor(0, 0, 0);
  
  y += 15;
  
  // Data Table
  if (data.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Details', 20, y);
    y += 5;
    
    doc.autoTable({
      startY: y,
      head: [['Item', 'Amount (Tk)']],
      body: data.map(d => [d.label, d.value.toLocaleString()]),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }
  
  doc.save(`report-${new Date().toISOString().split('T')[0]}.pdf`);
}

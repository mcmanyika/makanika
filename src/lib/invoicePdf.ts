import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, Shop } from "@/types";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  INVOICE_STATUS_LABELS,
  toDate,
} from "@/lib/utils";

export interface InvoicePdfOptions {
  invoice: Invoice;
  shop: Pick<Shop, "name" | "address" | "city" | "state" | "zip" | "phone" | "email">;
  customerName: string;
  customerEmail?: string;
  repairOrderNumber?: string;
  vehicleLabel?: string;
  serviceDescription?: string;
}

export function downloadInvoicePdf({
  invoice,
  shop,
  customerName,
  customerEmail,
  repairOrderNumber,
  vehicleLabel,
  serviceDescription,
}: InvoicePdfOptions) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(shop.name, margin, y);

  y += 18;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  const addressLine = `${shop.address}, ${shop.city}, ${shop.state} ${shop.zip}`;
  doc.text(addressLine, margin, y);
  y += 14;
  doc.text(`${shop.phone} · ${shop.email}`, margin, y);

  y += 28;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", margin, y);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const rightX = 420;
  doc.text(invoice.invoiceNumber, rightX, y);
  y += 16;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Status: ${INVOICE_STATUS_LABELS[invoice.status]}`, rightX, y);
  y += 14;
  doc.text(`Due: ${formatDate(toDate(invoice.dueDate))}`, rightX, y);
  if (invoice.paidAt) {
    y += 14;
    doc.text(`Paid: ${formatDateTime(toDate(invoice.paidAt))}`, rightX, y);
  }

  y += 24;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Bill to", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.text(customerName, margin, y);
  if (customerEmail) {
    y += 14;
    doc.setTextColor(80, 80, 80);
    doc.text(customerEmail, margin, y);
  }

  if (repairOrderNumber || vehicleLabel || serviceDescription) {
    y += 22;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Service details", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    if (repairOrderNumber) {
      doc.text(`Repair order: ${repairOrderNumber}`, margin, y);
      y += 14;
    }
    if (vehicleLabel) {
      doc.text(`Vehicle: ${vehicleLabel}`, margin, y);
      y += 14;
    }
    if (serviceDescription) {
      const lines = doc.splitTextToSize(serviceDescription, 500);
      doc.text(lines, margin, y);
      y += lines.length * 12;
    }
  }

  y += 16;
  const lineItems = invoice.lineItems ?? [];

  if (lineItems.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Description", "Type", "Qty", "Unit", "Total"]],
      body: lineItems.map((item) => [
        item.description,
        item.type,
        String(item.quantity),
        formatCurrency(item.unitPrice),
        formatCurrency(item.total),
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 20;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("No line items recorded.", margin, y);
    y += 24;
  }

  const totalsX = 380;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text("Subtotal:", totalsX, y);
  doc.text(formatCurrency(invoice.subtotal), 520, y, { align: "right" });
  y += 16;
  doc.text("Tax:", totalsX, y);
  doc.text(formatCurrency(invoice.tax), 520, y, { align: "right" });
  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total:", totalsX, y);
  doc.text(formatCurrency(invoice.total), 520, y, { align: "right" });

  if (invoice.amountPaid > 0) {
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text("Amount paid:", totalsX, y);
    doc.text(formatCurrency(invoice.amountPaid), 520, y, { align: "right" });
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Thank you for your business.",
    margin,
    pageHeight - margin
  );

  const filename = `${invoice.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
  doc.save(filename);
}

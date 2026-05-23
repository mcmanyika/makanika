import { toDate } from "@/lib/utils";
import { Invoice, Payment } from "@/types";

export interface RevenueEntry {
  amount: number;
  date: Date;
  invoiceId: string;
}

/** Stripe payments plus paid invoices missing a payment record (webhook/confirm gaps). */
export function getRevenueEntries(
  payments: Payment[],
  invoices: Invoice[]
): RevenueEntry[] {
  const coveredInvoiceIds = new Set(
    payments
      .filter((p) => p.status === "succeeded" && p.invoiceId)
      .map((p) => p.invoiceId)
  );

  const entries: RevenueEntry[] = payments
    .filter((p) => p.status === "succeeded")
    .map((p) => ({
      amount: p.amount,
      date: toDate(p.createdAt),
      invoiceId: p.invoiceId,
    }));

  for (const inv of invoices) {
    if (inv.status !== "paid" || coveredInvoiceIds.has(inv.id)) continue;
    const amount = inv.amountPaid > 0 ? inv.amountPaid : inv.total;
    if (amount <= 0) continue;
    entries.push({
      amount,
      date: inv.paidAt ? toDate(inv.paidAt) : toDate(inv.updatedAt),
      invoiceId: inv.id,
    });
  }

  return entries;
}

export function sumRevenue(entries: RevenueEntry[]): number {
  return entries.reduce((sum, e) => sum + e.amount, 0);
}

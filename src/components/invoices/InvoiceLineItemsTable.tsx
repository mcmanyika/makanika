"use client";

import { formatCurrency } from "@/lib/utils";
import { EstimateLineItem } from "@/types";

interface InvoiceLineItemsTableProps {
  lineItems: EstimateLineItem[];
  compact?: boolean;
}

export function InvoiceLineItemsTable({
  lineItems,
  compact = false,
}: InvoiceLineItemsTableProps) {
  const items = lineItems ?? [];

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500">No itemized charges on this invoice.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-slate-500">
              Description
            </th>
            {!compact && (
              <th className="px-3 py-2 text-left font-medium text-slate-500">
                Type
              </th>
            )}
            <th className="px-3 py-2 text-right font-medium text-slate-500">
              Qty
            </th>
            {!compact && (
              <th className="px-3 py-2 text-right font-medium text-slate-500">
                Unit
              </th>
            )}
            <th className="px-3 py-2 text-right font-medium text-slate-500">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-3 py-2 text-slate-700">
                {item.description}
                {compact && (
                  <span className="ml-1 text-xs capitalize text-slate-400">
                    ({item.type})
                  </span>
                )}
              </td>
              {!compact && (
                <td className="px-3 py-2 capitalize text-slate-500">{item.type}</td>
              )}
              <td className="px-3 py-2 text-right text-slate-600">
                {item.quantity}
              </td>
              {!compact && (
                <td className="px-3 py-2 text-right text-slate-600">
                  {formatCurrency(item.unitPrice)}
                </td>
              )}
              <td className="px-3 py-2 text-right font-medium text-slate-900">
                {formatCurrency(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

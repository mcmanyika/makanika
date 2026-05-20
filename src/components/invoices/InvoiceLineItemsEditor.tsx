"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  createEmptyLineItem,
  recalculateLineItem,
} from "@/lib/invoiceLineItems";
import { formatCurrency } from "@/lib/utils";
import { EstimateLineItem } from "@/types";

const LINE_TYPES: EstimateLineItem["type"][] = ["labor", "parts", "other"];

interface InvoiceLineItemsEditorProps {
  lineItems: EstimateLineItem[];
  onChange: (items: EstimateLineItem[]) => void;
  disabled?: boolean;
}

export function InvoiceLineItemsEditor({
  lineItems,
  onChange,
  disabled = false,
}: InvoiceLineItemsEditorProps) {
  const updateItem = (index: number, patch: Partial<EstimateLineItem>) => {
    onChange(
      lineItems.map((item, i) =>
        i === index ? recalculateLineItem(item, patch) : item
      )
    );
  };

  const removeItem = (index: number) => {
    if (lineItems.length <= 1) return;
    onChange(lineItems.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...lineItems, createEmptyLineItem()]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">
          Cost breakdown *
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5" />
          Add line
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-500">
                Description
              </th>
              <th className="w-24 px-3 py-2 text-left font-medium text-slate-500">
                Type
              </th>
              <th className="w-20 px-3 py-2 text-right font-medium text-slate-500">
                Qty
              </th>
              <th className="w-28 px-3 py-2 text-right font-medium text-slate-500">
                Unit price
              </th>
              <th className="w-28 px-3 py-2 text-right font-medium text-slate-500">
                Line total
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {lineItems.map((item, index) => (
              <tr key={item.id}>
                <td className="px-2 py-2">
                  <input
                    required
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, { description: e.target.value })
                    }
                    disabled={disabled}
                    placeholder="e.g. Brake pads (front)"
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    value={item.type}
                    onChange={(e) =>
                      updateItem(index, {
                        type: e.target.value as EstimateLineItem["type"],
                      })
                    }
                    disabled={disabled}
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                  >
                    {LINE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={0}
                    step={item.type === "labor" ? "0.25" : "1"}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, {
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={disabled}
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-right text-sm"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPrice || ""}
                    onChange={(e) =>
                      updateItem(index, {
                        unitPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={disabled}
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-right text-sm"
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium text-slate-900">
                  {formatCurrency(item.total)}
                </td>
                <td className="px-1 py-2">
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={disabled}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Itemize labor, parts, and other charges. Subtotal is calculated from line
        totals.
      </p>
    </div>
  );
}

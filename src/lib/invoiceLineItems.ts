import { EstimateLineItem } from "@/types";

export function createLineItemId(): string {
  return `li_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyLineItem(
  type: EstimateLineItem["type"] = "labor"
): EstimateLineItem {
  return {
    id: createLineItemId(),
    description: "",
    type,
    quantity: 1,
    unitPrice: 0,
    total: 0,
  };
}

export function recalculateLineItem(
  item: EstimateLineItem,
  patch: Partial<Pick<EstimateLineItem, "quantity" | "unitPrice" | "description" | "type">>
): EstimateLineItem {
  const quantity = patch.quantity ?? item.quantity;
  const unitPrice = patch.unitPrice ?? item.unitPrice;
  const qty = Math.max(0, quantity);
  const unit = Math.max(0, unitPrice);
  return {
    ...item,
    ...patch,
    quantity: qty,
    unitPrice: unit,
    total: Math.round(qty * unit * 100) / 100,
  };
}

export function computeSubtotal(lineItems: EstimateLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.total, 0);
}

export function computeInvoiceTotals(
  lineItems: EstimateLineItem[],
  taxAmount: number
): { subtotal: number; tax: number; total: number } {
  const subtotal = Math.round(computeSubtotal(lineItems) * 100) / 100;
  const tax = Math.round(Math.max(0, taxAmount) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

export function sanitizeLineItemsForSave(
  items: EstimateLineItem[]
): EstimateLineItem[] {
  return items
    .map((item) =>
      recalculateLineItem(item, {
        description: item.description.trim(),
        type: item.type,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })
    )
    .filter((item) => item.description.length > 0 && item.total > 0);
}

export function cloneLineItems(items: EstimateLineItem[]): EstimateLineItem[] {
  return items.map((item) => ({
    ...item,
    id: createLineItemId(),
  }));
}

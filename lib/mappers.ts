import type { Expense, ExpenseCategory, ModelCode, StockItem } from "./types";

export function toStockItem(row: Record<string, unknown>): StockItem {
  return {
    id: String(row.id),
    modelCode: String(row.model_code),
    name: row.name == null ? null : String(row.name),
    size: String(row.size),
    quantity: Number(row.quantity ?? 0),
    purchasePrice: Number(row.purchase_price ?? 0),
    salePrice: Number(row.sale_price ?? 0),
    notes: row.notes == null ? null : String(row.notes),
    soldCount: Number(row.sold_count ?? 0),
    syncedAt: row.synced_at == null ? null : String(row.synced_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function toExpense(row: Record<string, unknown>): Expense {
  return {
    id: String(row.id),
    date: String(row.date),
    description: String(row.description),
    amount: Number(row.amount ?? 0),
    category: row.category == null ? null : String(row.category),
    syncedAt: row.synced_at == null ? null : String(row.synced_at),
    createdAt: String(row.created_at),
  };
}

export function toModelCode(row: Record<string, unknown>): ModelCode {
  return {
    id: String(row.id),
    code: String(row.code),
    isDefault: Boolean(row.is_default),
    createdAt: String(row.created_at),
  };
}

export function toExpenseCategory(row: Record<string, unknown>): ExpenseCategory {
  return {
    id: String(row.id),
    name: String(row.name),
    isDefault: Boolean(row.is_default),
    createdAt: String(row.created_at),
  };
}

export function stockInputToRow(input: {
  modelCode?: string;
  name?: string;
  size?: string;
  quantity?: number;
  purchasePrice?: number;
  salePrice?: number;
  notes?: string;
}) {
  return stripUndefined({
    model_code: input.modelCode,
    name: input.name === undefined ? undefined : input.name || null,
    size: input.size,
    quantity: input.quantity,
    purchase_price: input.purchasePrice,
    sale_price: input.salePrice,
    notes: input.notes === undefined ? undefined : input.notes || null,
  });
}

export function expenseInputToRow(input: {
  date?: string;
  description?: string;
  amount?: number;
  category?: string;
}) {
  return stripUndefined({
    date: input.date,
    description: input.description,
    amount: input.amount,
    category: input.category === undefined ? undefined : input.category || null,
  });
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

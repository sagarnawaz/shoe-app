import type { Expense, ExpenseCategory, ModelCode, StockItem } from './types'

export function toStockItem(row: Record<string, unknown>): StockItem {
  const rawSizes = row.sizes
  let sizes: Array<{ size: string; quantity: number; soldQuantity?: number }> = []

  if (Array.isArray(rawSizes)) {
    sizes = rawSizes.map(item => ({
      size: String((item as Record<string, unknown>).size ?? ''),
      quantity: Number((item as Record<string, unknown>).quantity ?? 0),
      soldQuantity: Number((item as Record<string, unknown>).soldQuantity ?? 0),
    }))
  } else if (typeof rawSizes === 'string') {
    try {
      const parsed = JSON.parse(rawSizes)
      if (Array.isArray(parsed)) {
        sizes = parsed.map(item => ({
          size: String((item as Record<string, unknown>).size ?? ''),
          quantity: Number((item as Record<string, unknown>).quantity ?? 0),
          soldQuantity: Number((item as Record<string, unknown>).soldQuantity ?? 0),
        }))
      }
    } catch {
      sizes = []
    }
  }

  if (sizes.length === 0 && row.size != null) {
    sizes = [
      {
        size: String(row.size),
        quantity: Number(row.quantity ?? 0),
      },
    ]
  }

  const totalQuantity = sizes.reduce((sum, item) => sum + item.quantity, 0)

  return {
    id: String(row.id),
    brand: row.brand == null ? null : String(row.brand),
    modelCode: String(row.model_code),
    soleType: row.sole_type == null ? null : String(row.sole_type),
    name: row.name == null ? null : String(row.name),
    size: row.size == null ? (sizes[0]?.size ?? '') : String(row.size),
    sizes,
    quantity: Number(row.quantity ?? totalQuantity),
    totalQuantity: Number(row.quantity ?? totalQuantity),
    purchasePrice: Number(row.purchase_price ?? 0),
    salePrice: Number(row.sale_price ?? 0),
    notes: row.notes == null ? null : String(row.notes),
    soldCount: Number(row.sold_count ?? 0),
    syncedAt: row.synced_at == null ? null : String(row.synced_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
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
  }
}

export function toModelCode(row: Record<string, unknown>): ModelCode {
  return {
    id: String(row.id),
    code: String(row.code),
    isDefault: Boolean(row.is_default),
    createdAt: String(row.created_at),
  }
}

export function toExpenseCategory(row: Record<string, unknown>): ExpenseCategory {
  return {
    id: String(row.id),
    name: String(row.name),
    isDefault: Boolean(row.is_default),
    createdAt: String(row.created_at),
  }
}

export function stockInputToRow(input: {
  brand?: string
  modelCode?: string
  soleType?: string
  name?: string
  sizes?: Array<{ size: string; quantity: number; soldQuantity?: number }>
  purchasePrice?: number
  salePrice?: number
  notes?: string
  size?: string
  quantity?: number
  soldCount?: number
}) {
  const sizes = input.sizes?.length
    ? input.sizes
    : input.size && input.quantity !== undefined
      ? [{ size: input.size, quantity: input.quantity }]
      : undefined
  const totalQuantity = sizes?.reduce((sum, item) => sum + item.quantity, 0)

  return stripUndefined({
    brand: input.brand,
    model_code: input.modelCode,
    sole_type: input.soleType,
    name: input.name === undefined ? undefined : input.name || null,
    sizes,
    size: input.size ?? sizes?.[0]?.size ?? 'multiple',
    quantity: input.quantity ?? totalQuantity,
    purchase_price: input.purchasePrice,
    sale_price: input.salePrice,
    sold_count: input.soldCount,
    notes: input.notes === undefined ? undefined : input.notes || null,
  })
}

export function expenseInputToRow(input: {
  date?: string
  description?: string
  amount?: number
  category?: string
}) {
  return stripUndefined({
    date: input.date,
    description: input.description,
    amount: input.amount,
    category: input.category === undefined ? undefined : input.category || null,
  })
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>
}

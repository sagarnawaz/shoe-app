export interface StockItem {
  id: string;
  modelCode: string;
  name: string | null;
  size: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  notes: string | null;
  soldCount: number;
  syncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  syncedAt?: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  totalStockCount: number;
  totalStockValue: number;
  totalSaleValue: number;
  todaySales: number;
  todaySalesAmount: number;
  todayProfit: number;
  totalProfit: number;
  thisMonthExpenses: number;
  lowStockCount: number;
  lastSyncAt: string | null;
}

export interface MonthlyExpenseSummary {
  month: string;
  total: number;
  count: number;
}

export interface ModelCode {
  id: string;
  code: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface SyncStatus {
  connected: boolean;
  lastSyncAt: string | null;
  pendingChanges: number;
  message?: string | null;
}

export interface StockInput {
  modelCode: string;
  name?: string;
  size: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  notes?: string;
}

export interface ExpenseInput {
  date: string;
  description: string;
  amount: number;
  category?: string;
}

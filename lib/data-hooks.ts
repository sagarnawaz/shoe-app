"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { expenseInputToRow, stockInputToRow, toExpense, toExpenseCategory, toModelCode, toStockItem } from "./mappers";
import type {
  DashboardSummary,
  Expense,
  ExpenseCategory,
  ExpenseInput,
  ModelCode,
  MonthlyExpenseSummary,
  StockInput,
  StockItem,
  SyncStatus,
} from "./types";

type QueryOptions<T> = { query?: { enabled?: boolean; queryKey?: unknown[] } };

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export const getListStockQueryKey = (params?: { search?: string }) => ["stock", params ?? {}];
export const getGetStockItemQueryKey = (id: string) => ["stock", id];
export const getGetDashboardSummaryQueryKey = () => ["dashboard", "summary"];
export const getGetLowStockQueryKey = () => ["dashboard", "low-stock"];
export const getGetMonthlyExpensesQueryKey = () => ["dashboard", "monthly-expenses"];
export const getListExpensesQueryKey = (params?: { month?: string; date?: string }) => ["expenses", params ?? {}];
export const getListModelCodesQueryKey = () => ["model-codes"];
export const getListExpenseCategoriesQueryKey = () => ["expense-categories"];
export const getGetSyncStatusQueryKey = () => ["sync", "status"];

export function useListStock(params: { search?: string } = {}, options?: QueryOptions<StockItem[]>) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getListStockQueryKey(params),
    enabled: options?.query?.enabled,
    queryFn: async () => {
      let query = supabase.from("stock_items").select("*").order("created_at", { ascending: false });
      if (params.search) {
        const search = params.search.replaceAll(",", " ");
        query = query.or(`model_code.ilike.%${search}%,name.ilike.%${search}%`);
      }
      const { data, error } = await query;
      throwIfError(error);
      return (data ?? []).map(toStockItem);
    },
  });
}

export function useGetStockItem(id: string, options?: QueryOptions<StockItem>) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getGetStockItemQueryKey(id),
    enabled: options?.query?.enabled ?? Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_items").select("*").eq("id", id).single();
      throwIfError(error);
      return toStockItem(data);
    },
  });
}

export function useCreateStockItem() {
  return useMutation({
    mutationFn: async ({ data }: { data: StockInput }) => {
      const { data: row, error } = await supabase.from("stock_items").insert(stockInputToRow(data)).select("*").single();
      throwIfError(error);
      return toStockItem(row);
    },
  });
}

export function useUpdateStockItem() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StockInput> }) => {
      const { data: row, error } = await supabase
        .from("stock_items")
        .update(stockInputToRow(data))
        .eq("id", id)
        .select("*")
        .single();
      throwIfError(error);
      return toStockItem(row);
    },
  });
}

export function useDeleteStockItem() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("stock_items").delete().eq("id", id);
      throwIfError(error);
    },
  });
}

export function useSellStockItem() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { quantity: number } }) => {
      const { data: row, error } = await supabase.rpc("sell_stock_item", {
        item_id: id,
        sell_quantity: data.quantity,
      });
      throwIfError(error);
      return toStockItem(Array.isArray(row) ? row[0] : row);
    },
  });
}

export function useListExpenses(params: { month?: string; date?: string } = {}, options?: QueryOptions<Expense[]>) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getListExpensesQueryKey(params),
    enabled: options?.query?.enabled,
    queryFn: async () => {
      let query = supabase.from("expenses").select("*");
      if (params.date) query = query.eq("date", params.date);
      if (params.month) query = query.gte("date", `${params.month}-01`).lt("date", nextMonthStart(params.month));
      const { data, error } = await query.order("date", { ascending: false }).order("created_at", { ascending: false });
      throwIfError(error);
      return (data ?? []).map(toExpense);
    },
  });
}

export function useCreateExpense() {
  return useMutation({
    mutationFn: async ({ data }: { data: ExpenseInput }) => {
      const { data: row, error } = await supabase.from("expenses").insert(expenseInputToRow(data)).select("*").single();
      throwIfError(error);
      return toExpense(row);
    },
  });
}

export function useUpdateExpense() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ExpenseInput> }) => {
      const { data: row, error } = await supabase.from("expenses").update(expenseInputToRow(data as ExpenseInput)).eq("id", id).select("*").single();
      throwIfError(error);
      return toExpense(row);
    },
  });
}

export function useDeleteExpense() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      throwIfError(error);
    },
  });
}

export function useListModelCodes(options?: QueryOptions<ModelCode[]>) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getListModelCodesQueryKey(),
    enabled: options?.query?.enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("model_codes").select("*").order("created_at");
      throwIfError(error);
      return (data ?? []).map(toModelCode);
    },
  });
}

export function useCreateModelCode() {
  return useMutation({
    mutationFn: async ({ data }: { data: { code: string } }) => {
      const code = data.code.trim().toUpperCase();
      const { data: existing, error: existingError } = await supabase.from("model_codes").select("*").eq("code", code).maybeSingle();
      throwIfError(existingError);
      if (existing) return toModelCode(existing);
      const { data: row, error } = await supabase.from("model_codes").insert({ code, is_default: false }).select("*").single();
      throwIfError(error);
      return toModelCode(row);
    },
  });
}

export function useDeleteModelCode() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("model_codes").delete().eq("id", id).eq("is_default", false);
      throwIfError(error);
    },
  });
}

export function useListExpenseCategories(options?: QueryOptions<ExpenseCategory[]>) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getListExpenseCategoriesQueryKey(),
    enabled: options?.query?.enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("expense_categories").select("*").order("created_at");
      throwIfError(error);
      return (data ?? []).map(toExpenseCategory);
    },
  });
}

export function useCreateExpenseCategory() {
  return useMutation({
    mutationFn: async ({ data }: { data: { name: string } }) => {
      const name = data.name.trim();
      const { data: existing, error: existingError } = await supabase.from("expense_categories").select("*").eq("name", name).maybeSingle();
      throwIfError(existingError);
      if (existing) return toExpenseCategory(existing);
      const { data: row, error } = await supabase.from("expense_categories").insert({ name, is_default: false }).select("*").single();
      throwIfError(error);
      return toExpenseCategory(row);
    },
  });
}

export function useGetLowStock() {
  return useQuery({
    queryKey: getGetLowStockQueryKey(),
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_items").select("*").lt("quantity", 3).order("quantity");
      throwIfError(error);
      return (data ?? []).map(toStockItem);
    },
  });
}

export function useGetMonthlyExpenses() {
  return useQuery({
    queryKey: getGetMonthlyExpensesQueryKey(),
    queryFn: async (): Promise<MonthlyExpenseSummary[]> => {
      const { data, error } = await supabase.from("expenses").select("date,amount").order("date", { ascending: false });
      throwIfError(error);
      const totals = new Map<string, { total: number; count: number }>();
      for (const row of data ?? []) {
        const month = String(row.date).slice(0, 7);
        const current = totals.get(month) ?? { total: 0, count: 0 };
        current.total += Number(row.amount ?? 0);
        current.count += 1;
        totals.set(month, current);
      }
      return [...totals.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 6)
        .map(([month, value]) => ({ month, ...value }));
    },
  });
}

export function useGetDashboardSummary() {
  return useQuery({
    queryKey: getGetDashboardSummaryQueryKey(),
    queryFn: async (): Promise<DashboardSummary> => {
      const [{ data: stock, error: stockError }, { data: expenses, error: expensesError }, { data: sync, error: syncError }] = await Promise.all([
        supabase.from("stock_items").select("*"),
        supabase.from("expenses").select("*"),
        supabase.from("sync_log").select("synced_at").order("synced_at", { ascending: false }).limit(1),
      ]);
      throwIfError(stockError);
      throwIfError(expensesError);
      throwIfError(syncError);

      const stockItems = (stock ?? []).map(toStockItem);
      const expenseItems = (expenses ?? []).map(toExpense);
      const today = new Date().toISOString().slice(0, 10);
      const currentMonth = today.slice(0, 7);
      const todaySoldItems = stockItems.filter((item) => item.updatedAt.slice(0, 10) === today);

      return {
        totalStockCount: stockItems.reduce((sum, item) => sum + item.quantity, 0),
        totalStockValue: stockItems.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0),
        totalSaleValue: stockItems.reduce((sum, item) => sum + item.quantity * item.salePrice, 0),
        todaySales: todaySoldItems.reduce((sum, item) => sum + item.soldCount, 0),
        todaySalesAmount: todaySoldItems.reduce((sum, item) => sum + item.soldCount * item.salePrice, 0),
        todayProfit: todaySoldItems.reduce((sum, item) => sum + item.soldCount * (item.salePrice - item.purchasePrice), 0),
        totalProfit: stockItems.reduce((sum, item) => sum + item.soldCount * (item.salePrice - item.purchasePrice), 0),
        thisMonthExpenses: expenseItems.filter((expense) => expense.date.slice(0, 7) === currentMonth).reduce((sum, expense) => sum + expense.amount, 0),
        lowStockCount: stockItems.filter((item) => item.quantity < 3).length,
        lastSyncAt: sync?.[0]?.synced_at ? String(sync[0].synced_at) : null,
      };
    },
  });
}

export function useGetSyncStatus() {
  return useQuery({
    queryKey: getGetSyncStatusQueryKey(),
    queryFn: async (): Promise<SyncStatus> => {
      const [{ data: stock, error: stockError }, { data: expenses, error: expensesError }, { data: sync, error: syncError }] = await Promise.all([
        supabase.from("stock_items").select("synced_at,updated_at"),
        supabase.from("expenses").select("synced_at"),
        supabase.from("sync_log").select("synced_at").order("synced_at", { ascending: false }).limit(1),
      ]);
      throwIfError(stockError);
      throwIfError(expensesError);
      throwIfError(syncError);
      const stockPending = (stock ?? []).filter((row) => !row.synced_at || String(row.synced_at) < String(row.updated_at)).length;
      const expensePending = (expenses ?? []).filter((row) => !row.synced_at).length;
      return {
        connected: false,
        lastSyncAt: sync?.[0]?.synced_at ? String(sync[0].synced_at) : null,
        pendingChanges: stockPending + expensePending,
        message: "Supabase sync is active. Google Sheets sync is not connected.",
      };
    },
  });
}

export function usePushToSheets() {
  return useMutation({
    mutationFn: async (): Promise<SyncStatus> => ({
      connected: false,
      lastSyncAt: null,
      pendingChanges: 0,
      message: "Google Sheets sync is not configured in the Supabase version.",
    }),
  });
}

export async function exportStockCsv() {
  const { data, error } = await supabase.from("stock_items").select("*").order("model_code");
  throwIfError(error);
  const rows = (data ?? []).map(toStockItem);
  return toCsv(
    ["Model Code", "Name", "Size", "Quantity", "Purchase Price (PKR)", "Sale Price (PKR)", "Sold Count", "Notes", "Created At"],
    rows.map((r) => [r.modelCode, r.name ?? "", r.size, r.quantity, r.purchasePrice.toFixed(2), r.salePrice.toFixed(2), r.soldCount, r.notes ?? "", r.createdAt]),
  );
}

export async function exportExpensesCsv(month: string) {
  const { data, error } = await supabase.from("expenses").select("*").gte("date", `${month}-01`).lt("date", nextMonthStart(month)).order("date");
  throwIfError(error);
  const rows = (data ?? []).map(toExpense);
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  return toCsv(
    ["Date", "Description", "Amount (PKR)", "Category", "Created At"],
    [...rows.map((r) => [r.date, r.description, r.amount.toFixed(2), r.category ?? "", r.createdAt]), ["Total", "", total.toFixed(2), "", ""]],
  );
}

function nextMonthStart(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function toCsv(headers: string[], rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
}

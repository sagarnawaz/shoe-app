"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { getCurrentLocalUserId, requireCurrentLocalUserId } from "./local-auth";
import { expenseInputToRow, stockInputToRow, toExpense, toExpenseCategory, toModelCode, toStockItem } from "./mappers";
import type {
  DashboardSummary,
  ExpenseInput,
  MonthlyExpenseSummary,
  StockInput,
  SyncStatus,
} from "./types";

type QueryOptions = { query?: { enabled?: boolean; queryKey?: unknown[] } };

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export const getListStockQueryKey = (params?: { search?: string }) => ["stock", params ?? {}, getCurrentLocalUserId()];
export const getGetStockItemQueryKey = (id: string) => ["stock", id, getCurrentLocalUserId()];
export const getGetDashboardSummaryQueryKey = () => ["dashboard", "summary", getCurrentLocalUserId()];
export const getGetLowStockQueryKey = () => ["dashboard", "low-stock", getCurrentLocalUserId()];
export const getGetMonthlyExpensesQueryKey = () => ["dashboard", "monthly-expenses", getCurrentLocalUserId()];
export const getListExpensesQueryKey = (params?: { month?: string; date?: string }) => ["expenses", params ?? {}, getCurrentLocalUserId()];
export const getListModelCodesQueryKey = () => ["model-codes", getCurrentLocalUserId()];
export const getListExpenseCategoriesQueryKey = () => ["expense-categories", getCurrentLocalUserId()];
export const getGetSyncStatusQueryKey = () => ["sync", "status", getCurrentLocalUserId()];

function ownerId() {
  return requireCurrentLocalUserId();
}

function withOwner<T extends Record<string, unknown>>(row: T) {
  return { ...row, user_id: ownerId() };
}

function ownAndDefaultFilter(userId: string) {
  return `user_id.is.null,user_id.eq.${userId}`;
}

export function useListStock(params: { search?: string } = {}, options?: QueryOptions) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getListStockQueryKey(params),
    enabled: options?.query?.enabled,
    queryFn: async () => {
      let query = supabase.from("stock_items").select("*").eq("user_id", ownerId()).order("created_at", { ascending: false });
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

export function useGetStockItem(id: string, options?: QueryOptions) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getGetStockItemQueryKey(id),
    enabled: options?.query?.enabled ?? Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_items").select("*").eq("id", id).eq("user_id", ownerId()).single();
      throwIfError(error);
      return toStockItem(data);
    },
  });
}

export function useCreateStockItem() {
  return useMutation({
    mutationFn: async ({ data }: { data: StockInput }) => {
      const { data: row, error } = await supabase.from("stock_items").insert(withOwner(stockInputToRow(data))).select("*").single();
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
        .eq("user_id", ownerId())
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
      const { error } = await supabase.from("stock_items").delete().eq("id", id).eq("user_id", ownerId());
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
        owner_id: ownerId(),
      });
      throwIfError(error);
      return toStockItem(Array.isArray(row) ? row[0] : row);
    },
  });
}

export function useListExpenses(params: { month?: string; date?: string } = {}, options?: QueryOptions) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getListExpensesQueryKey(params),
    enabled: options?.query?.enabled,
    queryFn: async () => {
      let query = supabase.from("expenses").select("*").eq("user_id", ownerId());
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
      const { data: row, error } = await supabase.from("expenses").insert(withOwner(expenseInputToRow(data))).select("*").single();
      throwIfError(error);
      return toExpense(row);
    },
  });
}

export function useUpdateExpense() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ExpenseInput> }) => {
      const { data: row, error } = await supabase
        .from("expenses")
        .update(expenseInputToRow(data as ExpenseInput))
        .eq("id", id)
        .eq("user_id", ownerId())
        .select("*")
        .single();
      throwIfError(error);
      return toExpense(row);
    },
  });
}

export function useDeleteExpense() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", ownerId());
      throwIfError(error);
    },
  });
}

export function useListModelCodes(options?: QueryOptions) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getListModelCodesQueryKey(),
    enabled: options?.query?.enabled,
    queryFn: async () => {
      const userId = ownerId();
      const { data, error } = await supabase.from("model_codes").select("*").or(ownAndDefaultFilter(userId)).order("created_at");
      throwIfError(error);
      return (data ?? []).map(toModelCode);
    },
  });
}

export function useCreateModelCode() {
  return useMutation({
    mutationFn: async ({ data }: { data: { code: string } }) => {
      const userId = ownerId();
      const code = data.code.trim().toUpperCase();
      const { data: existing, error: existingError } = await supabase
        .from("model_codes")
        .select("*")
        .eq("code", code)
        .or(ownAndDefaultFilter(userId))
        .maybeSingle();
      throwIfError(existingError);
      if (existing) return toModelCode(existing);
      const { data: row, error } = await supabase.from("model_codes").insert({ code, is_default: false, user_id: userId }).select("*").single();
      throwIfError(error);
      return toModelCode(row);
    },
  });
}

export function useDeleteModelCode() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("model_codes").delete().eq("id", id).eq("is_default", false).eq("user_id", ownerId());
      throwIfError(error);
    },
  });
}

export function useListExpenseCategories(options?: QueryOptions) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getListExpenseCategoriesQueryKey(),
    enabled: options?.query?.enabled,
    queryFn: async () => {
      const userId = ownerId();
      const { data, error } = await supabase.from("expense_categories").select("*").or(ownAndDefaultFilter(userId)).order("created_at");
      throwIfError(error);
      return (data ?? []).map(toExpenseCategory);
    },
  });
}

export function useCreateExpenseCategory() {
  return useMutation({
    mutationFn: async ({ data }: { data: { name: string } }) => {
      const userId = ownerId();
      const name = data.name.trim();
      const { data: existing, error: existingError } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("name", name)
        .or(ownAndDefaultFilter(userId))
        .maybeSingle();
      throwIfError(existingError);
      if (existing) return toExpenseCategory(existing);
      const { data: row, error } = await supabase.from("expense_categories").insert({ name, is_default: false, user_id: userId }).select("*").single();
      throwIfError(error);
      return toExpenseCategory(row);
    },
  });
}

export function useGetLowStock() {
  return useQuery({
    queryKey: getGetLowStockQueryKey(),
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_items").select("*").eq("user_id", ownerId()).lt("quantity", 3).order("quantity");
      throwIfError(error);
      return (data ?? []).map(toStockItem);
    },
  });
}

export function useGetMonthlyExpenses() {
  return useQuery({
    queryKey: getGetMonthlyExpensesQueryKey(),
    queryFn: async (): Promise<MonthlyExpenseSummary[]> => {
      const { data, error } = await supabase.from("expenses").select("date,amount").eq("user_id", ownerId()).order("date", { ascending: false });
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
      const userId = ownerId();
      const [{ data: stock, error: stockError }, { data: expenses, error: expensesError }, { data: sync, error: syncError }] = await Promise.all([
        supabase.from("stock_items").select("*").eq("user_id", userId),
        supabase.from("expenses").select("*").eq("user_id", userId),
        supabase.from("sync_log").select("synced_at").eq("user_id", userId).order("synced_at", { ascending: false }).limit(1),
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
      const userId = ownerId();
      const [{ data: stock, error: stockError }, { data: expenses, error: expensesError }, { data: sync, error: syncError }] = await Promise.all([
        supabase.from("stock_items").select("synced_at,updated_at").eq("user_id", userId),
        supabase.from("expenses").select("synced_at").eq("user_id", userId),
        supabase.from("sync_log").select("synced_at").eq("user_id", userId).order("synced_at", { ascending: false }).limit(1),
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
  const { data, error } = await supabase.from("stock_items").select("*").eq("user_id", ownerId()).order("model_code");
  throwIfError(error);
  const rows = (data ?? []).map(toStockItem);
  return toCsv(
    ["Model Code", "Name", "Size", "Quantity", "Purchase Price (PKR)", "Sale Price (PKR)", "Sold Count", "Notes", "Created At"],
    rows.map((r) => [r.modelCode, r.name ?? "", r.size, r.quantity, r.purchasePrice.toFixed(2), r.salePrice.toFixed(2), r.soldCount, r.notes ?? "", r.createdAt]),
  );
}

export async function exportExpensesCsv(month: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", ownerId())
    .gte("date", `${month}-01`)
    .lt("date", nextMonthStart(month))
    .order("date");
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

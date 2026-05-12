"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useListExpenses,
  useDeleteExpense,
  getListExpensesQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetMonthlyExpensesQueryKey,
} from "@/lib/data-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatPKR, formatDate, currentMonth } from "@/lib/format";
import { Plus, Trash2, Pencil, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Expenses() {
  const [month, setMonth] = useState(currentMonth());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: expenses, isLoading } = useListExpenses(
    { month },
    { query: { queryKey: getListExpensesQueryKey({ month }) } },
  );
  const deleteExpense = useDeleteExpense();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMonthlyExpensesQueryKey() });
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteExpense.mutate({ id: deleteId }, {
      onSuccess: () => {
        toast({ title: "Deleted", description: "Expense removed" });
        invalidate();
        setDeleteId(null);
      },
      onError: () =>
        toast({ title: "Error", description: "Could not delete", variant: "destructive" }),
    });
  }

  const total = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const isCurrentMonth = month === currentMonth();

  return (
    <div className="pb-nav">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">اخراجات / Expenses</h1>
          </div>
          <Link href="/expenses/new">
            <button
              className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-3 py-2.5 text-sm font-semibold active:opacity-90 transition-opacity"
              data-testid="button-add-expense"
            >
              <Plus size={16} />
              <span>شامل / Add</span>
            </button>
          </Link>
        </div>

        {/* Month navigator */}
        <div className="flex items-center justify-between bg-muted rounded-xl px-2 py-1">
          <button
            onClick={() => setMonth(prevMonth(month))}
            className="p-2 rounded-lg active:bg-background transition-colors"
            data-testid="button-prev-month"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold text-sm">{monthLabel(month)}</span>
          <button
            onClick={() => !isCurrentMonth && setMonth(nextMonth(month))}
            disabled={isCurrentMonth}
            className="p-2 rounded-lg active:bg-background transition-colors disabled:opacity-30"
            data-testid="button-next-month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {/* Total */}
      {!isLoading && expenses && expenses.length > 0 && (
        <div className="mx-4 mt-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">ماہانہ کل / Monthly Total</span>
          <span className="font-bold text-lg text-primary">{formatPKR(total)}</span>
        </div>
      )}

      <div className="px-4 py-3 space-y-2">
        {isLoading && (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))
        )}

        {!isLoading && expenses?.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Receipt size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">کوئی اخراجات نہیں / No expenses</p>
            <p className="text-sm mt-1">for {monthLabel(month)}</p>
          </div>
        )}

        {expenses?.map((expense) => (
          <div
            key={expense.id}
            className="bg-card border border-border rounded-xl px-4 py-3 shadow-sm flex items-center gap-3"
            data-testid={`expense-card-${expense.id}`}
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight" dir="auto">
                {expense.description}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{formatDate(expense.date)}</span>
                {expense.category && (
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    {expense.category}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-base text-foreground">
                {formatPKR(expense.amount)}
              </span>
              <Link href={`/expenses/${expense.id}/edit`}>
                <button
                  className="p-2 rounded-lg bg-secondary text-secondary-foreground active:bg-muted transition-colors"
                  data-testid={`button-edit-expense-${expense.id}`}
                >
                  <Pencil size={14} />
                </button>
              </Link>
              <button
                onClick={() => setDeleteId(expense.id)}
                className="p-2 rounded-lg bg-destructive/10 text-destructive active:bg-destructive/20 transition-colors"
                data-testid={`button-delete-expense-${expense.id}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">کیا آپ واقعی حذف کرنا چاہتے ہیں؟</AlertDialogTitle>
            <AlertDialogDescription>
              یہ اخراجات ہمیشہ کے لیے حذف ہو جائیں گے۔
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-12 text-base">نہیں / No</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground h-12 text-base"
              data-testid="button-confirm-delete-expense"
            >
              ہاں، حذف کریں / Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

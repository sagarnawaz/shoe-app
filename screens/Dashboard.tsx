"use client";

import Link from "next/link";
import { useGetDashboardSummary, useGetLowStock, useGetMonthlyExpenses, usePushToSheets, getGetDashboardSummaryQueryKey, getGetSyncStatusQueryKey } from "@/lib/data-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { formatPKR } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Package, Receipt, AlertTriangle, TrendingUp, RefreshCw, Plus, BadgeDollarSign, Coins } from "lucide-react";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: lowStock } = useGetLowStock();
  const { data: monthlyExpenses } = useGetMonthlyExpenses();
  const pushToSheets = usePushToSheets();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function handleSync() {
    pushToSheets.mutate(undefined, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSyncStatusQueryKey() });
        toast({
          title: "Sync Complete",
          description: data.message ?? "Data synced to Google Sheets",
        });
      },
      onError: () => {
        toast({
          title: "Sync Failed",
          description: "Could not sync to Google Sheets",
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div className="pb-nav">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold">جوتا رجسٹر</h1>
            <p className="text-sm opacity-80">Shoe Shop Register</p>
          </div>
          <button
            onClick={handleSync}
            disabled={pushToSheets.isPending}
            className="flex items-center gap-1.5 bg-white/20 active:bg-white/30 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
            data-testid="button-sync"
          >
            <RefreshCw size={15} className={pushToSheets.isPending ? "animate-spin" : ""} />
            <span>Sync</span>
          </button>
        </div>
      </header>

      <div className="px-4 -mt-4 space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            loading={isLoading}
            label="کل اسٹاک / Total Stock"
            value={summary?.totalStockCount?.toString() ?? "—"}
            sublabel="units in store"
            icon={<Package size={18} className="text-primary" />}
            bg="bg-card"
          />
          <StatCard
            loading={isLoading}
            label="آج کی فروخت / Today's Sales"
            value={summary?.todaySales?.toString() ?? "—"}
            sublabel={summary ? formatPKR(summary.todaySalesAmount) : ""}
            icon={<TrendingUp size={18} className="text-emerald-600" />}
            bg="bg-card"
          />
          <StatCard
            loading={isLoading}
            label="آج کا منافع / Today's Profit"
            value={summary ? formatPKR(summary.todayProfit) : "—"}
            sublabel="from today's sales"
            icon={<BadgeDollarSign size={18} className="text-emerald-600" />}
            bg={summary && summary.todayProfit > 0 ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" : "bg-card"}
          />
          <StatCard
            loading={isLoading}
            label="کل منافع / Total Profit"
            value={summary ? formatPKR(summary.totalProfit) : "—"}
            sublabel="all time"
            icon={<Coins size={18} className="text-yellow-600" />}
            bg="bg-card"
          />
          <StatCard
            loading={isLoading}
            label="ماہانہ اخراجات / Month Expenses"
            value={summary ? formatPKR(summary.thisMonthExpenses) : "—"}
            sublabel="this month"
            icon={<Receipt size={18} className="text-amber-600" />}
            bg="bg-card"
          />
          <StatCard
            loading={isLoading}
            label="کم اسٹاک / Low Stock"
            value={summary?.lowStockCount?.toString() ?? "—"}
            sublabel="items below 3 units"
            icon={<AlertTriangle size={18} className={summary && summary.lowStockCount > 0 ? "text-red-500" : "text-muted-foreground"} />}
            bg={summary && summary.lowStockCount > 0 ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" : "bg-card"}
          />
        </div>

        {/* Low stock alerts */}
        {lowStock && lowStock.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Low Stock Alert
            </h2>
            <div className="space-y-2">
              {lowStock.map((item) => (
                <Link key={item.id} href={`/stock/${item.id}/edit`}>
                  <div
                    className="flex items-center justify-between bg-card border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 active:bg-muted transition-colors"
                    data-testid={`low-stock-item-${item.id}`}
                  >
                    <div>
                      <p className="font-semibold text-sm">{item.modelCode}</p>
                      {item.name && <p className="text-xs text-muted-foreground">{item.name}</p>}
                      <p className="text-xs text-muted-foreground">Size {item.size}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${item.quantity === 0 ? "text-red-600" : "text-amber-600"}`}>
                        {item.quantity}
                      </span>
                      <p className="text-xs text-muted-foreground">units left</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Monthly expense chart */}
        {monthlyExpenses && monthlyExpenses.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Monthly Expenses
            </h2>
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              {monthlyExpenses.map((m) => {
                const maxVal = Math.max(...monthlyExpenses.map((x) => x.total));
                const pct = maxVal > 0 ? (m.total / maxVal) * 100 : 0;
                return (
                  <div key={m.month} data-testid={`monthly-expense-${m.month}`}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{m.month}</span>
                      <span className="font-medium">{formatPKR(m.total)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/stock/new">
              <button
                className="w-full flex items-center gap-3 bg-primary text-primary-foreground rounded-xl px-4 py-4 font-semibold text-sm active:opacity-90 transition-opacity"
                data-testid="button-add-stock"
              >
                <Plus size={18} />
                <span>جوتا شامل / Add Shoe</span>
              </button>
            </Link>
            <Link href="/expenses/new">
              <button
                className="w-full flex items-center gap-3 bg-card border border-border text-foreground rounded-xl px-4 py-4 font-semibold text-sm active:bg-muted transition-colors"
                data-testid="button-add-expense"
              >
                <Plus size={18} />
                <span>اخراجات / Add Expense</span>
              </button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  icon,
  bg,
  loading,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ReactNode;
  bg: string;
  loading?: boolean;
}) {
  return (
    <div className={`${bg} border border-border rounded-xl px-4 py-3 shadow-sm`}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
        {icon}
      </div>
      {loading ? (
        <div className="h-7 bg-muted rounded animate-pulse w-16 mt-1" />
      ) : (
        <p className="text-2xl font-bold leading-tight">{value}</p>
      )}
      {sublabel && (
        <p className="text-[11px] text-muted-foreground mt-0.5">{sublabel}</p>
      )}
    </div>
  );
}

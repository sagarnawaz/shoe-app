"use client";

import { useState } from "react";
import { exportExpensesCsv, exportStockCsv, useGetSyncStatus, usePushToSheets, getGetSyncStatusQueryKey, getGetDashboardSummaryQueryKey } from "@/lib/data-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDate, currentMonth } from "@/lib/format";
import { Download, RefreshCw, Cloud, CloudOff, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function getLastSixMonths() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    months.push({ val, label });
  }
  return months;
}

export default function Export() {
  const [expenseMonth, setExpenseMonth] = useState(currentMonth());
  const { data: sync } = useGetSyncStatus();
  const pushToSheets = usePushToSheets();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const months = getLastSixMonths();

  function downloadCSV(loader: () => Promise<string>, filename: string) {
    loader()
      .then((csv) => new Blob([csv], { type: "text/csv;charset=utf-8" }))
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        toast({ title: "Downloaded!", description: `${filename} saved` });
      })
      .catch(() =>
        toast({ title: "Error", description: "Could not download file", variant: "destructive" }),
      );
  }

  function handleSyncNow() {
    pushToSheets.mutate(undefined, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetSyncStatusQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({
          title: "Synced!",
          description: data.message ?? "Data synced to Google Sheets",
        });
      },
      onError: () =>
        toast({ title: "Sync Failed", description: "Could not sync to Google Sheets", variant: "destructive" }),
    });
  }

  return (
    <div className="pb-nav">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold">ایکسپورٹ / Export</h1>
        <p className="text-xs text-muted-foreground">Download your data as CSV</p>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Google Sheets Sync */}
        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            {sync?.connected ? (
              <Cloud size={20} className="text-emerald-600" />
            ) : (
              <CloudOff size={20} className="text-muted-foreground" />
            )}
            <div>
              <h2 className="font-semibold text-sm">Google Sheets Sync</h2>
              <p className="text-xs text-muted-foreground">
                {sync?.connected
                  ? `Last synced: ${sync.lastSyncAt ? formatDate(new Date(sync.lastSyncAt)) : "Never"}`
                  : sync?.message ?? "Not connected"}
              </p>
            </div>
            <div className="ml-auto">
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  sync?.connected
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {sync?.connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          {sync?.pendingChanges !== undefined && sync.pendingChanges > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {sync.pendingChanges} pending changes not yet synced
            </p>
          )}

          <Button
            onClick={handleSyncNow}
            disabled={pushToSheets.isPending || !sync?.connected}
            className="w-full h-12"
            data-testid="button-sync-now"
          >
            <RefreshCw size={16} className={`mr-2 ${pushToSheets.isPending ? "animate-spin" : ""}`} />
            {pushToSheets.isPending ? "Syncing..." : "ابھی Sync کریں / Sync Now"}
          </Button>

          {!sync?.connected && (
            <p className="text-xs text-muted-foreground text-center">
              Connect Google Sheets from the app settings to enable cloud sync.
            </p>
          )}
        </section>

        {/* Stock export */}
        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-primary" />
            <div>
              <h2 className="font-semibold text-sm">اسٹاک لسٹ / Stock List</h2>
              <p className="text-xs text-muted-foreground">All current stock items as CSV</p>
            </div>
          </div>
          <button
            onClick={() => downloadCSV(exportStockCsv, `stock-${new Date().toISOString().slice(0, 10)}.csv`)}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm active:opacity-90 transition-opacity"
            data-testid="button-export-stock"
          >
            <Download size={16} />
            <span>اسٹاک ڈاؤنلوڈ / Download Stock CSV</span>
          </button>
        </section>

        {/* Expense export */}
        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-amber-600" />
            <div>
              <h2 className="font-semibold text-sm">اخراجات رپورٹ / Expense Report</h2>
              <p className="text-xs text-muted-foreground">Monthly expense summary as CSV</p>
            </div>
          </div>
          <Select value={expenseMonth} onValueChange={setExpenseMonth}>
            <SelectTrigger className="h-12" data-testid="select-expense-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.val} value={m.val}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() =>
              downloadCSV(
                () => exportExpensesCsv(expenseMonth),
                `expenses-${expenseMonth}.csv`,
              )
            }
            className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white rounded-xl py-3.5 font-semibold text-sm active:opacity-90 transition-opacity"
            data-testid="button-export-expenses"
          >
            <Download size={16} />
            <span>اخراجات ڈاؤنلوڈ / Download Expense CSV</span>
          </button>
        </section>
      </div>
    </div>
  );
}

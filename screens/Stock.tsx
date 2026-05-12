"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useListStock,
  useDeleteStockItem,
  useSellStockItem,
  getListStockQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetLowStockQueryKey,
} from "@/lib/data-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatPKR } from "@/lib/format";
import { Plus, Search, Pencil, Trash2, ShoppingBag, X, Package } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Stock() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sellItem, setSellItem] = useState<{ id: string; modelCode: string; qty: number } | null>(null);
  const [sellQty, setSellQty] = useState(1);

  const { data: items, isLoading } = useListStock(
    search ? { search } : {},
    { query: { queryKey: getListStockQueryKey(search ? { search } : {}) } },
  );
  const deleteItem = useDeleteStockItem();
  const sellMutation = useSellStockItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListStockQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLowStockQueryKey() });
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteItem.mutate({ id: deleteId }, {
      onSuccess: () => {
        toast({ title: "✓ حذف ہو گیا!", description: "اسٹاک آئٹم حذف کر دیا گیا" });
        invalidate();
        setDeleteId(null);
      },
      onError: () => {
        toast({ title: "خرابی / Error", description: "حذف نہیں ہو سکا", variant: "destructive" });
      },
    });
  }

  function handleSell() {
    if (!sellItem) return;
    const qty = sellQty;
    if (qty <= 0) return;
    sellMutation.mutate({ id: sellItem.id, data: { quantity: qty } }, {
      onSuccess: () => {
        toast({ title: "✓ فروخت ہو گیا!", description: `${sellItem.modelCode} — ${qty} جوڑا فروخت ہوا` });
        invalidate();
        setSellItem(null);
      },
      onError: () => {
        toast({ title: "خرابی / Error", description: "اسٹاک کم ہے یا خرابی آئی", variant: "destructive" });
      },
    });
  }

  return (
    <div className="pb-nav">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">اسٹاک / Stock</h1>
            <p className="text-xs text-muted-foreground">{items?.length ?? 0} اشیاء / items</p>
          </div>
          <Link href="/stock/new">
            <button
              className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-3 py-2.5 text-sm font-semibold active:opacity-90 transition-opacity"
              data-testid="button-add-stock"
            >
              <Plus size={16} />
              <span>شامل / Add</span>
            </button>
          </Link>
        </div>
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="ماڈل کوڈ یا نام تلاش کریں..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm bg-muted rounded-xl border-0 outline-none ring-0 placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow"
            data-testid="input-search-stock"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-3 space-y-2">
        {isLoading && (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))
        )}

        {!isLoading && items?.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package size={44} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-base">کوئی اسٹاک نہیں / No stock found</p>
            {search ? (
              <p className="text-sm mt-1">مختلف الفاظ سے تلاش کریں / Try a different search</p>
            ) : (
              <Link href="/stock/new">
                <button className="mt-5 inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-6 py-3.5 text-sm font-semibold active:opacity-90 transition-opacity min-h-[48px]">
                  <Plus size={18} />
                  <span>اسٹاک شامل کریں / Add Stock</span>
                </button>
              </Link>
            )}
          </div>
        )}

        {items?.map((item) => (
          <div
            key={item.id}
            className="bg-card border border-border rounded-xl p-4 shadow-sm"
            data-testid={`stock-card-${item.id}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base">{item.modelCode}</span>
                  {item.name && (
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  )}
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    سائز / Size {item.size}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-sm flex-wrap">
                  <span className="text-muted-foreground">
                    خریداری: <span className="text-foreground font-medium">{formatPKR(item.purchasePrice)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    فروخت: <span className="text-emerald-600 font-semibold">{formatPKR(item.salePrice)}</span>
                  </span>
                  {(() => {
                    const profit = item.salePrice - item.purchasePrice;
                    const pct = item.purchasePrice > 0 ? Math.round((profit / item.purchasePrice) * 100) : 0;
                    const color = profit > 0 ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" : "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400";
                    return (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
                        {profit >= 0 ? "▲" : "▼"} {formatPKR(Math.abs(profit))} ({pct}%)
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div className="text-right ml-2">
                <span className={`text-2xl font-bold ${item.quantity < 3 ? "text-red-500" : "text-foreground"}`}>
                  {item.quantity}
                </span>
                <p className="text-xs text-muted-foreground">اسٹاک میں</p>
              </div>
            </div>

            {item.notes && (
              <p className="text-xs text-muted-foreground mb-2 italic">{item.notes}</p>
            )}

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => { setSellItem({ id: item.id, modelCode: item.modelCode, qty: item.quantity }); setSellQty(1); }}
                disabled={item.quantity === 0}
                className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl min-h-[48px] text-sm font-semibold active:opacity-90 disabled:opacity-40 transition-opacity"
                data-testid={`button-sell-${item.id}`}
              >
                <ShoppingBag size={16} />
                <span>فروخت کریں / Sell</span>
              </button>
              <Link href={`/stock/${item.id}/edit`}>
                <button
                  className="flex items-center justify-center bg-secondary text-secondary-foreground rounded-xl min-h-[48px] min-w-[48px] active:bg-muted transition-colors"
                  data-testid={`button-edit-${item.id}`}
                >
                  <Pencil size={18} />
                </button>
              </Link>
              <button
                onClick={() => setDeleteId(item.id)}
                className="flex items-center justify-center bg-destructive/10 text-destructive rounded-xl min-h-[48px] min-w-[48px] active:bg-destructive/20 transition-colors"
                data-testid={`button-delete-${item.id}`}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">کیا آپ واقعی حذف کرنا چاہتے ہیں؟</AlertDialogTitle>
            <AlertDialogDescription>
              یہ آئٹم ہمیشہ کے لیے حذف ہو جائے گا۔
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-12 text-base">نہیں / No</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground h-12 text-base"
              data-testid="button-confirm-delete"
            >
              ہاں، حذف کریں / Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sell dialog */}
      <Dialog open={!!sellItem} onOpenChange={(o) => !o && setSellItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg">فروخت کریں / Mark as Sold</DialogTitle>
          </DialogHeader>
          {sellItem && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                ماڈل: <strong>{sellItem.modelCode}</strong> — {sellItem.qty} اسٹاک میں
              </p>
              <div>
                <p className="text-base font-semibold mb-2">تعداد / Quantity Sold</p>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={sellQty}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (e.target.value === "") {
                      setSellQty(1);
                      return;
                    }
                    if (!isNaN(v) && v >= 1 && v <= sellItem.qty) setSellQty(v);
                  }}
                  className="h-14 text-center text-2xl font-bold tabular-nums"
                  style={{ direction: "ltr" }}
                  data-testid="sell-qty-display"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setSellItem(null)} className="h-12 text-base">
              رہنے دیں / Cancel
            </Button>
            <Button
              onClick={handleSell}
              disabled={sellMutation.isPending}
              className="h-12 text-base"
              data-testid="button-confirm-sell"
            >
              {sellMutation.isPending ? "..." : "فروخت کریں / Mark Sold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

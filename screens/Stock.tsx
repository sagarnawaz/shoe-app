"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getGetDashboardSummaryQueryKey,
  getGetLowStockQueryKey,
  getListStockQueryKey,
  useDeleteStockItem,
  useListStock,
  useUpdateStockItem,
} from "@/lib/data-hooks";
import type { StockItem } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatPKR } from "@/lib/format";
import { Eye, Minus, Package, Pencil, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SellItem = StockItem;
type HoldButtonProps = {
  label: string;
  onStep: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function HoldButton({ label, onStep, disabled, children }: HoldButtonProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopRepeating() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startRepeating() {
    if (disabled) return;
    onStep();
    stopRepeating();
    intervalRef.current = setInterval(onStep, 120);
  }

  useEffect(() => stopRepeating, []);

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={startRepeating}
      onPointerUp={stopRepeating}
      onPointerCancel={stopRepeating}
      onPointerLeave={stopRepeating}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-card text-foreground transition-colors active:bg-muted disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export default function Stock() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sellItem, setSellItem] = useState<SellItem | null>(null);
  const [sellQuantities, setSellQuantities] = useState<Record<string, string>>({});

  const { data: items, isLoading } = useListStock(
    search ? { search } : {},
    { query: { queryKey: getListStockQueryKey(search ? { search } : {}) } },
  );
  const deleteItem = useDeleteStockItem();
  const updateItem = useUpdateStockItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const totalSellQty =
    sellItem?.sizes.reduce((sum, entry) => sum + (Number(sellQuantities[entry.size]) || 0), 0) ?? 0;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListStockQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLowStockQueryKey() });
  }

  function openSell(item: StockItem, initialSize?: string) {
    const initialEntry = initialSize
      ? item.sizes.find((entry) => entry.size === initialSize && entry.quantity > 0)
      : null;
    setSellItem(item);
    setSellQuantities(initialEntry ? { [initialEntry.size]: "1" } : {});
  }

  function setSellQuantity(size: string, value: number, available: number) {
    const next = Math.max(0, Math.min(available, value));

    setSellQuantities((current) => ({
      ...current,
      [size]: next > 0 ? String(next) : "0",
    }));
  }

  function changeSellQty(size: string, step: number, available: number) {
    setSellQuantities((current) => {
      const next = Math.max(0, Math.min(available, (Number(current[size]) || 0) + step));
      return {
        ...current,
        [size]: next > 0 ? String(next) : "0",
      };
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteItem.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast({ title: "Deleted / حذف ہو گیا", description: "Stock item removed / اسٹاک آئٹم ختم کر دیا گیا" });
          invalidate();
          setDeleteId(null);
        },
        onError: () => {
          toast({ title: "Error / خرابی", description: "Could not delete / حذف نہیں ہو سکا", variant: "destructive" });
        },
      },
    );
  }

  function handleSell() {
    if (!sellItem) return;

    const saleEntries = sellItem.sizes
      .map((entry) => ({
        size: entry.size,
        quantity: Number(sellQuantities[entry.size]) || 0,
        available: entry.quantity,
      }))
      .filter((entry) => entry.quantity > 0);
    const qty = saleEntries.reduce((sum, entry) => sum + entry.quantity, 0);

    if (qty < 1) {
      toast({ title: "Enter quantity / تعداد لکھیں", variant: "destructive" });
      return;
    }
    if (saleEntries.some((entry) => entry.quantity > entry.available)) {
      toast({ title: "Not enough stock / اسٹاک کم ہے", variant: "destructive" });
      return;
    }

    const nextSizes = sellItem.sizes.map((entry) =>
      saleEntries.some((saleEntry) => saleEntry.size === entry.size)
        ? {
            ...entry,
            quantity: entry.quantity - (saleEntries.find((saleEntry) => saleEntry.size === entry.size)?.quantity ?? 0),
            soldQuantity:
              (entry.soldQuantity ?? 0) + (saleEntries.find((saleEntry) => saleEntry.size === entry.size)?.quantity ?? 0),
          }
        : entry,
    );
    const nextQuantity = nextSizes.reduce((sum, entry) => sum + entry.quantity, 0);

    updateItem.mutate(
      {
        id: sellItem.id,
        data: {
          sizes: nextSizes,
          quantity: nextQuantity,
          soldCount: sellItem.soldCount + qty,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Sold / فروخت ہو گیا",
            description:
              saleEntries.length === 1
                ? `${sellItem.modelCode} - Size ${saleEntries[0].size} - ${qty} pairs`
                : `${sellItem.modelCode} - ${qty} pairs from ${saleEntries.length} sizes`,
          });
          invalidate();
          setSellItem(null);
          setSellQuantities({});
        },
        onError: () => {
          toast({ title: "Error / خرابی", description: "Could not sell / فروخت محفوظ نہیں ہوئی", variant: "destructive" });
        },
      },
    );
  }

  return (
    <div className="pb-nav bg-muted/40 min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 py-3 backdrop-blur space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/stock/new">
            <button
              className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-4 py-3 text-sm font-bold shadow-lg shadow-primary/25 active:opacity-90 transition-opacity"
              data-testid="button-add-stock"
            >
              <Plus size={16} />
              <span>Add / شامل</span>
            </button>
          </Link>
          <div className="text-right">
            <h1 className="text-xl font-bold">Stock / اسٹاک</h1>
            <p className="text-xs text-muted-foreground">{items?.length ?? 0} items / آئٹمز</p>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Brand ya model talash karein..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-border bg-card py-3 pl-9 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            data-testid="input-search-stock"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-3 space-y-3">
        {isLoading &&
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 rounded-xl bg-card animate-pulse" />
          ))}

        {!isLoading && items?.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package size={44} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-base">No stock found / کوئی اسٹاک نہیں</p>
            {!search && (
              <Link href="/stock/new">
                <button className="mt-5 inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-6 py-3.5 text-sm font-semibold active:opacity-90 transition-opacity min-h-[48px]">
                  <Plus size={18} />
                  <span>Add Stock / اسٹاک شامل کریں</span>
                </button>
              </Link>
            )}
          </div>
        )}

        {items?.map((item) => {
          const hasStock = item.quantity > 0;

          return (
            <article
              key={item.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
              data-testid={`stock-card-${item.id}`}
            >
              <div className="grid grid-cols-[auto_1fr] gap-4">
                <div>
                  <p className={`text-4xl font-black leading-none tabular-nums ${item.quantity < 3 ? "text-red-500" : "text-foreground"}`}>
                    {item.quantity}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">stock / اسٹاک</p>
                </div>

                <div className="min-w-0 text-right">
                  <Link href={`/stock/${item.id}`}>
                    <h2 className="truncate text-lg font-bold underline-offset-4 active:underline">
                      {item.brand || item.modelCode}
                    </h2>
                  </Link>
                  <p className="text-xs font-medium text-muted-foreground">{item.modelCode}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {item.sizes.map((entry) => (
                  <button
                    key={entry.size}
                    type="button"
                    onClick={() => openSell(item, entry.size)}
                    disabled={entry.quantity === 0}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                      entry.quantity === 0
                        ? "bg-muted text-muted-foreground opacity-60"
                        : "bg-primary/10 text-primary active:bg-primary/20"
                    }`}
                  >
                    {entry.quantity} x Size {entry.size}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 items-end gap-3">
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    Purchase / خرید: <span className="font-bold text-foreground">{formatPKR(item.purchasePrice)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Sold / فروخت: <span className="font-bold text-emerald-600">{item.soldCount} pairs</span>
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Link href={`/stock/${item.id}`}>
                    <button
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-secondary text-secondary-foreground active:bg-muted"
                      data-testid={`button-view-${item.id}`}
                    >
                      <Eye size={18} />
                    </button>
                  </Link>
                  <Link href={`/stock/${item.id}/edit`}>
                    <button
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-secondary text-secondary-foreground active:bg-muted"
                      data-testid={`button-edit-${item.id}`}
                    >
                      <Pencil size={18} />
                    </button>
                  </Link>
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-destructive/10 text-destructive active:bg-destructive/20"
                    data-testid={`button-delete-${item.id}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openSell(item)}
                disabled={!hasStock}
                className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm active:opacity-90 disabled:opacity-40"
                data-testid={`button-sell-${item.id}`}
              >
                <ShoppingBag size={17} />
                <span>Sell from this article / فروخت کریں</span>
              </button>
            </article>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete / حذف کریں؟</AlertDialogTitle>
            <AlertDialogDescription>
              This article will be permanently removed / یہ آرٹیکل ہمیشہ کے لیے ختم ہو جائے گا۔
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-12 text-base">No / نہیں</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground h-12 text-base"
              data-testid="button-confirm-delete"
            >
              Yes, Delete / ہاں حذف کریں
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!sellItem} onOpenChange={(open) => !open && setSellItem(null)}>
        <DialogContent className="flex max-h-[calc(100svh-1.5rem)] w-[calc(100vw-1rem)] max-w-[24rem] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[calc(100vh-3rem)] sm:w-full sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-border px-5 pb-3 pt-5 pr-12 text-left">
            <DialogTitle className="text-lg">Sell / فروخت کریں</DialogTitle>
          </DialogHeader>
          {sellItem && (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div className="rounded-xl bg-muted p-3">
                <p className="text-sm text-muted-foreground">Article / آرٹیکل</p>
                <p className="text-xl font-bold">{sellItem.brand || sellItem.modelCode}</p>
                <p className="text-sm text-muted-foreground">{sellItem.modelCode}</p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-base font-semibold">Sell Quantities / فروخت تعداد</p>
                  <p className="text-xs text-muted-foreground">Total: {totalSellQty}</p>
                </div>
                <div className="space-y-2">
                  {sellItem.sizes.map((entry) => {
                    const quantity = Number(sellQuantities[entry.size]) || 0;
                    const disabled = entry.quantity === 0;

                    return (
                      <div
                        key={entry.size}
                        className={`rounded-xl border border-border bg-card p-3 ${disabled ? "opacity-50" : ""}`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Size / سائز</p>
                            <p className="text-2xl font-black tabular-nums">{entry.size}</p>
                          </div>
                          <p className="text-right text-xs text-muted-foreground">
                            Available
                            <span className="block text-base font-bold text-foreground tabular-nums">{entry.quantity}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl bg-muted p-2">
                          <HoldButton
                            label={`Decrease size ${entry.size} quantity / تعداد کم کریں`}
                            onStep={() => changeSellQty(entry.size, -1, entry.quantity)}
                            disabled={disabled || quantity <= 0}
                          >
                            <Minus size={22} />
                          </HoldButton>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={sellQuantities[entry.size] ?? "0"}
                            disabled={disabled}
                            onChange={(event) => {
                              const value = Number(digitsOnly(event.target.value)) || 0;
                              setSellQuantity(entry.size, value, entry.quantity);
                            }}
                            onPaste={(event) => {
                              event.preventDefault();
                              const value = Number(digitsOnly(event.clipboardData.getData("text"))) || 0;
                              setSellQuantity(entry.size, value, entry.quantity);
                            }}
                            onFocus={(event) => event.target.select()}
                            className="h-14 border-0 bg-background text-center text-3xl font-bold tabular-nums focus-visible:ring-2"
                            data-testid={`sell-qty-${entry.size}`}
                          />
                          <HoldButton
                            label={`Increase size ${entry.size} quantity / تعداد بڑھائیں`}
                            onStep={() => changeSellQty(entry.size, 1, entry.quantity)}
                            disabled={disabled || quantity >= entry.quantity}
                          >
                            <Plus size={22} />
                          </HoldButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="grid shrink-0 grid-cols-1 gap-2 border-t border-border px-5 py-4 min-[420px]:grid-cols-2 sm:space-x-0">
            <Button variant="outline" onClick={() => setSellItem(null)} className="h-auto min-h-12 min-w-0 px-2 text-sm">
              <span className="flex min-w-0 flex-col items-center justify-center leading-tight">
                <span>Cancel</span>
                <span dir="rtl">رہنے دیں</span>
              </span>
            </Button>
            <Button
              onClick={handleSell}
              disabled={updateItem.isPending || totalSellQty < 1}
              className="h-auto min-h-12 min-w-0 px-2 text-sm"
              data-testid="button-confirm-sell"
            >
              {updateItem.isPending ? (
                "..."
              ) : (
                <span className="flex min-w-0 flex-col items-center justify-center leading-tight">
                  <span>Confirm Sale</span>
                  <span dir="rtl">فروخت محفوظ کریں</span>
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

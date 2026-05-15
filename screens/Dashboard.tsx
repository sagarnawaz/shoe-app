"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, Boxes, Package, Plus, ShoppingBag } from "lucide-react";
import { getListStockQueryKey, useListStock } from "@/lib/data-hooks";

export default function Dashboard() {
  const { data: items = [], isLoading } = useListStock(
    {},
    { query: { queryKey: getListStockQueryKey() } },
  );

  const stats = useMemo(() => {
    const totalPairs = items.reduce((sum, item) => sum + item.quantity, 0);
    const soldPairs = items.reduce((sum, item) => sum + item.soldCount, 0);
    const lowSizes = items.flatMap((item) =>
      item.sizes
        .filter((entry) => entry.quantity > 0 && entry.quantity <= 3)
        .map((entry) => ({ item, entry })),
    );
    const finishedSizes = items.flatMap((item) =>
      item.sizes
        .filter((entry) => entry.quantity === 0)
        .map((entry) => ({ item, entry })),
    );

    return {
      totalPairs,
      soldPairs,
      articleCount: items.length,
      lowSizes,
      finishedSizes,
    };
  }, [items]);

  return (
    <div className="pb-nav min-h-screen bg-muted/40">
      <header className="bg-primary px-4 pb-8 pt-6 text-primary-foreground">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black leading-tight">امین شوز ہاؤس</h1>
            <p className="mt-2 text-sm opacity-85">Aaj ka stock asani se dekhein</p>
          </div>
          <Link href="/stock/new">
            <button
              className="flex min-h-[48px] items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-primary shadow-lg shadow-black/10 active:opacity-90"
              data-testid="button-add-stock"
            >
              <Plus size={17} />
              <span>Add / شامل</span>
            </button>
          </Link>
        </div>
      </header>

      <main className="-mt-4 space-y-4 px-4 pb-28">
        <section className="grid grid-cols-2 gap-3">
          <BigStatCard
            loading={isLoading}
            label="Total Stock / کل اسٹاک"
            value={String(stats.totalPairs)}
            sublabel="pairs / جوڑے"
            icon={<Package size={19} />}
          />
          <BigStatCard
            loading={isLoading}
            label="Articles / آرٹیکل"
            value={String(stats.articleCount)}
            sublabel="items / آئٹمز"
            icon={<Boxes size={19} />}
          />
          <BigStatCard
            loading={isLoading}
            label="Sold / فروخت"
            value={String(stats.soldPairs)}
            sublabel="pairs / جوڑے"
            icon={<ShoppingBag size={19} />}
          />
          <BigStatCard
            loading={isLoading}
            label="Low Stock / کم اسٹاک"
            value={String(stats.lowSizes.length)}
            sublabel="sizes / سائز"
            icon={<AlertTriangle size={19} />}
            danger={stats.lowSizes.length > 0}
          />
        </section>

        {(stats.lowSizes.length > 0 || stats.finishedSizes.length > 0) && (
          <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">Stock Alert / اسٹاک الرٹ</h2>
                <p className="text-xs text-muted-foreground">
                  {stats.finishedSizes.length + stats.lowSizes.length} sizes need attention
                </p>
              </div>
              <AlertTriangle
                size={20}
                className={stats.finishedSizes.length > 0 ? "text-red-500" : "text-amber-500"}
              />
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {[...stats.finishedSizes, ...stats.lowSizes].map(({ item, entry }) => (
                <Link key={`${item.id}-${entry.size}`} href={`/stock/${item.id}`}>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-muted px-3 py-2 active:bg-muted/70">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{item.brand || item.modelCode}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.modelCode} - Size / سائز {entry.size}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black tabular-nums ${entry.quantity === 0 ? "text-red-600" : "text-amber-600"}`}>
                        {entry.quantity}
                      </p>
                      <p className="text-xs text-muted-foreground">pairs</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!isLoading && items.length === 0 && (
          <section className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
            <Package size={44} className="mx-auto mb-3 text-muted-foreground opacity-40" />
            <h2 className="text-lg font-bold">No Stock / کوئی اسٹاک نہیں</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pehla shoe add karein.</p>
            <Link href="/stock/new">
              <button className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">
                <Plus size={18} />
                <span>Add Shoe / جوتا شامل کریں</span>
              </button>
            </Link>
          </section>
        )}

        <section className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="mb-2 text-xs font-bold text-muted-foreground">Quick Work / فوری کام</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/stock/new">
              <button className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground active:opacity-90">
                <Plus size={18} />
                <span dir="rtl">اسٹاک شامل کریں</span>
              </button>
            </Link>
            <Link href="/stock">
              <button className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm font-bold active:bg-muted">
                <Package size={18} />
                <span dir="rtl">اسٹاک دیکھیں</span>
              </button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function BigStatCard({
  label,
  value,
  sublabel,
  icon,
  loading,
  danger,
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ReactNode;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        danger
          ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100"
          : "border-border bg-card"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <span className={danger ? "text-amber-600" : "text-primary"}>{icon}</span>
      </div>
      {loading ? (
        <div className="h-9 w-16 animate-pulse rounded-lg bg-muted" />
      ) : (
        <p className="text-4xl font-black leading-none tabular-nums">{value}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}

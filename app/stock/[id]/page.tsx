"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
  getGetDashboardSummaryQueryKey,
  getGetLowStockQueryKey,
  getListStockQueryKey,
  useDeleteStockItem,
  useGetStockItem,
} from "@/lib/data-hooks";
import { formatPKR } from "@/lib/format";

export default function Page() {
  const params = useParams<{ id?: string }>();
  const id = params?.id;
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: item, isLoading } = useGetStockItem(id ?? "", {
    query: { enabled: Boolean(id) },
  });
  const deleteItem = useDeleteStockItem();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListStockQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLowStockQueryKey() });
  }

  function handleDelete() {
    if (!id) return;
    deleteItem.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Deleted / حذف ہو گیا", description: "Article removed / آرٹیکل حذف کر دیا گیا" });
          invalidate();
          router.push("/stock");
        },
        onError: () => {
          toast({ title: "Error / خرابی", description: "Could not delete / حذف نہیں ہو سکا", variant: "destructive" });
        },
      },
    );
  }

  return (
    <div className="pb-nav">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/stock")}
          className="p-3 rounded-xl active:bg-muted transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-lg font-bold">Article Details / آرٹیکل تفصیل</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {isLoading || !item ? (
          <div className="space-y-3">
            <div className="h-8 w-3/4 rounded-xl bg-muted animate-pulse" />
            <div className="h-4 w-full rounded-xl bg-muted animate-pulse" />
            <div className="h-44 rounded-xl bg-muted animate-pulse" />
          </div>
        ) : (
          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Model Code / ماڈل کوڈ</p>
              <h2 className="text-2xl font-bold">{item.modelCode}</h2>
              <div className="mt-4 grid gap-2 text-sm">
                <p>
                  <span className="font-semibold">Brand / برانڈ: </span>
                  {item.brand || "-"}
                </p>
              </div>
            </section>

            <section className="rounded-xl border-2 border-primary/30 bg-primary/10 p-5">
              <p className="text-sm text-muted-foreground">Total Stock / کل اسٹاک</p>
              <p className="text-3xl font-bold">{item.quantity} pairs / {item.quantity} جوڑے</p>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-base font-bold">Size Breakdown / سائز کی تفصیل</h3>
              <div className="space-y-2">
                {item.sizes.map((entry) => (
                  <div
                    key={entry.size}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted px-4 py-3"
                  >
                    <p className="font-semibold">Size {entry.size} / سائز {entry.size}</p>
                    <p className="text-sm text-muted-foreground">{entry.quantity} pairs / {entry.quantity} جوڑے</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="text-sm">
                <p>
                  <span className="block text-muted-foreground">Purchase / خرید</span>
                  <span className="font-semibold">{formatPKR(item.purchasePrice)}</span>
                </p>
              </div>
            </section>

            <div className="grid gap-3">
              <Link href={`/stock/${item.id}/edit`}>
                <Button className="w-full h-14 text-base font-semibold">
                  <Plus size={16} />
                  <span>Add More Stock / مزید اسٹاک شامل کریں</span>
                </Button>
              </Link>
              <Link href={`/stock/${item.id}/edit`}>
                <Button variant="secondary" className="w-full h-14 text-base font-semibold">
                  <Pencil size={16} />
                  <span>Edit / ترمیم کریں</span>
                </Button>
              </Link>
              <Button
                variant="destructive"
                className="w-full h-14 text-base font-semibold"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 size={16} />
                <span>Delete / حذف کریں</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete / حذف کریں؟</AlertDialogTitle>
            <AlertDialogDescription>
              This article will be permanently removed / یہ آرٹیکل ہمیشہ کے لیے حذف ہو جائے گا۔
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-12 text-base">No / نہیں</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground h-12 text-base"
            >
              Yes, Delete / ہاں حذف کریں
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

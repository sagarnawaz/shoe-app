"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateExpense,
  useUpdateExpense,
  useListExpenses,
  getListExpensesQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetMonthlyExpensesQueryKey,
  useListExpenseCategories,
  useCreateExpenseCategory,
  getListExpenseCategoriesQueryKey,
} from "@/lib/data-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { todayString } from "@/lib/format";
import { ArrowLeft } from "lucide-react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  date: z.string().min(1, "Date required"),
  description: z.string().min(1, "Description required"),
  amount: z.coerce
    .number({ invalid_type_error: "Amount required" })
    .min(0, "Amount required"),
  category: z.string().optional(),
  newCategory: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const NEW_CAT_MARKER = "__new__";

export default function ExpenseForm({ mode }: { mode: "new" | "edit" }) {
  const params = useParams<{ id?: string }>();
  const id = params?.id;
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /* ── Categories from DB ─────────────────────────────── */
  const { data: categories = [] } = useListExpenseCategories({
    query: { queryKey: getListExpenseCategoriesQueryKey() },
  });
  const createCategory = useCreateExpenseCategory();

  const { data: allExpenses } = useListExpenses(
    {},
    { query: { enabled: mode === "edit" && !!id, queryKey: getListExpensesQueryKey({}) } },
  );
  const existing = allExpenses?.find((e) => e.id === id);

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: todayString(),
      description: "",
      amount: "" as unknown as number,
      category: "",
      newCategory: "",
    },
  });

  const selectedCategory = form.watch("category");
  const isNewCategory = selectedCategory === NEW_CAT_MARKER;

  useEffect(() => {
    if (existing) {
      form.reset({
        date: typeof existing.date === "string"
          ? existing.date
          : new Date(existing.date).toISOString().slice(0, 10),
        description: existing.description,
        amount: existing.amount,
        category: existing.category ?? "",
        newCategory: "",
      });
    }
  }, [existing, form]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMonthlyExpensesQueryKey() });
  }

  function saveExpense(category: string | undefined) {
    const values = form.getValues();

    if (mode === "new") {
      createExpense.mutate(
        {
          data: {
            date: values.date,
            description: values.description,
            amount: values.amount,
            category: category || undefined,
          },
        },
        {
          onSuccess: () => {
            toast({ title: "✓ شامل ہو گیا!", description: "اخراجات محفوظ ہو گئے" });
            invalidate();
            router.push("/expenses");
          },
          onError: () =>
            toast({ title: "خرابی / Error", description: "اخراجات شامل نہیں ہو سکے", variant: "destructive" }),
        },
      );
    } else {
      updateExpense.mutate(
        {
          id: id!,
          data: {
            date: values.date,
            description: values.description,
            amount: values.amount,
            category: category || undefined,
          },
        },
        {
          onSuccess: () => {
            toast({ title: "✓ محفوظ ہو گیا!", description: "اخراجات اپ ڈیٹ ہو گئے" });
            invalidate();
            router.push("/expenses");
          },
          onError: () =>
            toast({ title: "خرابی / Error", description: "اخراجات محفوظ نہیں ہو سکے", variant: "destructive" }),
        },
      );
    }
  }

  function onSubmit(values: FormValues) {
    if (isNewCategory && values.newCategory?.trim()) {
      const newCatName = values.newCategory.trim();
      createCategory.mutate(
        { data: { name: newCatName } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListExpenseCategoriesQueryKey() });
            saveExpense(newCatName);
          },
          onError: () => saveExpense(newCatName),
        },
      );
    } else {
      saveExpense(values.category && values.category !== NEW_CAT_MARKER ? values.category : undefined);
    }
  }

  const isPending = createExpense.isPending || updateExpense.isPending;

  return (
    <div className="pb-nav">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/expenses")}
          className="p-2 rounded-lg active:bg-muted transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold">
            {mode === "new" ? "اخراجات شامل / Add Expense" : "ترمیم / Edit Expense"}
          </h1>
        </div>
      </header>

      <div className="px-4 py-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">تاریخ / Date *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      className="h-12 text-base"
                      data-testid="input-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">تفصیل / Description *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="مثال: دکان کا کرایہ، بجلی کا بل / e.g. Shop rent, Electricity bill"
                      className="h-12 text-base"
                      dir="auto"
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">رقم / Amount (PKR) *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type="text"
                      className="h-14 text-xl font-bold"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      data-testid="input-amount"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">قسم / Category (اختیاری)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12" data-testid="select-category">
                        <SelectValue placeholder="قسم منتخب کریں / Select category..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={NEW_CAT_MARKER}>
                        + نئی قسم شامل / Add new category
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isNewCategory && (
              <FormField
                control={form.control}
                name="newCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">نئی قسم کا نام / New category name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="مثال: مرمت / Repairs"
                        className="h-12 text-base"
                        dir="auto"
                        autoFocus
                        data-testid="input-new-category"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-14 text-base font-bold"
              data-testid="button-submit"
            >
              {isPending
                ? "محفوظ ہو رہا ہے... / Saving..."
                : mode === "new"
                ? "شامل کریں / Add Expense"
                : "محفوظ کریں / Save Changes"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

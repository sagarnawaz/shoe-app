"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateStockItem,
  useUpdateStockItem,
  useGetStockItem,
  getListStockQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetLowStockQueryKey,
  getGetStockItemQueryKey,
  useListModelCodes,
  useCreateModelCode,
  useDeleteModelCode,
  getListModelCodesQueryKey,
} from "@/lib/data-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertTriangle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

/* Constants */
const STANDARD_SIZES = ["39", "40", "41", "42", "43", "44", "45", "46"];
const CUSTOM_MARKER = "__custom__";

/* Schema with price validation */
const schema = z
  .object({
    modelCode: z.string().min(1, "ماڈل کوڈ ضروری ہے / Model code required"),
    name: z.string().optional(),
    size: z.string().min(1, "سائز ضروری ہے / Size required"),
    quantity: z.coerce.number().int().min(0, "0 یا زیادہ ہونا چاہیے"),
    purchasePrice: z.coerce.number().min(0, "0 یا زیادہ ہونا چاہیے"),
    salePrice: z.coerce.number().min(0, "0 یا زیادہ ہونا چاہیے"),
    notes: z.string().optional(),
  })
  .refine((data) => data.salePrice >= data.purchasePrice, {
    message: "فروخت قیمت خریداری قیمت سے کم نہیں ہو سکتی / Sale price cannot be less than purchase price",
    path: ["salePrice"],
  });

type FormValues = z.infer<typeof schema>;


export default function StockForm({ mode }: { mode: "new" | "edit" }) {
  const params = useParams<{ id?: string }>();
  const id = params?.id;
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedChip, setSelectedChip] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  const isCustomModel = selectedChip === CUSTOM_MARKER;
  const isOtherSize = selectedSize === "Other";

  /* Model codes from DB */
  const { data: modelCodes = [] } = useListModelCodes({
    query: { queryKey: getListModelCodesQueryKey() },
  });
  const createModelCode = useCreateModelCode();
  const deleteModelCode = useDeleteModelCode();

  const defaultCodes = modelCodes.filter((m) => m.isDefault);
  const customCodes = modelCodes.filter((m) => !m.isDefault);

  const { data: existing } = useGetStockItem(id ?? "", {
    query: {
      enabled: mode === "edit" && !!id,
      queryKey: getGetStockItemQueryKey(id ?? ""),
    },
  });

  const createItem = useCreateStockItem();
  const updateItem = useUpdateStockItem();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      modelCode: "",
      name: "",
      size: "",
      quantity: 1,
      purchasePrice: "" as unknown as number,
      salePrice: "" as unknown as number,
      notes: "",
    },
  });

  const purchasePrice = useWatch({ control: form.control, name: "purchasePrice" });
  const salePrice = useWatch({ control: form.control, name: "salePrice" });
  const priceWarning = Number(salePrice) > 0 && Number(salePrice) < Number(purchasePrice);

  useEffect(() => {
    if (existing && modelCodes.length > 0) {
      const existingSize = existing.size;
      const sizeIsStandard = STANDARD_SIZES.includes(existingSize);
      const existingModel = existing.modelCode;
      const chipMatch = modelCodes.find((m) => m.code === existingModel);

      setSelectedSize(sizeIsStandard ? existingSize : "Other");
      setSelectedChip(chipMatch ? existingModel : CUSTOM_MARKER);

      form.reset({
        modelCode: existingModel,
        name: existing.name ?? "",
        size: existingSize,
        quantity: existing.quantity,
        purchasePrice: existing.purchasePrice,
        salePrice: existing.salePrice,
        notes: existing.notes ?? "",
      });
    }
  }, [existing, modelCodes, form]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListStockQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLowStockQueryKey() });
  }

  function onSubmit(values: FormValues) {
    const isKnown = modelCodes.some((m) => m.code === values.modelCode);

    const saveItem = () => {
      const payload = {
        modelCode: values.modelCode,
        name: values.name || undefined,
        size: values.size,
        quantity: values.quantity,
        purchasePrice: values.purchasePrice,
        salePrice: values.salePrice,
        notes: values.notes || undefined,
      };

      if (mode === "new") {
        createItem.mutate({ data: payload }, {
          onSuccess: () => {
            toast({ title: "✓ شامل ہو گیا!", description: "اسٹاک آئٹم کامیابی سے شامل ہو گیا" });
            invalidate();
            router.push("/stock");
          },
          onError: () =>
            toast({ title: "خرابی / Error", description: "آئٹم شامل نہیں ہو سکا", variant: "destructive" }),
        });
      } else {
        updateItem.mutate({ id: id!, data: payload }, {
          onSuccess: () => {
            toast({ title: "✓ محفوظ ہو گیا!", description: "اسٹاک آئٹم اپ ڈیٹ ہو گیا" });
            invalidate();
            router.push("/stock");
          },
          onError: () =>
            toast({ title: "خرابی / Error", description: "آئٹم محفوظ نہیں ہو سکا", variant: "destructive" }),
        });
      }
    };

    if (!isKnown && values.modelCode) {
      createModelCode.mutate(
        { data: { code: values.modelCode } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListModelCodesQueryKey() });
            saveItem();
          },
          onError: saveItem,
        },
      );
    } else {
      saveItem();
    }
  }

  const isPending = createItem.isPending || updateItem.isPending;

  return (
    <div className="pb-nav">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/stock")}
          className="p-3 rounded-xl active:bg-muted transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold">
          {mode === "new" ? "جوتا شامل کریں / Add Shoe" : "ترمیم کریں / Edit Shoe"}
        </h1>
      </header>

      <div className="px-4 py-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Model code chips */}
            <FormField
              control={form.control}
              name="modelCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">ماڈل کوڈ / Model Code *</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {defaultCodes.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedChip(m.code);
                          field.onChange(m.code);
                        }}
                        className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-colors min-h-[48px] ${
                          selectedChip === m.code
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border active:bg-muted"
                        }`}
                        data-testid={`chip-model-${m.code.toLowerCase()}`}
                      >
                        {m.code}
                      </button>
                    ))}
                    {customCodes.map((m) => (
                      <div key={m.id} className="relative inline-flex">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChip(m.code);
                            field.onChange(m.code);
                          }}
                          className={`pl-4 pr-8 py-3 rounded-xl text-sm font-semibold border-2 transition-colors min-h-[48px] ${
                            selectedChip === m.code
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-foreground border-border active:bg-muted"
                          }`}
                        >
                          {m.code}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteModelCode.mutate(
                              { id: m.id },
                              {
                                onSuccess: () => {
                                  queryClient.invalidateQueries({ queryKey: getListModelCodesQueryKey() });
                                  if (selectedChip === m.code) {
                                    setSelectedChip("");
                                    field.onChange("");
                                  }
                                },
                              },
                            );
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white text-xs leading-none"
                          title="ہٹائیں"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChip(CUSTOM_MARKER);
                        field.onChange("");
                      }}
                      className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-colors min-h-[48px] ${
                        isCustomModel
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border active:bg-muted"
                      }`}
                      data-testid="chip-model-custom"
                    >
                      کوئی اور
                    </button>
                  </div>
                  {isCustomModel && (
                    <FormControl>
                      <Input
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="ماڈل کوڈ لکھیں..."
                        className="h-14 text-base font-medium mt-2"
                        dir="auto"
                        autoFocus
                        data-testid="input-model-code-custom"
                      />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Article name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">آرٹیکل کا نام / Article Name (اختیاری)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="مثال: باٹا کلاسک، سروس اسپورٹ / e.g. Bata Classic, Servis Sport"
                      className="h-14 text-base"
                      dir="auto"
                      data-testid="input-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Size chips */}
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">سائز / Size *</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {[...STANDARD_SIZES, "دیگر"].map((s, idx) => {
                      const val = idx < STANDARD_SIZES.length ? s : "Other";
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSelectedSize(val);
                            if (val !== "Other") {
                              field.onChange(val);
                            } else {
                              field.onChange("");
                            }
                          }}
                          className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-colors min-h-[48px] min-w-[52px] ${
                            selectedSize === val
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-foreground border-border active:bg-muted"
                          }`}
                          data-testid={`chip-size-${val.toLowerCase()}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  {isOtherSize && (
                    <FormControl>
                      <Input
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="مثال: 47، 38..."
                        className="h-14 text-base font-medium mt-2"
                        inputMode="numeric"
                        autoFocus
                        data-testid="input-size-custom"
                      />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">تعداد / Quantity *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="h-14 text-base font-medium"
                      data-testid="input-quantity"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Prices */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">خریداری قیمت / Purchase *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          type="text"
                          className="h-14 text-base font-medium"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          data-testid="input-purchase-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="salePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">فروخت قیمت / Sale *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          type="text"
                          className={`h-14 text-base font-medium ${priceWarning ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          data-testid="input-sale-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {priceWarning && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400 leading-snug">
                    فروخت قیمت خریداری سے کم ہے — نقصان ہو گا!<br />
                    <span className="text-xs opacity-80">Sale price is below purchase price — you'll make a loss!</span>
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">نوٹس / Notes (اختیاری)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="اس آئٹم کے بارے میں کوئی نوٹس..."
                      className="resize-none text-base min-h-[80px]"
                      rows={3}
                      dir="auto"
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-16 text-lg font-bold"
              data-testid="button-submit"
            >
              {isPending
                ? "محفوظ ہو رہا ہے..."
                : mode === "new"
                ? "اسٹاک میں شامل کریں / Add to Stock"
                : "تبدیلیاں محفوظ کریں / Save Changes"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import {
  getGetDashboardSummaryQueryKey,
  getGetLowStockQueryKey,
  getGetStockItemQueryKey,
  getListModelCodesQueryKey,
  getListStockQueryKey,
  useCreateModelCode,
  useCreateStockItem,
  useDeleteModelCode,
  useGetStockItem,
  useListModelCodes,
  useListStock,
  useUpdateStockItem,
} from "@/lib/data-hooks";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const DEFAULT_BRANDS = ["BATA", "SERVIS", "NIKE", "ADIDAS", "NDURE", "METRO"];
const SOLE_TYPES = [
  { value: "Pandar", label: "پنڈار سول / Pandar" },
  { value: "Mix", label: "مکس سول / Mix" },
  { value: "CM", label: "سی ایم / CM" },
  { value: "Walker", label: "واکر / Walker" },
];
const STANDARD_SIZES = ["39", "40", "41", "42", "43", "44", "45"];
const CUSTOM_MARKER = "__custom__";
const OTHER_SOLE_TYPE = "Other";
const OTHER_SIZE = "Other";
const OTHER_BRAND = "Other";

type SizeEntry = { size: string; quantity: number };
type HoldButtonProps = {
  label: string;
  onStep: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeLabel(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
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

const schema = z.object({
  brand: z.string().min(1, "Brand required / برانڈ ضروری ہے"),
  modelCode: z.string().min(1, "Model code required / ماڈل کوڈ ضروری ہے"),
  soleType: z.string().trim().min(1, "Sole type required / سول ٹائپ ضروری ہے"),
  purchasePrice: z.preprocess(
    (value) => (value === "" || value == null ? 0 : value),
    z.coerce.number().min(0, "0 یا زیادہ ہونا چاہیے"),
  ),
});

type FormValues = z.infer<typeof schema>;

export default function StockForm({ mode }: { mode: "new" | "edit" }) {
  const params = useParams<{ id?: string }>();
  const id = params?.id;
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      brand: DEFAULT_BRANDS[0],
      modelCode: "",
      soleType: "",
      purchasePrice: "" as unknown as number,
    },
  });
  const watchedBrand = useWatch({ control: form.control, name: "brand" });

  const [selectedBrand, setSelectedBrand] = useState(DEFAULT_BRANDS[0]);
  const [selectedChip, setSelectedChip] = useState("");
  const [selectedSoleType, setSelectedSoleType] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [sizeQuantity, setSizeQuantity] = useState("0");
  const [sizes, setSizes] = useState<SizeEntry[]>([]);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const initialSizesRef = useRef("[]");
  const allowNavigationRef = useRef(false);

  const isOtherBrand = selectedBrand === OTHER_BRAND;
  const isCustomModel = selectedChip === CUSTOM_MARKER;
  const isOtherSoleType = selectedSoleType === OTHER_SOLE_TYPE;
  const isOtherSize = selectedSize === OTHER_SIZE;
  const pendingSize = (isOtherSize ? customSize : selectedSize).trim();
  const pendingQuantity = Number(sizeQuantity);
  const canAddSize = Boolean(pendingSize) && Number.isInteger(pendingQuantity) && pendingQuantity > 0;
  const totalStock = useMemo(
    () => sizes.reduce((sum, item) => sum + item.quantity, 0),
    [sizes],
  );
  const sizesSnapshot = useMemo(() => JSON.stringify(sizes), [sizes]);

  const { data: modelCodes = [] } = useListModelCodes({
    query: { queryKey: getListModelCodesQueryKey() },
  });
  const { data: stockItems = [] } = useListStock(
    {},
    { query: { queryKey: getListStockQueryKey() } },
  );
  const createModelCode = useCreateModelCode();
  const deleteModelCode = useDeleteModelCode();
  const { defaultCodes, customCodes } = useMemo(() => {
    const seen = new Set<string>();
    const uniqueDefaults = modelCodes.filter((model) => {
      const code = model.code.trim().toUpperCase();
      if (!model.isDefault || seen.has(code)) return false;
      seen.add(code);
      return true;
    });
    const uniqueCustom = modelCodes.filter((model) => {
      const code = model.code.trim().toUpperCase();
      if (model.isDefault || seen.has(code)) return false;
      seen.add(code);
      return true;
    });

    return { defaultCodes: uniqueDefaults, customCodes: uniqueCustom };
  }, [modelCodes]);
  const brandOptions = useMemo(() => {
    const seen = new Set<string>();

    return [
      ...DEFAULT_BRANDS,
      ...stockItems.map((item) => normalizeLabel(item.brand)),
    ].filter((brand) => {
      if (!brand || seen.has(brand)) return false;
      seen.add(brand);
      return true;
    });
  }, [stockItems]);
  const selectedBrandValue = normalizeLabel(isOtherBrand ? watchedBrand : selectedBrand);
  const brandModelCodes = useMemo(() => {
    const seen = new Set<string>();

    if (!selectedBrandValue) return [];

    return stockItems
      .filter((item) => normalizeLabel(item.brand) === selectedBrandValue)
      .map((item) => item.modelCode.trim().toUpperCase())
      .filter((code) => {
        if (!code || seen.has(code)) return false;
        seen.add(code);
        return true;
      });
  }, [selectedBrandValue, stockItems]);
  const shownDefaultCodes = selectedBrandValue
    ? brandModelCodes.map((code) => ({ id: `brand-${selectedBrandValue}-${code}`, code }))
    : defaultCodes;
  const shownCustomCodes = selectedBrandValue ? [] : customCodes;

  const { data: existing } = useGetStockItem(id ?? "", {
    query: {
      enabled: mode === "edit" && Boolean(id),
      queryKey: getGetStockItemQueryKey(id ?? ""),
    },
  });

  const createItem = useCreateStockItem();
  const updateItem = useUpdateStockItem();
  const isPending = createItem.isPending || updateItem.isPending;

  useEffect(() => {
    if (existing && modelCodes.length > 0) {
      const existingBrand = normalizeLabel(existing.brand);
      const brandMatch = existingBrand && brandOptions.includes(existingBrand);
      const existingSoleType = existing.soleType ?? "";
      const soleTypeMatch = SOLE_TYPES.some((type) => type.value === existingSoleType);

      setSelectedChip(existing.modelCode);
      setSelectedBrand(brandMatch ? existingBrand : OTHER_BRAND);
      setSelectedSoleType(soleTypeMatch ? existingSoleType : existingSoleType ? OTHER_SOLE_TYPE : "");
      const loadedSizes = existing.sizes.length ? existing.sizes : [{ size: existing.size, quantity: existing.quantity }];

      setSizes(loadedSizes);
      initialSizesRef.current = JSON.stringify(loadedSizes);

      form.reset({
        brand: existingBrand,
        modelCode: existing.modelCode,
        soleType: existingSoleType,
        purchasePrice: existing.purchasePrice,
      });
    }
  }, [existing, modelCodes, brandOptions, form]);

  const hasUnsavedChanges = form.formState.isDirty || sizesSnapshot !== initialSizesRef.current;

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges || allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!hasUnsavedChanges || allowNavigationRef.current || isPending) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;

      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;

      const href = `${url.pathname}${url.search}${url.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (href === current) return;

      event.preventDefault();
      setPendingHref(href);
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [hasUnsavedChanges, isPending]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListStockQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLowStockQueryKey() });
    if (id) queryClient.invalidateQueries({ queryKey: getGetStockItemQueryKey(id) });
  }

  function clearSizeInput() {
    setSelectedSize("");
    setCustomSize("");
    setSizeQuantity("0");
  }

  function changeSizeQuantity(step: number) {
    setSizeQuantity((current) => {
      const next = Math.max(0, (Number(current) || 0) + step);
      return String(next);
    });
  }

  function handleAddSize() {
    const size = (isOtherSize ? customSize : selectedSize).trim();
    const quantity = Number(sizeQuantity);

    if (!size) {
      toast({ title: "Size required / سائز ضروری ہے", variant: "destructive" });
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast({ title: "Quantity must be greater than 0 / تعداد 0 سے زیادہ ہونی چاہیے", variant: "destructive" });
      return;
    }
    const sizeExists = sizes.some((item) => item.size === size);

    setSizes((current) =>
      (sizeExists
        ? current.map((item) =>
            item.size === size ? { ...item, quantity: item.quantity + quantity } : item,
          )
        : [...current, { size, quantity }]
      ).sort((a, b) => Number(a.size) - Number(b.size)),
    );
    if (sizeExists) {
      toast({ title: "Quantity updated / تعداد اپ ڈیٹ ہو گئی" });
    }
    clearSizeInput();
  }

  function continueNavigation(href: string) {
    allowNavigationRef.current = true;
    router.push(href);
  }

  function requestNavigation(href: string) {
    if (hasUnsavedChanges && !allowNavigationRef.current) {
      setPendingHref(href);
      return;
    }

    continueNavigation(href);
  }

  function onSubmit(values: FormValues, targetHref = "/stock") {
    if (sizes.length === 0) {
      toast({ title: "Add at least one size / کم از کم ایک سائز شامل کریں", variant: "destructive" });
      return;
    }

    const modelCode = values.modelCode.trim().toUpperCase();
    const isKnown = modelCodes.some((m) => m.code === modelCode);
    const payload = {
      brand: values.brand.trim().toUpperCase(),
      modelCode,
      soleType: values.soleType.trim(),
      name: undefined,
      sizes,
      purchasePrice: values.purchasePrice,
      salePrice: values.purchasePrice,
      notes: undefined,
    };

    const saveItem = () => {
      if (mode === "new") {
        createItem.mutate(
          { data: payload },
          {
            onSuccess: () => {
              toast({ title: "Saved / محفوظ ہو گیا", description: "Shoe added to stock / جوتا اسٹاک میں شامل ہو گیا" });
              invalidate();
              initialSizesRef.current = JSON.stringify(sizes);
              continueNavigation(targetHref);
            },
            onError: () => toast({ title: "Error / خرابی", description: "Item could not be saved / آئٹم محفوظ نہیں ہو سکا", variant: "destructive" }),
          },
        );
      } else {
        updateItem.mutate(
          { id: id!, data: payload },
          {
            onSuccess: () => {
              toast({ title: "Saved / محفوظ ہو گیا", description: "Shoe updated / جوتا اپ ڈیٹ ہو گیا" });
              invalidate();
              initialSizesRef.current = JSON.stringify(sizes);
              continueNavigation(targetHref);
            },
            onError: () => toast({ title: "Error / خرابی", description: "Item could not be saved / آئٹم محفوظ نہیں ہو سکا", variant: "destructive" }),
          },
        );
      }
    };

    if (!isKnown && modelCode) {
      createModelCode.mutate(
        { data: { code: modelCode } },
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

  return (
    <div className="pb-nav">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => requestNavigation("/stock")}
          className="p-3 rounded-xl active:bg-muted transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold">
          {mode === "new" ? "Add Shoe / جوتا شامل کریں" : "Edit Shoe / ترمیم کریں"}
        </h1>
      </header>

      <div className="px-4 py-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => onSubmit(values))} className="space-y-5">
            <section className="space-y-4 rounded-xl border border-border bg-card p-4">
              <h2 className="text-base font-bold">Article Information / آرٹیکل معلومات</h2>

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Brand / برانڈ *</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {[...brandOptions, OTHER_BRAND].map((brand) => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => {
                            setSelectedBrand(brand);
                            setSelectedChip("");
                            field.onChange(brand === OTHER_BRAND ? "" : brand);
                            form.setValue("modelCode", "", { shouldDirty: true });
                          }}
                          className={`min-h-[48px] rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                            selectedBrand === brand
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground active:bg-muted"
                          }`}
                          data-testid={`chip-brand-${brand.toLowerCase()}`}
                        >
                          {brand === OTHER_BRAND ? "Other / دیگر" : brand}
                        </button>
                      ))}
                    </div>
                    {isOtherBrand && (
                      <FormControl>
                        <Input
                          value={field.value}
                          onChange={(event) => {
                            setSelectedChip("");
                            form.setValue("modelCode", "", { shouldDirty: true });
                            field.onChange(normalizeLabel(event.target.value));
                          }}
                          placeholder="Enter brand / برانڈ لکھیں"
                          className="mt-2 h-14 text-base font-medium"
                          dir="auto"
                          autoFocus
                          data-testid="input-brand-other"
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Model Code / ماڈل کوڈ *</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {shownDefaultCodes.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedChip(m.code);
                            field.onChange(m.code);
                          }}
                          className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 min-h-[48px] transition-colors ${
                            selectedChip === m.code
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-foreground border-border active:bg-muted"
                          }`}
                          data-testid={`chip-model-${m.code.toLowerCase()}`}
                        >
                          {m.code}
                        </button>
                      ))}
                      {shownCustomCodes.map((m) => (
                        <div key={m.id} className="relative inline-flex">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChip(m.code);
                              field.onChange(m.code);
                            }}
                            className={`pl-4 pr-8 py-3 rounded-xl text-sm font-semibold border-2 min-h-[48px] transition-colors ${
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
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-xs leading-none text-white hover:bg-black/40"
                            title="Remove / ختم کریں"
                          >
                            x
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedChip(CUSTOM_MARKER);
                          field.onChange("");
                        }}
                        className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 min-h-[48px] transition-colors ${
                          isCustomModel
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border active:bg-muted"
                        }`}
                        data-testid="chip-model-custom"
                      >
                        Other / دیگر
                      </button>
                    </div>
                    {isCustomModel && (
                      <FormControl>
                        <Input
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value)}
                          placeholder="Enter model code / ماڈل کوڈ لکھیں"
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

              <FormField
                control={form.control}
                name="soleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Sole Type / سول ٹائپ *</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {[...SOLE_TYPES, { value: OTHER_SOLE_TYPE, label: "دیگر / Other" }].map((soleType) => (
                        <button
                          key={soleType.value}
                          type="button"
                          onClick={() => {
                            setSelectedSoleType(soleType.value);
                            field.onChange(soleType.value === OTHER_SOLE_TYPE ? "" : soleType.value);
                          }}
                          className={`min-h-[48px] rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                            selectedSoleType === soleType.value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground active:bg-muted"
                          }`}
                          data-testid={`chip-sole-type-${soleType.value.toLowerCase()}`}
                        >
                          {soleType.label}
                        </button>
                      ))}
                    </div>
                    {isOtherSoleType && (
                      <FormControl>
                        <Input
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value)}
                          placeholder="Enter sole type / سول ٹائپ لکھیں"
                          className="mt-2 h-14 text-base font-medium"
                          dir="auto"
                          autoFocus
                          data-testid="input-sole-type-other"
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Purchase Price / خرید قیمت</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        onChange={(event) => field.onChange(digitsOnly(event.target.value))}
                        onPaste={(event) => {
                          event.preventDefault();
                          field.onChange(digitsOnly(event.clipboardData.getData("text")));
                        }}
                        className="h-14 text-base font-medium"
                        data-testid="input-purchase-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="space-y-4 rounded-xl border border-border bg-card p-4">
              <h2 className="text-base font-bold">Size & Quantity / سائز اور تعداد</h2>

              <div>
                <p className="mb-2 text-base font-semibold">Size / سائز</p>
                <div className="flex flex-wrap gap-2">
                  {[...STANDARD_SIZES, OTHER_SIZE].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        if (size !== OTHER_SIZE) setCustomSize("");
                      }}
                      className={`min-h-[48px] min-w-[52px] rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                        selectedSize === size
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground active:bg-muted"
                      }`}
                      data-testid={`chip-size-${size.toLowerCase()}`}
                    >
                      {size === OTHER_SIZE ? "Other / دیگر" : size}
                    </button>
                  ))}
                </div>
                {isOtherSize && (
                  <Input
                    value={customSize}
                    onChange={(event) => setCustomSize(digitsOnly(event.target.value))}
                    onPaste={(event) => {
                      event.preventDefault();
                      setCustomSize(digitsOnly(event.clipboardData.getData("text")));
                    }}
                    placeholder="Enter size / سائز لکھیں"
                    className="mt-2 h-14 text-base font-medium"
                    inputMode="numeric"
                    autoFocus
                    data-testid="input-size-custom"
                  />
                )}
              </div>

              <div>
                <p className="mb-2 text-base font-semibold">Quantity / تعداد *</p>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted p-2">
                  <HoldButton
                    label="Decrease quantity / تعداد کم کریں"
                    onStep={() => changeSizeQuantity(-1)}
                    disabled={(Number(sizeQuantity) || 0) <= 0}
                  >
                    <Minus size={22} />
                  </HoldButton>
                  <Input
                    value={sizeQuantity}
                    onChange={(event) => setSizeQuantity(digitsOnly(event.target.value))}
                    onPaste={(event) => {
                      event.preventDefault();
                      setSizeQuantity(digitsOnly(event.clipboardData.getData("text")));
                    }}
                    onBlur={() => {
                      if (sizeQuantity === "") setSizeQuantity("0");
                    }}
                    onFocus={(event) => event.target.select()}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="h-14 border-0 bg-card text-center text-3xl font-bold tabular-nums focus-visible:ring-2"
                    data-testid="input-size-quantity"
                  />
                  <HoldButton label="Increase quantity / تعداد بڑھائیں" onStep={() => changeSizeQuantity(1)}>
                    <Plus size={22} />
                  </HoldButton>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleAddSize}
                disabled={!canAddSize}
                className="h-14 w-full border border-emerald-700 bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:border-emerald-300 disabled:bg-emerald-300"
                data-testid="button-add-size"
              >
                <Plus size={18} />
                <span>Add Size / سائز شامل کریں</span>
              </Button>

              <div className="rounded-xl border border-border bg-muted p-4">
                <h3 className="mb-3 text-base font-bold">Added Sizes / شامل کیے گئے سائز</h3>
                {sizes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No size added yet / ابھی کوئی سائز شامل نہیں</p>
                ) : (
                  <div className="space-y-2">
                    {sizes.map((item) => (
                      <div key={item.size} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-card px-3 py-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Size / سائز</p>
                            <p className="text-xl font-bold tabular-nums">{item.size}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Quantity / تعداد</p>
                            <p className="text-xl font-bold tabular-nums">{item.quantity}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSizes((current) => current.filter((entry) => entry.size !== item.size))}
                          className="inline-flex min-h-[44px] w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive active:bg-destructive/20"
                          aria-label={`Remove size ${item.size}`}
                          data-testid={`button-remove-size-${item.size}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border-2 border-primary/30 bg-primary/10 p-4 text-center">
                <p className="text-base font-bold">
                  Total Stock / کل اسٹاک: {totalStock}
                </p>
              </div>
            </section>

            <Button type="submit" disabled={isPending} className="w-full h-16 text-lg font-bold" data-testid="button-submit">
              {isPending
                ? "Saving / محفوظ ہو رہا ہے..."
                : mode === "new"
                  ? "Save Shoe / محفوظ کریں"
                  : "Save Changes / تبدیلیاں محفوظ کریں"}
            </Button>
          </form>
        </Form>
      </div>

      <AlertDialog open={Boolean(pendingHref)} onOpenChange={(open) => !open && setPendingHref(null)}>
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-2xl">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle>Unsaved changes / تبدیلیاں محفوظ نہیں ہوئیں</AlertDialogTitle>
            <AlertDialogDescription>
              Aap ne changes ki hain. Save karke jana hai ya changes hata kar move karna hai?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel className="h-12" onClick={() => setPendingHref(null)}>
              Stay / رکیں
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-12 border border-border bg-card text-foreground hover:bg-muted"
              onClick={() => {
                const href = pendingHref ?? "/stock";
                setPendingHref(null);
                continueNavigation(href);
              }}
            >
              Discard / چھوڑ دیں
            </AlertDialogAction>
            <Button
              type="button"
              disabled={isPending}
              className="h-12"
              onClick={() => {
                const href = pendingHref ?? "/stock";
                void form.handleSubmit((values) => onSubmit(values, href))();
              }}
            >
              {isPending ? "Saving..." : "Save & Move / محفوظ کریں"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

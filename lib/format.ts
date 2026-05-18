/** Format a number as Pakistani Rupees */
export function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/** Format a date string or Date as DD/MM/YYYY */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB"); // DD/MM/YYYY
}

export function formatSoleType(soleType?: string | null): string {
  const labels: Record<string, string> = {
    Pandar: "پنڈار سول",
    Mix: "مکس سول",
    CM: "سی ایم",
    Walker: "واکر",
  };

  if (!soleType) return "-";
  return labels[soleType] ?? soleType;
}

/** Get today as YYYY-MM-DD */
export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Get current month as YYYY-MM */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

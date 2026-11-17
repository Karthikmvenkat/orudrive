import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function inr(value: number, opts?: { compact?: boolean }) {
  if (opts?.compact && value >= 1000) {
    return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatDate(
  date: string | Date,
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" },
) {
  return new Intl.DateTimeFormat("en-IN", opts).format(new Date(date));
}

export function nightsBetween(start: string | Date, end: string | Date) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

/** Chart ticks arrive as YYYY-MM or YYYY-MM-DD bucket keys. */
export function bucketLabel(key: string) {
  const iso = key.length === 7 ? `${key}-01` : key;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function discountPercent(base: number, price: number) {
  if (!base || price >= base) return 0;
  return Math.round(((base - price) / base) * 100);
}

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Rating({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Star
        className={cn(
          "fill-brand-500 text-brand-500",
          size === "sm" ? "size-3.5" : "size-4",
        )}
      />
      <span
        className={cn(
          "font-semibold text-ink",
          size === "sm" ? "text-[12px]" : "text-sm",
        )}
      >
        {value.toFixed(1)}
      </span>
      {typeof count === "number" && (
        <span className="text-[12px] text-muted">({count.toLocaleString("en-IN")})</span>
      )}
    </span>
  );
}

export function StatStrip({
  items,
  className,
}: {
  items: { value: string; label: string; icon?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-8 gap-y-5", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5">
          {item.icon && <span className="text-brand-600">{item.icon}</span>}
          <div className="leading-tight">
            <p className="font-display text-base font-bold text-ink">{item.value}</p>
            <p className="text-[11.5px] text-muted">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

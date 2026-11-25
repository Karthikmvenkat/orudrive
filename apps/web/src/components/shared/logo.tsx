import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  tone = "dark",
  compact = false,
}: {
  className?: string;
  tone?: "dark" | "light";
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="SavariGo home"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-[11px] bg-linear-to-br from-brand-400 to-brand-600 shadow-[0_6px_14px_-8px_rgba(255,196,0,0.9)] transition-transform duration-300 group-hover:-rotate-6">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
          <path
            d="M17.5 6.4c-1.5-1.6-3.9-2.1-6-1.5-2.2.6-3.5 2.3-3 4 .4 1.5 2 2.1 3.6 2.5l2.1.5c1.5.4 2.2 1 1.9 1.9-.3.9-1.5 1.5-2.9 1.4-1.8-.1-3.1-.9-4-2"
            stroke="#242424"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M18.6 3.6c.6-1 1.7-1.5 2.8-1.3-.1 1.2-.9 2.2-2 2.6"
            fill="#8a6400"
          />
        </svg>
      </span>
      {!compact && (
        <span
          className={cn(
            "font-display text-[21px] font-extrabold leading-none tracking-[-0.03em]",
            tone === "dark" ? "text-forest" : "text-white",
          )}
        >
          Savari<span className={tone === "dark" ? "text-brand-600" : "text-brand-300"}>Go</span>
        </span>
      )}
    </Link>
  );
}

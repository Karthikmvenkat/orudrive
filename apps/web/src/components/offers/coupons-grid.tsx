"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Tag } from "lucide-react";
import { toast } from "sonner";
import { coupons } from "@/lib/data/content";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/utils";
import { cn } from "@/lib/utils";

const accents = {
  brand: {
    card: "from-brand-600 to-brand-500",
    badge: "bg-white/20",
  },
  forest: {
    card: "from-forest to-[#14452a]",
    badge: "bg-brand-500/25",
  },
  amber: {
    card: "from-[#b06d0a] to-[#d99a2b]",
    badge: "bg-white/20",
  },
} as const;

const filters = [
  { label: "All offers", value: "all" },
  { label: "Bikes & scooters", value: "scooter" },
  { label: "Cars", value: "car" },
] as const;

type Filter = (typeof filters)[number]["value"];

export function CouponsGrid() {
  const [filter, setFilter] = useState<Filter>("all");
  const [copied, setCopied] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (filter === "all") return coupons;
    return coupons.filter(
      (coupon) => coupon.appliesTo === "all" || coupon.appliesTo.includes(filter),
    );
  }, [filter]);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success(`Coupon ${code} copied`);
      window.setTimeout(() => setCopied((current) => (current === code ? null : current)), 2200);
    } catch {
      toast.info(`Use code ${code} at checkout`);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition",
              filter === item.value
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-line bg-surface text-ink-soft hover:border-brand-200 hover:text-brand-700",
            )}
          >
            {item.label}
          </button>
        ))}
        <span className="ml-auto text-[11.5px] text-muted">
          {visible.length} {visible.length === 1 ? "offer" : "offers"} available
        </span>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((coupon) => {
          const accent = accents[coupon.accent];
          const isCopied = copied === coupon.code;
          return (
            <article
              key={coupon.code}
              className="group overflow-hidden rounded-panel border border-line bg-surface shadow-soft"
            >
              <div
                className={cn(
                  "relative bg-linear-to-br px-5 py-5 text-white",
                  accent.card,
                )}
              >
                <div className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full border-[18px] border-white/10" />
                <div className="relative flex items-start justify-between gap-3">
                  <span className={cn("grid size-10 place-items-center rounded-xl", accent.badge)}>
                    <Tag className="size-5" />
                  </span>
                  {coupon.highlight && (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-forest">
                      {coupon.highlight}
                    </span>
                  )}
                </div>
                <p className="relative mt-5 font-display text-[30px] font-extrabold leading-none tracking-[-0.03em]">
                  {coupon.type === "percent" ? `${coupon.value}% OFF` : `${inr(coupon.value)} OFF`}
                </p>
                <p className="relative mt-2 text-[12.5px] text-white/80">
                  {coupon.maxDiscount
                    ? `Up to ${inr(coupon.maxDiscount)} on orders above ${inr(coupon.minOrder)}`
                    : `On orders above ${inr(coupon.minOrder)}`}
                </p>
              </div>

              <div className="p-5">
                <h2 className="text-[14.5px] font-bold text-ink">{coupon.title}</h2>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                  {coupon.description}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong bg-page/70 p-2.5 pl-3.5">
                  <span className="font-display text-[15px] font-extrabold tracking-[0.08em] text-ink">
                    {coupon.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(coupon.code)}
                    aria-label={`Copy coupon code ${coupon.code}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition",
                      isCopied
                        ? "bg-brand-500 text-white"
                        : "bg-white text-brand-700 shadow-soft hover:bg-brand-50",
                    )}
                  >
                    {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {isCopied ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
                  <span>Valid till {coupon.validTill}</span>
                  <span className="font-medium text-ink-soft">
                    {coupon.appliesTo === "all"
                      ? "All vehicles"
                      : coupon.appliesTo
                          .map((type) =>
                            type === "car" ? "Cars" : type === "scooter" ? "Scooters" : "Motorcycles",
                          )
                          .join(" · ")}
                  </span>
                </div>

                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <Link
                    href={
                      coupon.appliesTo === "all"
                        ? "/bikes-scooters"
                        : coupon.appliesTo.includes("car")
                          ? "/cars"
                          : "/bikes-scooters"
                    }
                  >
                    Book with {coupon.code}
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

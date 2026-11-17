import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tint = "mint" | "sky" | "peach" | "lilac" | "butter";

const tints: Record<Tint, string> = {
  mint: "bg-tint-mint text-brand-700",
  sky: "bg-tint-sky text-sky-700",
  peach: "bg-tint-peach text-orange-700",
  lilac: "bg-tint-lilac text-violet-700",
  butter: "bg-tint-butter text-amber-700",
};

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tint?: Tint;
  delta?: { value: string; direction: "up" | "down" };
  href?: string;
}

export function StatCard({ label, value, hint, icon: Icon, tint = "mint", delta, href }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn("grid size-10 place-items-center rounded-xl", tints[tint])}
          aria-hidden="true"
        >
          <Icon className="size-[19px]" strokeWidth={1.9} />
        </span>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-bold",
              delta.direction === "up"
                ? "bg-brand-50 text-brand-700"
                : "bg-red-50 text-red-600",
            )}
          >
            {delta.direction === "up" ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {delta.value}
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-[26px] font-extrabold leading-none tracking-[-0.035em] text-ink tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[12.5px] font-semibold text-ink-soft">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </>
  );

  const className =
    "rounded-panel border border-line bg-surface p-4 transition hover:border-brand-200 hover:shadow-soft";

  return href ? (
    <Link href={href} className={cn(className, "block")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function StatGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 3 | 4 | 5 | 6;
  className?: string;
}) {
  const grid = {
    3: "md:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-2 lg:grid-cols-5",
    6: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  }[columns];
  return <div className={cn("grid grid-cols-1 gap-3", grid, className)}>{children}</div>;
}

export function PortalTabs({
  tabs,
  active,
  basePath,
  search,
  param = "tab",
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  basePath: string;
  search?: Record<string, string | undefined>;
  param?: string;
}) {
  const href = (key: string) => {
    const params = new URLSearchParams();
    for (const [paramKey, value] of Object.entries(search ?? {})) {
      if (value && paramKey !== param && paramKey !== "page") params.set(paramKey, value);
    }
    if (key !== tabs[0]?.key) params.set(param, key);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <div className="flex flex-wrap gap-1.5" role="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={href(tab.key)}
            role="tab"
            aria-selected={selected}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition",
              selected
                ? "border-forest bg-forest text-white"
                : "border-line bg-surface text-ink-soft hover:border-brand-300 hover:text-brand-700",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                  selected ? "bg-white/20 text-white" : "bg-page text-muted",
                )}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function QuickActions({
  title = "Quick Actions",
  actions,
  className,
}: {
  title?: string;
  actions: { label: string; href: string; icon: LucideIcon; description?: string }[];
  className?: string;
}) {
  return (
    <section className={cn("rounded-panel border border-line bg-surface", className)}>
      <header className="border-b border-line px-5 py-4">
        <h2 className="text-[14px] font-bold text-ink">{title}</h2>
      </header>
      <div className="grid gap-2 p-4 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-start gap-3 rounded-xl border border-line bg-page/50 px-3.5 py-3 transition hover:border-brand-300 hover:bg-brand-50/60"
          >
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-brand-700 shadow-[0_1px_2px_rgba(13,31,20,0.06)]">
              <action.icon className="size-4" strokeWidth={1.9} />
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-bold text-ink">{action.label}</span>
              {action.description && (
                <span className="block text-[11px] leading-snug text-muted">
                  {action.description}
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AttentionStrip({
  items,
  className,
}: {
  items: { label: string; value: number; href: string }[];
  className?: string;
}) {
  const visible = items.filter((item) => item.value > 0);
  if (visible.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-panel border border-amber-200 bg-tint-butter px-4 py-3",
        className,
      )}
    >
      <p className="text-[12.5px] font-semibold text-amber-900">Pending approvals:</p>
      {visible.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="rounded-full bg-surface px-3 py-1 text-[11.5px] font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          {item.value} {item.label.toLowerCase()}
        </Link>
      ))}
    </div>
  );
}

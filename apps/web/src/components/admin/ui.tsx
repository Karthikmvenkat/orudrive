import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, Info, TriangleAlert } from "lucide-react";
import { cn, inr } from "@/lib/utils";

export { inr };

export function when(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function whenTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function AdminNotice({
  notice,
  error,
}: {
  notice?: string;
  error?: string;
}) {
  if (!notice && !error) return null;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] font-medium",
        error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-brand-200 bg-brand-50 text-brand-800",
      )}
    >
      {error ? (
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{error ?? notice}</span>
    </div>
  );
}

export function AdminPage({
  title,
  description,
  action,
  notice,
  error,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  notice?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-overline mb-1.5">Admin</p>
          <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-ink sm:text-[28px]">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <AdminNotice notice={notice} error={error} />
      {children}
    </div>
  );
}

export function AdminPanel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-panel border border-line bg-surface",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="text-[14px] font-bold text-ink">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-[12px] text-muted">{description}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function AdminTable({
  head,
  minWidth = 720,
  children,
}: {
  head: React.ReactNode[];
  minWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-line bg-page/70 text-[10px] uppercase tracking-[0.08em] text-muted">
            {head.map((cell, index) => (
              <th key={index} className="px-5 py-3 font-bold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function AdminEmpty({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center text-[13px] text-muted">
        <Info className="mx-auto mb-2 size-5 text-line-strong" />
        {children}
      </td>
    </tr>
  );
}

export function AdminPager({
  page,
  totalPages,
  path,
  params,
}: {
  page: number;
  totalPages: number;
  path: string;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) query.set(key, value);
    }
    if (target > 1) query.set("page", String(target));
    const search = query.toString();
    return search ? `${path}?${search}` : path;
  };
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-[12px] text-muted">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-700"
          >
            <ChevronLeft className="size-3.5" /> Prev
          </Link>
        ) : (
          <span className="inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 font-semibold opacity-40">
            <ChevronLeft className="size-3.5" /> Prev
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={href(page + 1)}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-700"
          >
            Next <ChevronRight className="size-3.5" />
          </Link>
        ) : (
          <span className="inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 font-semibold opacity-40">
            Next <ChevronRight className="size-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}

export function AdminAction({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function AdminDrawer({
  label,
  children,
  tone = "light",
}: {
  label: string;
  children: React.ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <details className="group">
      <summary
        className={cn(
          "inline-flex h-9 cursor-pointer select-none list-none items-center gap-1.5 rounded-full border px-4 text-[12px] font-semibold transition",
          tone === "dark"
            ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
            : "border-line bg-surface text-ink-soft hover:border-brand-300 hover:text-brand-700",
        )}
      >
        {label}
        <ChevronRight className="size-3.5 transition group-open:rotate-90" />
      </summary>
      <div className="mt-3 rounded-xl border border-line bg-page/50 p-4">
        {children}
      </div>
    </details>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export const adminInput =
  "h-10 w-full rounded-xl border border-line bg-surface px-3 text-[13px] text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:opacity-60";

export const adminTextarea =
  "min-h-20 w-full resize-y rounded-xl border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

export const adminButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-forest px-5 text-[13px] font-semibold text-white transition hover:bg-brand-900 disabled:opacity-50";

export const adminButtonSoft =
  "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-[12px] font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-50";

export const adminButtonDanger =
  "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 text-[12px] font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardHero({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="label-overline mb-1.5">{eyebrow}</p>}
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-ink sm:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Crumb({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[12px] font-medium text-muted transition hover:text-brand-700"
    >
      {children}
      <ChevronRight className="size-3.5" />
    </Link>
  );
}

export function Panel({
  children,
  className,
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={cn("overflow-hidden rounded-panel border border-line bg-surface", className)}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          {title && <h2 className="text-[14px] font-bold text-ink">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

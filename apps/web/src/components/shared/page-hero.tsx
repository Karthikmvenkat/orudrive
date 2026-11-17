import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/shared/section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: { label: string; href: string; variant?: "primary" | "outline" }[];
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-line bg-linear-to-b from-brand-50/80 via-white to-white",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-32 size-[380px] rounded-full bg-brand-100/50 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-1/4 size-[300px] rounded-full bg-mint/60 blur-3xl"
        aria-hidden
      />
      <div className="container-page relative py-9 lg:py-14">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-6" />}
        <div className="max-w-3xl">
          {eyebrow && <p className="label-overline mb-2.5">{eyebrow}</p>}
          <h1 className="font-display text-[30px] font-extrabold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[40px] lg:text-[46px]">
            {title}
          </h1>
          {description && (
            <p className="mt-3.5 max-w-2xl text-[14.5px] leading-relaxed text-muted sm:text-[15.5px]">
              {description}
            </p>
          )}
          {actions && (
            <div className="mt-6 flex flex-wrap gap-2.5">
              {actions.map((action, i) => (
                <Button
                  key={action.href}
                  asChild
                  variant={action.variant ?? (i === 0 ? "primary" : "outline")}
                  size="lg"
                >
                  <Link href={action.href}>
                    {action.label}
                    {i === 0 && <ArrowRight className="size-4" />}
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

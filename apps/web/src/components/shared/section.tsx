import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Breadcrumbs({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5 text-[12px] text-muted", className)}>
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3 text-line-strong" />}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-brand-700">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  action?: { label: string; href: string } | React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        align === "center" && "md:flex-col md:items-center md:text-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
        {eyebrow && <p className="label-overline mb-2.5">{eyebrow}</p>}
        <h2 className="text-[26px] font-extrabold leading-[1.15] text-ink sm:text-[32px]">
          {title}
        </h2>
        {description && (
          <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action &&
        (typeof action === "object" && "label" in action && "href" in action ? (
          <Button asChild variant="ghost" className="group self-start px-0 text-brand-700 hover:bg-transparent md:self-auto">
            <Link href={action.href}>
              {action.label}
              <ChevronRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        ) : (
          action
        ))}
    </div>
  );
}

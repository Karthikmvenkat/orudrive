import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold leading-none",
  {
    variants: {
      variant: {
        brand: "bg-brand-50 text-brand-700",
        solid: "bg-brand-500 text-ink",
        success: "bg-brand-50 text-brand-700",
        warning: "bg-amber-50 text-amber-700",
        danger: "bg-red-50 text-red-600",
        info: "bg-sky-50 text-sky-700",
        neutral: "bg-page text-ink-soft",
        outline: "border border-line-strong bg-surface text-ink-soft",
        dark: "bg-forest text-white",
      },
      size: {
        sm: "px-2 py-1 text-[10px]",
        md: "px-2.5 py-1.5 text-[11px]",
        lg: "px-3 py-1.5 text-xs",
      },
    },
    defaultVariants: { variant: "brand", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

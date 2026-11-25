import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 [&_svg]:size-4 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-500 text-ink shadow-[0_8px_20px_-10px_rgba(255,196,0,0.9)] hover:bg-brand-600",
        dark: "bg-forest text-white hover:bg-brand-900",
        outline:
          "border border-line-strong bg-surface text-ink hover:border-brand-300 hover:bg-brand-50",
        soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
        ghost: "text-ink-soft hover:bg-page hover:text-ink",
        danger: "bg-danger text-white hover:bg-red-700",
        link: "text-brand-600 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        md: "h-11 px-5",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-10 [&_svg]:size-[18px]",
        iconSm: "size-8 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

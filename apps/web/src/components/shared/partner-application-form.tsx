"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/;

const applicationSchema = z.object({
  tradingName: z.string().min(2, "Enter the name customers will see"),
  legalName: z.string().max(120, "Keep the legal entity under 120 characters").optional(),
  email: z.string().email("Enter a valid email address"),
  phone: z
    .string()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  gstin: z.string().regex(GSTIN, "Enter the 15-character GSTIN registered to this business"),
  city: z.string().max(60).optional(),
  state: z.string().max(60).optional(),
  addressLine1: z.string().max(200, "Keep the address under 200 characters").optional(),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(72, "Passwords are at most 72 characters"),
});

type ApplicationValues = z.infer<typeof applicationSchema>;

interface Receipt {
  partnerCode: string;
  tradingName: string;
}

export function PartnerApplicationForm() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { city: "Puducherry", state: "Puducherry" },
  });

  const onSubmit = async (values: ApplicationValues) => {
    try {
      const response = await fetch("/api/proxy/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingName: values.tradingName.trim(),
          ...(values.legalName?.trim() ? { legalName: values.legalName.trim() } : {}),
          email: values.email.trim(),
          phone: values.phone.replace(/[\s-]/g, ""),
          gstin: values.gstin.trim().toUpperCase(),
          ...(values.city?.trim() ? { city: values.city.trim() } : {}),
          ...(values.state?.trim() ? { state: values.state.trim() } : {}),
          ...(values.addressLine1?.trim()
            ? { addressLine1: values.addressLine1.trim() }
            : {}),
          password: values.password,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Could not submit your application");
      }
      setReceipt({
        partnerCode: payload?.partnerCode ?? "",
        tradingName: payload?.tradingName ?? values.tradingName.trim(),
      });
      reset(undefined, { keepValues: true });
      toast.success("Application received — it is now in the approval queue");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not submit your application",
      );
    }
  };

  if (receipt) {
    return (
      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <PartyPopper className="size-5" strokeWidth={1.8} />
        </span>
        <h2 className="mt-4 text-[17px] font-extrabold text-ink">
          {receipt.tradingName} is in the queue
        </h2>
        <p className="mt-1 text-[12px] text-muted">
          Partner code{" "}
          <span className="font-mono font-bold text-ink">{receipt.partnerCode}</span>. Nothing is
          live until Master Admin approves it.
        </p>
        <ol className="mt-5 space-y-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          <li>1. Sign in on the partner portal with the email and password you just used.</li>
          <li>2. Upload your GST certificate and KYC proof against that account.</li>
          <li>3. Master Admin verifies both, then approves the account and sets your commission.</li>
          <li>4. Add your vehicles, upload each RC and insurance, and they go live one by one.</li>
        </ol>
        <Button asChild size="lg" className="mt-5 w-full">
          <Link href="/login?next=%2Fpartner">Go to partner sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-panel border border-line bg-surface p-5 sm:p-6"
    >
      <h2 className="text-[17px] font-extrabold text-ink">Apply to become a rental partner</h2>
      <p className="mt-1 text-[12px] text-muted">
        Creates your partner login straight away. It stays pending until Master Admin verifies your
        GST and KYC documents.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="partner-trading">Trading name</Label>
          <Input
            id="partner-trading"
            placeholder="Pondy Rides"
            {...register("tradingName")}
          />
          {errors.tradingName && (
            <p className="mt-1 text-[11px] text-danger">{errors.tradingName.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="partner-legal">Legal entity (optional)</Label>
          <Input
            id="partner-legal"
            placeholder="Pondy Rides Pvt Ltd"
            {...register("legalName")}
          />
          {errors.legalName && (
            <p className="mt-1 text-[11px] text-danger">{errors.legalName.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="partner-email">Login email</Label>
          <Input
            id="partner-email"
            type="email"
            autoComplete="email"
            placeholder="owner@pondyrides.in"
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-[11px] text-danger">{errors.email.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="partner-phone">Mobile number</Label>
          <Input
            id="partner-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            {...register("phone")}
          />
          {errors.phone && (
            <p className="mt-1 text-[11px] text-danger">{errors.phone.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="partner-gstin">GSTIN</Label>
          <Input
            id="partner-gstin"
            placeholder="33ABCDE1234F1Z5"
            maxLength={15}
            className="font-mono uppercase"
            {...register("gstin")}
          />
          {errors.gstin && (
            <p className="mt-1 text-[11px] text-danger">{errors.gstin.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="partner-password">Login password</Label>
          <Input
            id="partner-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 10 characters"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-[11px] text-danger">{errors.password.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="partner-city">City</Label>
          <Input id="partner-city" placeholder="Puducherry" {...register("city")} />
        </div>
        <div>
          <Label htmlFor="partner-state">State</Label>
          <Input id="partner-state" placeholder="Puducherry" {...register("state")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="partner-address">Business address (optional)</Label>
          <Input id="partner-address" placeholder="12 Renganathan Street" {...register("addressLine1")} />
        </div>
      </div>

      <Button type="submit" size="lg" className="mt-5 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Submitting…
          </>
        ) : (
          "Submit partner application"
        )}
      </Button>
      <p className="mt-2.5 text-center text-[10.5px] text-muted">
        No joining fee. The platform commission is set per partner account after approval.
      </p>
    </form>
  );
}

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/;

// The API accepts 2 MB, but the whole application travels as one JSON body
// through Vercel and base64 adds a third — 1.5 MB each keeps the request down.
const MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024;
const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const documentInputClass =
  "field-base h-11 w-full py-0 text-[12.5px] file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-brand-700";

const documentIssue = (label: string, file: File): string | null => {
  if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
    return `${label}: use a PDF, JPG or PNG`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${label}: keep the file under 1.5 MB`;
  }
  return null;
};

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

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const [, encoded = ""] = String(reader.result).split(",");
      resolve(encoded);
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function documentPayload(file: File, dataBase64: string) {
  return { fileName: file.name, mediaType: file.type, dataBase64 };
}

interface Receipt {
  partnerCode: string;
  tradingName: string;
}

export function PartnerApplicationForm() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const gstInput = useRef<HTMLInputElement>(null);
  const kycInput = useRef<HTMLInputElement>(null);
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
    const gstFile = gstInput.current?.files?.[0];
    const kycFile = kycInput.current?.files?.[0];
    if (!gstFile || !kycFile) {
      setDocumentError("Attach both the GST certificate and the KYC proof");
      return;
    }
    const issue = documentIssue("GST certificate", gstFile) ?? documentIssue("KYC proof", kycFile);
    if (issue) {
      setDocumentError(issue);
      return;
    }
    setDocumentError(null);

    try {
      const [gstBase64, kycBase64] = await Promise.all([
        toBase64(gstFile),
        toBase64(kycFile),
      ]);
      const response = await fetch("/api/proxy/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingName: values.tradingName.trim(),
          ...(values.legalName?.trim() ? { legalName: values.legalName.trim() } : {}),
          email: values.email.trim(),
          phone: values.phone.replace(/[\s-]/g, ""),
          gstin: values.gstin.trim().toUpperCase(),
          gstDocument: documentPayload(gstFile, gstBase64),
          kycDocument: documentPayload(kycFile, kycBase64),
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
          <li>
            1. Your GST certificate and KYC proof travelled with this application, so there is
            nothing left to upload.
          </li>
          <li>2. Master Admin reads both copies, then approves the account and sets your commission.</li>
          <li>
            3. Sign-in opens on approval. Until then the portal stays closed to this login.
          </li>
          <li>4. After that, add your vehicles with each RC and insurance, and they go live one by one.</li>
        </ol>
        <Link
          href="/contact"
          className="mt-5 inline-block text-[12.5px] font-semibold text-brand-700 hover:underline"
        >
          Questions about your application? Contact the team
        </Link>
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
        Attach the GST certificate and KYC proof below — Master Admin reads them with the
        application. Sign-in opens once the account is approved.
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
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="partner-gst-file">GST certificate</Label>
            <input
              id="partner-gst-file"
              ref={gstInput}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className={documentInputClass}
              onChange={() => setDocumentError(null)}
            />
          </div>
          <div>
            <Label htmlFor="partner-kyc-file">KYC proof</Label>
            <input
              id="partner-kyc-file"
              ref={kycInput}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className={documentInputClass}
              onChange={() => setDocumentError(null)}
            />
          </div>
          {documentError && (
            <p className="text-[11px] text-danger sm:col-span-2">{documentError}</p>
          )}
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

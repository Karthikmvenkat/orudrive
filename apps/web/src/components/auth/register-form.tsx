"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/controls";
import { useSession } from "@/lib/session";

const registerSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .regex(/[A-Za-z]/, "Include at least one letter")
    .regex(/\d/, "Include at least one number"),
  terms: z.boolean().refine((v) => v, "Please accept the terms to continue"),
});

type RegisterValues = z.infer<typeof registerSchema>;

interface PendingVerification {
  email: string;
  devCode?: string;
  expiresInMinutes: number;
}

export function RegisterForm() {
  const router = useRouter();
  const { refresh } = useSession();
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState<PendingVerification | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { terms: false },
  });

  const onSubmit = async (values: RegisterValues) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.replace(/[\s-]/g, ""),
          password: values.password,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Could not create your account");
      }
      setPending({
        email: values.email.trim(),
        devCode: payload?.verification?.devCode,
        expiresInMinutes: payload?.verification?.expiresInMinutes ?? 10,
      });
      toast.success("Account created — verify your email to continue");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create your account",
      );
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pending) return;
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code from your email");
      return;
    }
    setVerifying(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pending.email,
          purpose: "EMAIL_VERIFICATION",
          code,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "That code is invalid or expired");
      }

      const login = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pending.email,
          password: getValues("password"),
        }),
      });
      if (!login.ok) {
        toast.success("Email verified — please sign in");
        router.push("/login");
        return;
      }
      await refresh();
      toast.success("Welcome to SavariGo");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (!pending) return;
    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pending.email,
          purpose: "EMAIL_VERIFICATION",
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Could not resend the code");
      }
      if (payload?.devCode) {
        setPending({ ...pending, devCode: payload.devCode });
      }
      toast.success("A fresh code is on its way");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend the code");
    } finally {
      setResending(false);
    }
  };

  if (pending) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setPending(null)}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted transition hover:text-brand-700"
        >
          <ArrowLeft className="size-3.5" /> Edit details
        </button>
        <span className="mt-4 grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
          <Mail className="size-5" />
        </span>
        <h1 className="mt-3 text-[26px] font-extrabold tracking-[-0.03em] text-ink sm:text-[30px]">
          Verify your email
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-ink">{pending.email}</span>. It expires
          in {pending.expiresInMinutes} minutes.
        </p>

        {pending.devCode && (
          <p className="mt-3 rounded-lg border border-dashed border-brand-200 bg-brand-50/60 px-3 py-2 text-[11.5px] text-brand-800">
            Development code:{" "}
            <span className="font-mono font-bold tracking-[0.2em]">{pending.devCode}</span>
          </p>
        )}

        <form onSubmit={verify} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="otp">Verification code</Label>
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="pl-9 font-mono tracking-[0.35em]"
              />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={verifying}>
            {verifying ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Verifying…
              </>
            ) : (
              "Verify & continue"
            )}
          </Button>
        </form>

        <button
          type="button"
          onClick={resend}
          disabled={resending}
          className="mt-3 w-full text-center text-[12px] font-medium text-muted transition hover:text-brand-700 disabled:opacity-60"
        >
          {resending ? "Sending a new code…" : "Didn't get the code? Resend"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink sm:text-[30px]">
        Create your account
      </h1>
      <p className="mt-1.5 text-[13px] text-muted">
        Book faster, save vehicles and track every ride in one place.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3.5">
        <div>
          <Label htmlFor="name">Full name</Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input id="name" placeholder="Karthik M" className="pl-9" {...register("name")} />
          </div>
          {errors.name && <p className="mt-1 text-[11px] text-danger">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              id="email"
              type="email"
              placeholder="you@email.com"
              className="pl-9"
              {...register("email")}
            />
          </div>
          {errors.email && <p className="mt-1 text-[11px] text-danger">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="phone">Phone number</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              id="phone"
              inputMode="tel"
              placeholder="+91 98765 43210"
              className="pl-9"
              {...register("phone")}
            />
          </div>
          {errors.phone && <p className="mt-1 text-[11px] text-danger">{errors.phone.message}</p>}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              id="password"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="pl-9 pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-page"
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-[11px] text-danger">{errors.password.message}</p>
          )}
        </div>

        <label className="flex items-start gap-2.5 pt-1 text-[11.5px] leading-relaxed text-muted">
          <Checkbox
            className="mt-0.5"
            checked={watch("terms")}
            onCheckedChange={(v) => setValue("terms", v === true, { shouldValidate: true })}
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-medium text-brand-700 underline">
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-brand-700 underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.terms && <p className="text-[11px] text-danger">{errors.terms.message}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="mt-5 text-center text-[12.5px] text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}

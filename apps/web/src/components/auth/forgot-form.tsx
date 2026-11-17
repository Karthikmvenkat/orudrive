"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Could not send the reset code");
      }
      setDevCode(payload?.devCode);
      setSent(true);
      toast.success("Reset code sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reset code");
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit reset code");
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      toast.error("Password needs 8+ characters with a letter and a number");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword: password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Could not reset your password");
      }
      setDone(true);
      toast.success("Password updated — sign in with your new password");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset your password");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-600">
          <CheckCircle2 className="size-7" />
        </span>
        <h1 className="mt-4 text-[24px] font-extrabold tracking-[-0.03em] text-ink">
          Password updated
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Your password has been changed and all other sessions were signed out.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (sent) {
    return (
      <div>
        <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
          <KeyRound className="size-5" />
        </span>
        <h1 className="mt-3 text-[24px] font-extrabold tracking-[-0.03em] text-ink sm:text-[28px]">
          Enter your reset code
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-ink">{email}</span>. It expires in 10
          minutes.
        </p>
        {devCode && (
          <p className="mt-3 rounded-lg border border-dashed border-brand-200 bg-brand-50/60 px-3 py-2 text-[11.5px] text-brand-800">
            Development code:{" "}
            <span className="font-mono font-bold tracking-[0.2em]">{devCode}</span>
          </p>
        )}

        <form onSubmit={reset} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="reset-code">Verification code</Label>
            <Input
              id="reset-code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="font-mono tracking-[0.35em]"
            />
          </div>
          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ characters, a letter and a number"
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Updating…
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-3 w-full text-center text-[12px] font-medium text-muted hover:text-brand-700"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted transition hover:text-brand-700"
      >
        <ArrowLeft className="size-3.5" /> Back to login
      </Link>
      <h1 className="mt-4 text-[26px] font-extrabold tracking-[-0.03em] text-ink sm:text-[30px]">
        Reset your password
      </h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        Enter the email linked to your account and we&apos;ll send you a secure reset
        code.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="reset-email">Email address</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              id="reset-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="pl-9"
            />
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Sending code…
            </>
          ) : (
            "Send reset code"
          )}
        </Button>
      </form>

      <p className="mt-5 text-center text-[12px] text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Login instead
        </Link>
      </p>
    </div>
  );
}

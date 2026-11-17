import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { Logo } from "@/components/shared/logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.02fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src="/images/auth/auth-side.jpg"
          alt="Rider by the sea in Puducherry"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-forest via-forest/55 to-forest/10" />
        <div className="relative flex h-full flex-col justify-between p-9">
          <Logo tone="light" />
          <div className="max-w-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
              <Star className="size-3 fill-brand-300 text-brand-300" />
              4.8 from 10,000+ riders
            </span>
            <h1 className="mt-4 font-display text-[34px] font-extrabold leading-[1.08] tracking-[-0.03em] text-white">
              Your travel partner
              <br />
              for every journey.
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-white/70">
              Bikes, scooters, cars and professional drivers — booked in minutes
              across Puducherry.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-white/50">
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <span>© 2026 SavariGo</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col bg-white">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Logo className="lg:hidden" />
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-medium text-muted transition hover:text-brand-700"
          >
            <ArrowLeft className="size-3.5" /> Back to site
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <div className="w-full max-w-[404px]">{children}</div>
        </div>
      </div>
    </div>
  );
}

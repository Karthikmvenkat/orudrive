import Link from "next/link";
import { ArrowLeft, Bike, CarFront, Compass, Search } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

const suggestions = [
  { label: "Bike & scooter rentals", href: "/bikes-scooters", icon: Bike },
  { label: "Car rentals", href: "/cars", icon: CarFront },
  { label: "Bike taxi", href: "/bike-taxi", icon: Compass },
  { label: "Help centre", href: "/faq", icon: Search },
];

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-linear-to-b from-brand-50/70 via-white to-white">
      <div
        className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-brand-100/60 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-24 size-[360px] rounded-full bg-mint/70 blur-3xl"
        aria-hidden
      />

      <header className="container-page relative flex h-20 items-center">
        <Logo />
      </header>

      <main id="main" className="container-page relative flex flex-1 items-center py-12">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-display text-[92px] font-extrabold leading-none tracking-[-0.06em] text-brand-200 sm:text-[128px]">
            404
          </p>
          <h1 className="-mt-2 text-[26px] font-extrabold tracking-[-0.02em] text-ink sm:text-[32px]">
            This route doesn&apos;t exist
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-muted">
            The page may have moved, or the link might be missing a character. Let&apos;s get you
            back on the road.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <Button asChild size="lg">
              <Link href="/">
                <ArrowLeft className="size-4" /> Back to home
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/bikes-scooters">Browse vehicles</Link>
            </Button>
          </div>

          <div className="mt-9 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {suggestions.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col items-center gap-2 rounded-xl border border-line bg-surface/80 px-3 py-4 text-[11.5px] font-medium text-ink-soft backdrop-blur transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 hover:shadow-soft"
              >
                <item.icon className="size-4 text-brand-600" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

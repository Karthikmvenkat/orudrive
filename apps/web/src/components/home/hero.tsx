import Image from "next/image";
import { BadgeCheck, Headset, ReceiptText, ShieldCheck } from "lucide-react";
import { SearchPanel } from "@/components/shared/search-panel";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-brand-50/70 via-page/40 to-white" />
      <div
        className="pointer-events-none absolute -right-24 -top-32 size-[420px] rounded-full bg-brand-100/50 blur-3xl"
        aria-hidden
      />

      <div className="container-page relative grid items-center gap-8 pb-4 pt-8 lg:grid-cols-[1.02fr_1fr] lg:gap-10 lg:pb-0 lg:pt-12">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/80 px-3 py-1.5 text-[11.5px] font-semibold text-brand-700 shadow-sm">
            <BadgeCheck className="size-3.5" />
            Puducherry&apos;s Trusted Rental Platform
          </span>

          <h1 className="mt-5 font-display text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[52px] lg:text-[58px]">
            Your ride. Your city.
            <br />
            <span className="text-brand-500">Your freedom.</span>
          </h1>

          <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-muted sm:text-[15.5px]">
            Book bikes, scooters and cars for everyday rides and weekend
            escapes.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            {[
              { label: "Verified Vehicles", icon: ShieldCheck },
              { label: "Transparent Pricing", icon: ReceiptText },
              { label: "24/7 Support", icon: Headset },
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 text-[12.5px] font-medium text-ink-soft"
              >
                <span className="grid size-6 place-items-center rounded-full bg-brand-100 text-brand-700">
                  <item.icon className="size-3.5" />
                </span>
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border border-white/60 bg-page shadow-lift sm:aspect-[16/10] lg:aspect-[4/3.1]">
            <Image
              src="/images/hero/hero-main.jpg"
              alt="Scooter and car parked on a tree-lined Puducherry street with French colonial buildings"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>

      <div className="container-page relative z-10 -mt-2 pb-6 lg:-mt-10 lg:pb-8">
        <SearchPanel />
      </div>
    </section>
  );
}

export function StatsStrip() {
  const stats = [
    { value: "5,000+", label: "Rides Completed", icon: "bike" },
    { value: "50+", label: "Cities in India", icon: "pin" },
    { value: "4.8★", label: "Rider Rating", icon: "star" },
  ];

  return (
    <section className="border-y border-line bg-page/60">
      <div className="container-page grid grid-cols-1 divide-line py-5 sm:grid-cols-3 sm:divide-x">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-center gap-3 px-2 py-2">
            <StatIcon name={stat.icon} />
            <div className="leading-tight">
              <p className="font-display text-[15px] font-extrabold text-ink sm:text-base">
                {stat.value}
              </p>
              <p className="text-[11px] text-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    bike: (
      <>
        <circle cx="6" cy="17" r="3.2" />
        <circle cx="19" cy="17" r="3.2" />
        <path d="M9 17h6l-3-7H8l2-3h3l2 5" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.4" />
      </>
    ),
    star: (
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill={name === "star" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5 text-brand-500"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

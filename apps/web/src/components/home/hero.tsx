import Image from "next/image";
import Link from "next/link";
import { SearchPanel } from "@/components/shared/search-panel";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <h1 className="sr-only">
        Your ride. Your city. Your freedom.
      </h1>

      <div className="container-page relative pt-6 lg:pt-8">
        <div className="relative">
          <Image
            src="/images/hero/savarigo-banner.png"
            alt="Your ride, your freedom — rent bikes, cars and tow vehicles and book professional drivers with SavariGo"
            width={1434}
            height={344}
            priority
            sizes="(max-width: 1280px) 100vw, 1200px"
            className="h-auto w-full rounded-[18px] border border-line/60 shadow-lift lg:rounded-[22px]"
          />
          {/* The banner draws its own CTA, so the link sits on top of that artwork. */}
          <Link
            href="#search"
            aria-label="Start booking"
            className="absolute left-[3%] top-[72%] h-[24%] w-[20%] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <div
        id="search"
        className="container-page relative z-10 mt-4 scroll-mt-24 pb-6 lg:mt-6 lg:pb-8"
      >
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

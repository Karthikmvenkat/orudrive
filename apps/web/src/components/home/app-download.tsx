import { Check, Smartphone } from "lucide-react";
import { appFeatures } from "@/lib/data/content";
import { Logo } from "@/components/shared/logo";

const qrCells = Array.from({ length: 21 * 21 }, (_, i) => {
  const x = i % 21;
  const y = Math.floor(i / 21);
  const finder =
    (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
  if (finder) {
    const fx = x > 13 ? x - 14 : x;
    const fy = y > 13 ? y - 14 : y;
    return (fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5));
  }
  return (x * 7 + y * 13 + ((x * y) % 5)) % 3 === 0;
});

export function AppDownloadSection() {
  return (
    <section className="container-page pb-4 pt-6 lg:pb-10">
      <div className="relative overflow-hidden rounded-[26px] bg-tint-mint px-5 py-8 sm:px-8 lg:px-10 lg:py-0">
        <div className="pointer-events-none absolute -left-20 top-0 size-72 rounded-full bg-brand-100/70 blur-2xl" />

        <div className="relative grid items-end gap-8 lg:grid-cols-[300px_1fr_220px]">
          <div className="relative mx-auto hidden w-[240px] lg:block">
            <div className="relative h-[268px] overflow-hidden rounded-t-[32px] border-[7px] border-b-0 border-forest bg-white shadow-lift">
              <div className="flex items-center justify-between bg-white px-4 pb-2 pt-4">
                <Logo compact />
                <span className="rounded-full bg-brand-50 px-2 py-1 text-[8px] font-semibold text-brand-700">
                  Puducherry
                </span>
              </div>
              <div className="px-4">
                <p className="text-[9px] text-muted">Good morning,</p>
                <p className="text-[13px] font-bold text-ink">Karthik M</p>
                <div className="mt-3 rounded-xl border border-line bg-page/70 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[8.5px] font-semibold text-brand-700">
                      Active booking
                    </span>
                    <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[7px] font-bold text-white">
                      Upcoming
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] font-bold text-ink">Honda Activa 6G</p>
                  <p className="text-[8px] text-muted">10 Nov · 10:00 AM · Puducherry</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink">₹499</span>
                    <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[7.5px] font-semibold text-white">
                      View details
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-tint-peach p-2">
                    <p className="text-[7.5px] text-ink-soft/70">Book a ride</p>
                    <p className="text-[9px] font-bold text-ink">Scooters</p>
                  </div>
                  <div className="rounded-lg bg-tint-sky p-2">
                    <p className="text-[7.5px] text-ink-soft/70">Hire a</p>
                    <p className="text-[9px] font-bold text-ink">Driver</p>
                  </div>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex justify-around border-t border-line bg-white px-3 py-2 text-[7px] text-muted">
                {["Home", "Bookings", "Offers", "Account"].map((item, i) => (
                  <span key={item} className={i === 0 ? "font-semibold text-brand-600" : ""}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="py-2 text-center lg:py-10 lg:text-left">
            <p className="label-overline mb-2">Ride smarter</p>
            <h2 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[34px]">
              Get the <span className="text-brand-600">SavariGo</span> App
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-muted lg:mx-0">
              Book rides, manage bookings, get exclusive offers and more — all in
              one app.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2.5 lg:justify-start">
              <StoreBadge store="play" />
              <StoreBadge store="apple" />
            </div>

            <ul className="mt-5 grid grid-cols-1 gap-2 text-left sm:grid-cols-2">
              {appFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-[12.5px] font-medium text-ink-soft"
                >
                  <span className="grid size-4 place-items-center rounded-full bg-brand-500 text-white">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto flex flex-col items-center gap-2.5 pb-2 lg:pb-10">
            <div className="rounded-2xl border border-line bg-white p-3 shadow-soft">
              <div
                className="grid size-[126px] grid-cols-[repeat(21,1fr)] gap-[1px]"
                aria-label="QR code to download the SavariGo app"
                role="img"
              >
                {qrCells.map((on, i) => (
                  <span
                    key={i}
                    className={on ? "bg-forest" : "bg-white"}
                    style={{ aspectRatio: "1" }}
                  />
                ))}
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
              <Smartphone className="size-3.5" /> Scan to Download
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoreBadge({ store }: { store: "play" | "apple" }) {
  return (
    <a
      href="#"
      className="inline-flex items-center gap-2.5 rounded-xl bg-forest px-4 py-2 text-left text-white transition hover:bg-brand-900"
    >
      {store === "play" ? (
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
          <polygon points="3,2 15,12 3,22" fill="#00D7FE" />
          <polygon points="3,2 15,12 17.5,7.5" fill="#00F076" />
          <polygon points="3,22 15,12 17.5,16.5" fill="#FF3A44" />
          <polygon points="15,12 17.5,7.5 21.5,12 17.5,16.5" fill="#FFCE00" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
        </svg>
      )}
      <span className="leading-none">
        <span className="block text-[8.5px] font-medium uppercase tracking-wide text-white/70">
          {store === "play" ? "Get it on" : "Download on the"}
        </span>
        <span className="mt-0.5 block text-[13px] font-bold">
          {store === "play" ? "Google Play" : "App Store"}
        </span>
      </span>
    </a>
  );
}

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const services = [
  {
    title: "Rental Bikes",
    subtitle: "Ride the city",
    href: "/bikes-scooters",
    image: "/images/services/rental-bikes.png",
    alt: "Green scooter available for rent on SavariGo",
  },
  {
    title: "Rental Cars",
    subtitle: "Drive your way",
    href: "/cars",
    image: "/images/services/rental-cars.png",
    alt: "White sedan available for self-drive rent on SavariGo",
  },
  {
    title: "Rental Vans",
    subtitle: "Crew & cargo moves",
    href: "/vans",
    image: "/images/services/rental-vans.png",
    alt: "White passenger van available for rent on SavariGo",
  },
  {
    title: "Tow Vehicle",
    subtitle: "On-road assistance",
    href: "/tow-vehicle",
    image: "/images/services/tow-vehicle.png",
    alt: "Yellow flatbed tow truck carrying a car",
  },
  {
    title: "Acting Drivers",
    subtitle: "Professional support",
    href: "/driver-on-demand",
    image: "/images/services/acting-driver.png",
    alt: "SavariGo professional driver in a green uniform",
  },
  {
    title: "Mobile Puncher",
    subtitle: "On-the-spot service",
    href: "/mobile-puncher",
    image: "/images/services/mobile-puncher.png",
    alt: "Portable air compressor for on-the-spot tyre puncture repair",
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="scroll-mt-24 bg-page pb-2 pt-3">
      <div className="mx-auto w-[calc(100%-1rem)] max-w-[1600px] rounded-[20px] bg-surface px-4 pb-4 pt-4 shadow-soft sm:px-6 lg:px-8 lg:pb-5 lg:pt-5">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink sm:text-[21px]">
              <span className="h-5 w-1 shrink-0 rounded-full bg-brand-500" aria-hidden />
              Our Services
            </h2>
            <Link
              href="/how-it-works"
              className="group inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-700 transition hover:text-brand-800 sm:text-[12.5px]"
            >
              Explore All Services
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3">
            {services.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="group flex flex-col rounded-xl border border-line bg-[#fbf5e9] p-2.5 transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft"
              >
                <span className="relative block h-[64px] overflow-hidden sm:h-[72px]">
                  <Image
                    src={service.image}
                    alt={service.alt}
                    fill
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 230px"
                    className="object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                </span>
                <span className="mt-1.5 flex items-end justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block font-display text-[12px] font-extrabold leading-tight text-ink lg:text-[13px]">
                      {service.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-muted lg:text-[10.5px]">
                      {service.subtitle}
                    </span>
                  </span>
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-800 transition group-hover:bg-brand-500 group-hover:text-ink">
                    <ArrowRight className="size-3.5" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

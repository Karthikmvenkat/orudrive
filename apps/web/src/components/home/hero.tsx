import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-page">
      <h1 className="sr-only">Your Ride. Your Freedom.</h1>

      <div className="relative">
        <Image
          src="/images/hero/savarigo-hero.jpg"
          alt="Your ride, your freedom — rent bikes, cars and tow vehicles and book professional drivers with SavariGo"
          width={1717}
          height={397}
          priority
          sizes="100vw"
          className="h-auto w-full"
        />
        {/* The artwork draws its own CTA, so the link sits on top of that button. */}
        <Link
          href="#book"
          aria-label="Start booking"
          className="absolute left-[4%] top-[78%] h-[14%] w-[15%] min-h-[36px] min-w-[120px] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:min-h-0 sm:min-w-0"
        />
      </div>
    </section>
  );
}

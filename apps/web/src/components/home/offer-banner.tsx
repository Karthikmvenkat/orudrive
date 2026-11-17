"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Copy, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function OfferBanner() {
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText("SAVARI20");
      toast.success("Coupon SAVARI20 copied");
    } catch {
      toast.info("Use code SAVARI20 at checkout");
    }
  };

  return (
    <section className="container-page py-6 lg:py-10">
      <div className="relative overflow-hidden rounded-[26px] bg-linear-to-br from-brand-600 via-brand-500 to-brand-400 px-5 py-8 text-white shadow-[0_24px_60px_-30px_rgba(76,175,43,0.65)] sm:px-8 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute -right-10 -top-24 size-64 rounded-full border-[36px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-white/10 blur-2xl" />

        <div className="relative grid items-center gap-6 lg:grid-cols-[1.05fr_0.75fr_0.85fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur">
              <Tag className="size-3" /> Limited Time Offer
            </span>
            <h2 className="mt-3 text-[30px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[38px]">
              Up to 20% OFF
              <br />
              on Bike &amp; Scooter Rentals
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {["No Security Hassle", "Flexible Duration", "Instant Booking"].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full bg-forest/25 px-2.5 py-1 text-[10.5px] font-medium"
                >
                  <Check className="size-3" /> {item}
                </span>
              ))}
            </div>
            <Button asChild variant="dark" className="mt-5 bg-white text-brand-700 hover:bg-brand-50">
              <Link href="/bikes-scooters">Book Now</Link>
            </Button>
          </div>

          <div className="relative hidden h-[190px] lg:block">
            <div className="absolute inset-x-2 bottom-0 top-2 overflow-hidden rounded-2xl border border-white/25 bg-white/10">
              <Image
                src="/images/vehicles/honda-activa-6g.jpg"
                alt="Scooter available with the SAVARI20 offer"
                fill
                sizes="320px"
                className="object-cover"
              />
            </div>
            <span className="absolute -right-1 top-0 rotate-6 rounded-lg bg-forest px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
              Save 20%
            </span>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-white/45 bg-white/12 p-4 backdrop-blur-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/70">
              Use Coupon Code
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="font-display text-[26px] font-extrabold tracking-[0.06em]">
                SAVARI20
              </p>
              <button
                type="button"
                onClick={copyCode}
                aria-label="Copy coupon code SAVARI20"
                className="grid size-9 place-items-center rounded-full bg-white text-brand-700 transition hover:scale-105"
              >
                <Copy className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-[11.5px] text-white/80">
              &amp; get 20% OFF up to ₹300 on your booking
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-white/20 pt-2.5 text-[10.5px] text-white/70">
              <span>Valid till 30 Nov 2026</span>
              <Link href="/offers" className="font-semibold text-white hover:underline">
                All offers →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

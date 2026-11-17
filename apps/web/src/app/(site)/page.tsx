import type { Metadata } from "next";
import { Hero, StatsStrip } from "@/components/home/hero";
import { CategoriesSection } from "@/components/home/categories-section";
import { VehicleCarousel } from "@/components/vehicles/vehicle-carousel";
import { OfferBanner } from "@/components/home/offer-banner";
import { HowItWorksSection } from "@/components/home/how-it-works-section";
import { DestinationsSection } from "@/components/home/destinations-section";
import { BenefitsSection } from "@/components/home/benefits-section";
import { AppDownloadSection } from "@/components/home/app-download";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { FaqSection } from "@/components/home/faq-section";
import { toVehicle } from "@/lib/api/adapters";
import { safeVehicles } from "@/lib/api/catalogue";
import { featuredVehicles, vehicles } from "@/lib/data/vehicles";

export const metadata: Metadata = {
  title: "SavariGo — Your city. Your ride. Your freedom.",
  description:
    "Rent bikes, scooters and cars, book a bike taxi or hire a professional driver in Puducherry. Verified vehicles, transparent pricing and 24/7 support.",
};

export default async function HomePage() {
  const apiVehicles = await safeVehicles({ sort: "popular", limit: 8 });
  const popular = apiVehicles.length
    ? apiVehicles
        .slice()
        .sort(
          (a, b) =>
            Number(b.popular) - Number(a.popular) || b.rating - a.rating,
        )
        .slice(0, 4)
        .map(toVehicle)
    : featuredVehicles.length
      ? featuredVehicles
      : vehicles.slice(0, 4);

  return (
    <>
      <Hero />
      <StatsStrip />
      <CategoriesSection />
      <VehicleCarousel
        vehicles={popular}
        title="Popular rides near you"
        description="Top-rated and most booked vehicles in Pondicherry."
        href="/vehicles"
      />
      <OfferBanner />
      <HowItWorksSection />
      <DestinationsSection />
      <BenefitsSection />
      <AppDownloadSection />
      <TestimonialsSection />
      <FaqSection />
    </>
  );
}

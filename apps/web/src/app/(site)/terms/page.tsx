import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { LegalShell, type LegalSection } from "@/components/shared/legal-shell";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that govern SavariGo rentals, bike taxis and driver services — eligibility, deposits, cancellation and refund rules, vehicle use and liability.",
};

const sections: LegalSection[] = [
  {
    id: "eligibility",
    title: "1. Eligibility and your account",
    paragraphs: [
      "You must be at least 18 years old with a valid two-wheeler licence to rent a scooter or motorcycle, or 21 years old with a valid four-wheeler licence to rent a car. One licensed rider or driver must be named per booking; the vehicle may not be handed to anyone else.",
      "You are responsible for keeping your login details private and for every booking made from your account. Tell us immediately if you suspect unauthorised use.",
    ],
    list: [
      "Documents must be original, valid and in your own name.",
      "Foreign licences require a valid International Driving Permit.",
      "We may decline or cancel a booking if documents cannot be verified.",
    ],
  },
  {
    id: "bookings",
    title: "2. Bookings and confirmation",
    paragraphs: [
      "A booking is confirmed only when you receive a booking code from SavariGo. Prices shown during search are held for the duration of checkout and include the rental, applicable taxes and any extras you select.",
      "Vehicle photographs are representative of the model. Where a specific vehicle is unavailable, we may offer an equivalent or better vehicle at the same price, and you may decline it for a full refund.",
    ],
  },
  {
    id: "pricing",
    title: "3. Pricing, taxes and security deposit",
    paragraphs: [
      "Daily rates are calculated per 24-hour period from the pickup time. Two-wheelers carry a refundable deposit of ₹1,000–₹2,500 and cars ₹4,000–₹8,000. The exact deposit is shown before payment.",
      "Deposits are pre-authorised online or collected at pickup and released within 3 working days of return, after a joint inspection. We never store card details; payments are processed by a PCI-DSS compliant payment partner.",
    ],
  },
  {
    id: "cancellation",
    title: "4. Cancellation and refunds",
    paragraphs: [
      "You can cancel from your dashboard at any time. Refunds are calculated from the pickup time, not the booking time, and are processed to the original payment method within 5–7 working days of approval.",
    ],
    list: [
      "More than 24 hours before pickup: 100% refund of the rental amount.",
      "Between 24 and 6 hours before pickup: 50% of the rental amount is refunded.",
      "Under 6 hours before pickup, or no-show: the first day's rent is non-refundable.",
      "Security deposits are always refunded in full unless damage or traffic penalties apply.",
      "If SavariGo cancels a confirmed booking, you receive a 100% refund plus any delivery fee paid.",
    ],
  },
  {
    id: "use",
    title: "5. Vehicle use and traffic rules",
    paragraphs: [
      "Vehicles must be used lawfully, with a valid licence, and only on roads suitable for the vehicle. Helmets must be worn by both riders on two-wheelers at all times.",
    ],
    list: [
      "No racing, stunting, off-roading, towing or use for hire/reward.",
      "No driving under the influence of alcohol or drugs.",
      "Traffic fines, towing charges and parking penalties are payable by the renter.",
      "Pets must travel in carriers; smoking and open flames are prohibited in cars.",
    ],
  },
  {
    id: "damage",
    title: "6. Damage, theft and insurance",
    paragraphs: [
      "Every vehicle is insured for third-party liability and offers the coverage stated on the vehicle page. You remain responsible for the deductible, and for damage caused by prohibited use or negligence — including lost keys and missing helmets.",
      "Report any accident, theft or breakdown to us immediately. Do not attempt repairs or settle with third parties without our written approval, or coverage may be affected.",
    ],
  },
  {
    id: "fuel",
    title: "7. Fuel, charging and mileage",
    paragraphs: [
      "Petrol vehicles are handed over and must be returned at the same fuel level; a refuelling charge applies otherwise. Electric vehicles come charged to 100% with a portable charger, and should be returned with at least 20% charge.",
      "Daily rentals include the mileage limit shown on the vehicle page. Extra kilometres are billed at ₹6–₹12 per km depending on the vehicle.",
    ],
  },
  {
    id: "late-return",
    title: "8. Late returns and extensions",
    paragraphs: [
      "Need more time? Extend from your dashboard before the return time, subject to availability. Without an approved extension, late returns are billed hourly up to a maximum of one additional day's rent per day late.",
    ],
  },
  {
    id: "travel",
    title: "9. Travel outside Puducherry",
    paragraphs: [
      "Travel within Tamil Nadu and the Union Territory of Puducherry is permitted. Trips beyond 150 km from Puducherry require intimation so we can extend insurance coverage. Crossing into other states without intimation voids coverage and may attract a penalty.",
    ],
  },
  {
    id: "services",
    title: "10. Bike taxi and driver services",
    paragraphs: [
      "Bike taxi fares are fixed per route and displayed before you book; waiting time beyond 5 minutes and tolls or parking are billed at actuals. Driver services include the driver's night allowance where stated, but not fuel, tolls or parking.",
      "Captains and drivers are independent partners verified by SavariGo. Riders and drivers must treat each other with respect; we may suspend accounts for harassment or unsafe conduct.",
    ],
  },
  {
    id: "liability",
    title: "11. Liability",
    paragraphs: [
      "SavariGo acts as a booking and fleet-management platform. To the extent permitted by law, our liability for any claim is limited to the total rental amount paid for the affected booking. We are not liable for indirect losses such as missed flights, lost earnings or personal belongings left in a vehicle.",
      "Nothing in these terms limits liability that cannot be excluded under applicable Indian law.",
    ],
  },
  {
    id: "law",
    title: "12. Governing law and changes",
    paragraphs: [
      "These terms are governed by the laws of India, and disputes are subject to the exclusive jurisdiction of the courts of Puducherry. We may update these terms from time to time; the version in force is the one published when you make a booking.",
      <>
        For support, visit <Link href="/contact">Contact Us</Link>. See also our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </>,
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms & Conditions"
        description="The rules that keep every ride fair, safe and predictable — for you and the people who lend you the keys."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Terms & Conditions" }]}
      />
      <LegalShell
        updated="1 November 2026"
        intro={
          <p>
            These terms apply to every booking made on SavariGo, including self-drive rentals,
            bike taxis and driver services. By confirming a booking you accept them. Plain-language
            summaries are shown in the app, but this document is the binding version.
          </p>
        }
        sections={sections}
      />
    </>
  );
}

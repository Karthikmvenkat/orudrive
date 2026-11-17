import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { LegalShell, type LegalSection } from "@/components/shared/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How SavariGo collects, uses and protects your personal information across rentals, bike taxis and driver bookings — and the choices you have.",
};

const sections: LegalSection[] = [
  {
    id: "collect",
    title: "1. What we collect",
    paragraphs: [
      "We collect only what we need to verify your identity, provide the ride and keep you safe on the road.",
    ],
    list: [
      "Account details: name, email, mobile number and password (stored hashed).",
      "Identity documents: driving licence and one government photo ID, reviewed for verification.",
      "Booking details: pickup and drop locations, dates, vehicle and trip history.",
      "Payment records: amount, method and transaction reference. We never receive or store full card numbers or CVV.",
      "Technical data: device type, browser, IP address and pages visited on SavariGo.",
    ],
  },
  {
    id: "use",
    title: "2. How we use your information",
    paragraphs: [
      "Your information is used to confirm bookings, hand over vehicles, process payments and refunds, provide support, prevent fraud and meet legal obligations. We also use aggregated, de-identified data to plan fleet availability.",
      "With your consent, we may send offers and ride updates by email, SMS or WhatsApp. Every message includes an opt-out, and marketing consent is never a condition of booking.",
    ],
  },
  {
    id: "documents",
    title: "3. Identity documents",
    paragraphs: [
      "Licence and ID images are used solely to verify eligibility and insurance requirements. Access is restricted to trained verification staff, and images are deleted 90 days after the last completed booking or account closure, unless a legal hold applies.",
    ],
  },
  {
    id: "payments",
    title: "4. Payments",
    paragraphs: [
      "Payments are processed by a PCI-DSS compliant payment partner and UPI providers. Card details are entered directly with the payment processor over an encrypted connection and are never stored on SavariGo servers. We retain only the transaction reference, amount and status needed for refunds and accounting.",
    ],
  },
  {
    id: "cookies",
    title: "5. Cookies and analytics",
    paragraphs: [
      "We use essential cookies to keep you signed in and to remember your search. With consent, we use privacy-respecting analytics to understand which pages help riders book. You can clear or block cookies in your browser; essential cookies are required for checkout.",
    ],
  },
  {
    id: "sharing",
    title: "6. Who we share data with",
    list: [
      "Vehicle partners and captains receive only the details needed to complete your ride.",
      "Payment processors receive the data required to process your payment.",
      "Insurers receive trip and incident information when a claim is made.",
      "Government or law enforcement where required by law or to protect safety.",
      "Technology providers under contract, bound by confidentiality and data-processing terms.",
    ],
  },
  {
    id: "retention",
    title: "7. How long we keep it",
    paragraphs: [
      "Booking and payment records are kept for 8 years as required by Indian tax law. Support conversations are kept for 24 months. Account data is deleted or anonymised within 90 days of a verified deletion request, unless retention is legally required.",
    ],
  },
  {
    id: "rights",
    title: "8. Your rights",
    paragraphs: [
      "Under the Digital Personal Data Protection Act, 2023 you may access, correct, or request deletion of your personal data, withdraw consent, and nominate someone to exercise your rights.",
      <>
        To make a request, email <a href="mailto:privacy@savarigo.com">privacy@savarigo.com</a>{" "}
        from your registered address. We respond within 30 days and may ask you to verify your
        identity first.
      </>,
    ],
  },
  {
    id: "security",
    title: "9. How we protect your data",
    paragraphs: [
      "Data is encrypted in transit and at rest. Access follows least-privilege rules, is logged, and is reviewed quarterly. Staff who handle documents complete privacy training. If a breach affects your data, we notify you and the Data Protection Board as required.",
    ],
  },
  {
    id: "children",
    title: "10. Children",
    paragraphs: [
      "SavariGo accounts are for people aged 18 and above. We do not knowingly collect personal data from children. If you believe a child has created an account, contact us and we will remove it.",
    ],
  },
  {
    id: "updates",
    title: "11. Changes and contact",
    paragraphs: [
      "We may update this policy as our services change. Material changes will be announced by email or in-app before they take effect.",
      <>
        Data protection queries: <a href="mailto:privacy@savarigo.com">privacy@savarigo.com</a>.
        For general support see <Link href="/contact">Contact Us</Link> and our{" "}
        <Link href="/terms">Terms &amp; Conditions</Link>.
      </>,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        description="What we collect, why we collect it, and how you stay in control. Written to be read — not to hide behind."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]}
      />
      <LegalShell
        updated="1 November 2026"
        intro={
          <p>
            SavariGo handles personal data to verify riders, hand over vehicles and keep every trip
            safe. This policy explains what we collect, how long we keep it and the choices you
            have. It applies to savarigo.com, the SavariGo app and our support channels.
          </p>
        }
        sections={sections}
      />
    </>
  );
}

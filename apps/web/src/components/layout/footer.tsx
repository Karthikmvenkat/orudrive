import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/shared/logo";

const columns = [
  {
    title: "Quick Links",
    links: [
      { label: "Home", href: "/" },
      { label: "Bike & Scooter Rental", href: "/bikes-scooters" },
      { label: "Car Rental", href: "/cars" },
      { label: "Tow Vehicle", href: "/tow-vehicle" },
      { label: "Mobile Puncher", href: "/mobile-puncher" },
      { label: "Bike Taxi", href: "/bike-taxi" },
      { label: "Driver On-Demand", href: "/driver-on-demand" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Offers & Coupons", href: "/offers" },
      { label: "List Your Vehicle", href: "/list-your-vehicle" },
      { label: "Careers", href: "/about#careers" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Contact Us", href: "/contact" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cancellation & Refund", href: "/terms#cancellation" },
    ],
  },
];

const socials = [
  { label: "Instagram", icon: "instagram", href: "#" },
  { label: "Facebook", icon: "facebook", href: "#" },
  { label: "X", icon: "x", href: "#" },
  { label: "YouTube", icon: "youtube", href: "#" },
  { label: "LinkedIn", icon: "linkedin", href: "#" },
] as const;

function SocialIcon({ name }: { name: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "size-4",
    "aria-hidden": true,
  };
  switch (name) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path
            d="M14.5 8.5H17V5h-2.5A4.5 4.5 0 0 0 10 9.5V12H7.5v3.5H10V21h3.5v-5.5H16l.6-3.5H13.5V9.5c0-.6.4-1 1-1Z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M4.5 4.5 19.5 19.5M19.5 4.5 4.5 19.5" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="2.5" y="6" width="19" height="12" rx="4" />
          <path d="m10.5 9.6 5 2.4-5 2.4z" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M7.5 10.5V16M7.5 7.6v.01M11.5 16v-3a2.2 2.2 0 0 1 4.4 0V16" />
        </svg>
      );
  }
}

export function Footer() {
  return (
    <footer className="bg-forest text-white">
      <div className="container-page py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,0.8fr)_1.1fr] lg:gap-8">
          <div className="max-w-xs">
            <Logo tone="light" />
            <p className="mt-4 text-[13px] leading-relaxed text-white/60">
              Your trusted mobility partner for bike, scooter and car rentals, bike
              taxis and professional driver services across Puducherry.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="grid size-9 place-items-center rounded-full border border-white/12 bg-white/5 text-white/70 transition hover:border-brand-400/60 hover:bg-brand-500 hover:text-white"
                >
                  <SocialIcon name={social.icon} />
                </a>
              ))}
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white/90">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-white/60 transition hover:text-brand-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white/90">
              Contact Us
            </h3>
            <ul className="mt-4 space-y-3 text-[13px] text-white/60">
              <li>
                <a href="tel:+919876543210" className="flex items-center gap-2.5 transition hover:text-brand-300">
                  <Phone className="size-3.5 text-brand-400" />
                  +91 98765 43210
                </a>
              </li>
              <li>
                <a href="mailto:support@savarigo.com" className="flex items-center gap-2.5 transition hover:text-brand-300">
                  <Mail className="size-3.5 text-brand-400" />
                  support@savarigo.com
                </a>
              </li>
              <li className="flex items-start gap-2.5 leading-relaxed">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand-400" />
                12, Rue Suffren, White Town,
                <br />
                Puducherry 605001, India
              </li>
            </ul>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="flex items-center gap-2 text-[11.5px] text-white/70">
                <span className="size-1.5 animate-pulse rounded-full bg-brand-400" />
                Support online · 24/7
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-white/50">
            © 2026 SavariGo. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 text-[11px] text-white/40 sm:flex">
              <span className="rounded border border-white/15 px-2 py-0.5">UPI</span>
              <span className="rounded border border-white/15 px-2 py-0.5">Visa</span>
              <span className="rounded border border-white/15 px-2 py-0.5">Mastercard</span>
              <span className="rounded border border-white/15 px-2 py-0.5">Razorpay</span>
            </div>
            <select
              aria-label="Language"
              className="rounded-lg border border-white/15 bg-forest px-2.5 py-1.5 text-[11.5px] text-white/70 outline-none"
              defaultValue="en"
            >
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
              <option value="hi">हिन्दी</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
}

import type { Metadata } from "next";
import {
  Clock,
  Headset,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { ContactForm } from "@/components/shared/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Call, WhatsApp or email SavariGo — 24/7 support for bookings, payments, vehicle issues and partnerships in Puducherry.",
};

const channels = [
  {
    icon: Phone,
    label: "Call us",
    value: "+91 98765 43210",
    href: "tel:+919876543210",
    detail: "Average wait under 40 seconds",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "Chat with support",
    href: "https://wa.me/919876543210",
    detail: "Best for sharing photos and documents",
  },
  {
    icon: Mail,
    label: "Email",
    value: "support@savarigo.com",
    href: "mailto:support@savarigo.com",
    detail: "Replies within 2 hours",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Real people. Round the clock."
        description="A booking issue at midnight or a question about documents — our Puducherry-based team is awake and ready to help."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact Us" }]}
      />

      <section className="container-page py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <ContactForm />

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {channels.map((channel) => (
                <a
                  key={channel.label}
                  href={channel.href}
                  className="group rounded-panel border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <channel.icon className="size-4" />
                  </span>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {channel.label}
                  </p>
                  <p className="mt-0.5 text-[13.5px] font-bold text-ink transition group-hover:text-brand-700">
                    {channel.value}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-muted">{channel.detail}</p>
                </a>
              ))}
            </div>

            <div className="rounded-panel border border-line bg-surface p-5">
              <h2 className="flex items-center gap-2 text-[14px] font-bold text-ink">
                <MapPin className="size-4 text-brand-600" /> Visit the hub
              </h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                12, Rue Suffren, White Town,
                <br />
                Puducherry 605001, India
              </p>
              <div className="relative mt-4 h-32 overflow-hidden rounded-xl bg-brand-50">
                <div
                  className="absolute inset-0 opacity-70"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(255,196,0,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,196,0,0.12) 1px, transparent 1px)",
                    backgroundSize: "26px 26px",
                  }}
                  aria-hidden
                />
                <div
                  className="absolute -left-6 top-14 h-3 w-48 -rotate-6 rounded-full bg-white/70"
                  aria-hidden
                />
                <div
                  className="absolute -right-4 top-20 h-2.5 w-40 rotate-12 rounded-full bg-white/70"
                  aria-hidden
                />
                <span className="absolute left-1/2 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand-500 text-ink shadow-lift ring-4 ring-white">
                  <MapPin className="size-4" />
                </span>
                <span className="absolute bottom-2.5 left-3 rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-ink-soft">
                  Rock Beach · 4 min walk
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[11.5px] text-muted">
                <Clock className="size-3.5 text-brand-600" />
                Hubs open 7:00 am – 11:00 pm · Support 24/7
              </div>
            </div>

            <div className="rounded-panel border border-brand-100 bg-brand-50/60 p-5">
              <h2 className="flex items-center gap-2 text-[13.5px] font-bold text-brand-900">
                <ShieldCheck className="size-4 text-brand-700" /> Travelling right now?
              </h2>
              <p className="mt-1.5 text-[12px] leading-relaxed text-brand-900/80">
                For breakdowns, call the number above and press 1. Keep your booking code handy —
                we can arrange roadside assistance or a replacement vehicle immediately.
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-[11.5px] font-semibold text-brand-800">
                <Headset className="size-3.5" /> 24/7 breakdown line
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

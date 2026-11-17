"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Headset, Mail, MessageCircle, Search } from "lucide-react";
import { faqs } from "@/lib/data/content";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const groups = ["All", "Booking & docs", "Payments & refunds", "On the road"] as const;
type Group = (typeof groups)[number];

const groupFor: Record<number, Group> = {
  0: "Booking & docs",
  1: "Booking & docs",
  2: "Payments & refunds",
  3: "Payments & refunds",
  4: "Payments & refunds",
  5: "On the road",
  6: "On the road",
  7: "On the road",
  8: "On the road",
  9: "Booking & docs",
};

export function FaqExplorer() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<Group>("All");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs
      .map((faq, index) => ({ ...faq, index }))
      .filter((faq) => group === "All" || groupFor[faq.index] === group)
      .filter(
        (faq) =>
          !q ||
          faq.question.toLowerCase().includes(q) ||
          faq.answer.toLowerCase().includes(q),
      );
  }, [query, group]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search help articles…"
            aria-label="Search frequently asked questions"
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-4 text-[13px] text-ink outline-none transition placeholder:text-muted focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {groups.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setGroup(item)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition",
                group === item
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-line bg-surface text-ink-soft hover:border-brand-200 hover:text-brand-700",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.45fr_0.55fr] lg:items-start">
        <div className="rounded-panel border border-line bg-surface px-5 lg:px-7">
          {results.length > 0 ? (
            <Accordion key={`${group}-${query}`} type="single" collapsible className="w-full">
              {results.map((faq) => (
                <AccordionItem key={faq.question} value={`item-${faq.index}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="py-16 text-center">
              <p className="text-[14px] font-bold text-ink">No answers match “{query}”</p>
              <p className="mt-1 text-[12.5px] text-muted">
                Try a shorter phrase, or ask our team directly.
              </p>
              <Link
                href="/contact"
                className="mt-4 inline-flex text-[12.5px] font-semibold text-brand-700 hover:underline"
              >
                Contact support →
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-panel border border-line bg-surface p-5">
            <h2 className="text-[14px] font-bold text-ink">Still stuck?</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              Real people, around the clock. Average first reply: 90 seconds.
            </p>
            <div className="mt-4 space-y-2">
              <a
                href="tel:+919876543210"
                className="flex items-center gap-2.5 rounded-lg bg-page px-3 py-2.5 text-[12.5px] font-medium text-ink-soft transition hover:text-brand-700"
              >
                <Headset className="size-4 text-brand-600" /> +91 98765 43210
              </a>
              <a
                href="mailto:support@savarigo.com"
                className="flex items-center gap-2.5 rounded-lg bg-page px-3 py-2.5 text-[12.5px] font-medium text-ink-soft transition hover:text-brand-700"
              >
                <Mail className="size-4 text-brand-600" /> support@savarigo.com
              </a>
              <Link
                href="/contact"
                className="flex items-center gap-2.5 rounded-lg bg-page px-3 py-2.5 text-[12.5px] font-medium text-ink-soft transition hover:text-brand-700"
              >
                <MessageCircle className="size-4 text-brand-600" /> Send us a message
              </Link>
            </div>
          </div>

          <div className="rounded-panel border border-line bg-brand-50/60 p-5">
            <p className="label-overline mb-2">Where to find things</p>
            <ul className="space-y-2 text-[12px] text-ink-soft">
              <li>
                <Link href="/terms#cancellation" className="hover:text-brand-700 hover:underline">
                  Cancellation &amp; refund policy
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-brand-700 hover:underline">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/dashboard/bookings" className="hover:text-brand-700 hover:underline">
                  Your bookings
                </Link>
              </li>
              <li>
                <Link href="/dashboard/payments" className="hover:text-brand-700 hover:underline">
                  Payment history
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

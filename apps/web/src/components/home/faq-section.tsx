import Link from "next/link";
import { ArrowRight, Headset, Mail } from "lucide-react";
import type { Faq } from "@/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/lib/data/content";

export function FaqSection({
  items = faqs.slice(0, 6),
  title = "Questions, answered",
  description = "Everything about documents, deposits, cancellations and support.",
  showAllLink = true,
}: {
  items?: Faq[];
  title?: string;
  description?: string;
  showAllLink?: boolean;
}) {
  return (
    <section className="container-page py-12 lg:py-16">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div>
          <p className="label-overline mb-2">FAQ</p>
          <h2 className="text-[27px] font-extrabold leading-tight text-ink sm:text-[32px]">
            {title}
          </h2>
          <p className="mt-2.5 max-w-sm text-[13.5px] leading-relaxed text-muted">
            {description}
          </p>
          {showAllLink && (
            <Link
              href="/faq"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:underline"
            >
              View all FAQs <ArrowRight className="size-3.5" />
            </Link>
          )}

          <div className="mt-7 rounded-panel border border-line bg-page/70 p-5">
            <p className="text-[13px] font-bold text-ink">Still need help?</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              Our support team replies within minutes, 24 hours a day.
            </p>
            <div className="mt-3.5 space-y-2">
              <a
                href="tel:+919876543210"
                className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 text-[12.5px] font-medium text-ink-soft shadow-soft transition hover:text-brand-700"
              >
                <Headset className="size-4 text-brand-600" /> +91 98765 43210
              </a>
              <a
                href="mailto:support@savarigo.com"
                className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 text-[12.5px] font-medium text-ink-soft shadow-soft transition hover:text-brand-700"
              >
                <Mail className="size-4 text-brand-600" /> support@savarigo.com
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-panel border border-line bg-surface px-5 lg:px-7">
          <Accordion type="single" collapsible className="w-full">
            {items.map((faq, i) => (
              <AccordionItem key={faq.question} value={`item-${i}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

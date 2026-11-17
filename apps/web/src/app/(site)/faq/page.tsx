import type { Metadata } from "next";
import { PageHero } from "@/components/shared/page-hero";
import { FaqExplorer } from "@/components/shared/faq-explorer";

export const metadata: Metadata = {
  title: "FAQ & Support",
  description:
    "Answers about booking, documents, deposits, cancellations, refunds, breakdowns and delivery across SavariGo rentals and rides in Puducherry.",
};

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="Help centre"
        title="Answers, without the hold music."
        description="Search the questions we hear most, or reach a real person on call, WhatsApp or email — 24 hours a day."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
      />
      <section className="container-page py-10 lg:py-14">
        <FaqExplorer />
      </section>
    </>
  );
}

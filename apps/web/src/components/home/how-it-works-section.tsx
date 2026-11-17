import { CalendarCheck, CheckCircle2, KeyRound, Search } from "lucide-react";
import { howItWorks } from "@/lib/data/content";
import { Reveal } from "@/components/shared/reveal";

const icons = {
  search: Search,
  calendar: CalendarCheck,
  key: KeyRound,
  check: CheckCircle2,
} as const;

export function HowItWorksSection({
  eyebrow = "Simple by design",
  title = "How SavariGo Works",
  description = "Book your ride in just 4 simple steps. No queues, no calls, no paperwork at the counter.",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <section className="container-page py-12 lg:py-16">
      <div className="mx-auto max-w-xl text-center">
        <p className="label-overline mb-2">{eyebrow}</p>
        <h2 className="text-[27px] font-extrabold leading-tight text-ink sm:text-[32px]">
          {title}
        </h2>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">{description}</p>
      </div>

      <div className="relative mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <div
          className="absolute left-[12%] right-[12%] top-7 hidden border-t border-dashed border-brand-200 lg:block"
          aria-hidden
        />
        {howItWorks.map((step, i) => {
          const Icon = icons[step.icon as keyof typeof icons];
          return (
            <Reveal key={step.step} delay={i * 0.08} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="relative grid size-14 place-items-center rounded-full border border-brand-200 bg-white text-brand-600 shadow-[0_10px_24px_-16px_rgba(76,175,43,0.8)]">
                  <Icon className="size-6" strokeWidth={1.8} />
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-brand-500 text-[9px] font-bold text-white">
                    {step.step}
                  </span>
                </div>
                <h3 className="mt-3.5 text-[14.5px] font-bold text-ink">{step.title}</h3>
                <p className="mt-1.5 max-w-[220px] text-[12px] leading-relaxed text-muted">
                  {step.description}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

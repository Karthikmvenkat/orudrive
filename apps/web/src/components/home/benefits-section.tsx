import { Headset, RefreshCcw, ShieldCheck, ReceiptText } from "lucide-react";
import { trustPoints } from "@/lib/data/content";
import { Reveal } from "@/components/shared/reveal";

const icons = {
  shield: ShieldCheck,
  receipt: ReceiptText,
  headset: Headset,
  refresh: RefreshCcw,
} as const;

export function BenefitsSection() {
  return (
    <section className="border-y border-line bg-page/60 py-10">
      <div className="container-page grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {trustPoints.map((point, i) => {
          const Icon = icons[point.icon as keyof typeof icons];
          return (
            <Reveal key={point.title} delay={i * 0.05}>
              <div className="flex h-full items-start gap-3 rounded-xl p-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-soft">
                  <Icon className="size-5" strokeWidth={1.8} />
                </span>
                <div>
                  <h3 className="text-[13.5px] font-bold text-ink">{point.title}</h3>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                    {point.description}
                  </p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

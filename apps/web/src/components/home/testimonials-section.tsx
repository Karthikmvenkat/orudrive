import { Quote, Star } from "lucide-react";
import { testimonials } from "@/lib/data/content";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section";

export function TestimonialsSection() {
  return (
    <section className="container-page py-12 lg:py-16">
      <SectionHeading
        eyebrow="Rider stories"
        title="10,000+ rides. 4.8 average rating."
        description="Real reviews from riders who booked scooters, cars and drivers with SavariGo."
        action={{ label: "Read all reviews", href: "/about#reviews" }}
      />

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {testimonials.slice(0, 3).map((review, i) => (
          <Reveal key={review.name} delay={i * 0.07}>
            <figure className="flex h-full flex-col rounded-panel border border-line bg-surface p-5">
              <div className="flex items-center justify-between">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={
                        idx < review.rating
                          ? "size-3.5 fill-brand-500 text-brand-500"
                          : "size-3.5 fill-line text-line"
                      }
                    />
                  ))}
                </div>
                <Quote className="size-6 fill-brand-100 text-brand-100" />
              </div>
              <blockquote className="mt-3 flex-1 text-[13px] leading-relaxed text-ink-soft">
                “{review.quote}”
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-2.5 border-t border-line pt-3.5">
                <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-800">
                  {review.initials}
                </span>
                <div>
                  <p className="text-[12.5px] font-semibold text-ink">{review.name}</p>
                  <p className="text-[10.5px] text-muted">
                    {review.city} · Verified rider
                  </p>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

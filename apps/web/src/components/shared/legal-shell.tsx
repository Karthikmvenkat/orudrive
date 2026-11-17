import type { ReactNode } from "react";
import { FileClock } from "lucide-react";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: ReactNode[];
  list?: ReactNode[];
};

export function LegalShell({
  updated,
  intro,
  sections,
}: {
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <section className="container-page py-10 lg:py-14">
      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            On this page
          </p>
          <nav aria-label="Document contents" className="mt-3">
            <ol className="space-y-1.5 border-l border-line pl-3.5">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block text-[12px] leading-snug text-muted transition hover:text-brand-700"
                  >
                    <span className="mr-1.5 text-[10.5px] font-semibold text-line-strong">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <p className="mt-5 flex items-center gap-1.5 rounded-lg bg-page px-3 py-2 text-[11px] text-muted">
            <FileClock className="size-3.5 text-brand-600" /> Last updated {updated}
          </p>
        </aside>

        <div className="prose-legal max-w-3xl">
          <div className="rounded-panel border border-line bg-surface p-5 text-[13px] leading-relaxed text-ink-soft sm:p-6">
            {intro}
          </div>
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-[19px] font-extrabold tracking-[-0.01em] text-ink sm:text-[21px]">
                {section.title}
              </h2>
              {section.paragraphs?.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              {section.list && (
                <ul>
                  {section.list.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <p className="mt-10 border-t border-line pt-6 text-[12px] text-muted">
            Questions about this document? Email{" "}
            <a href="mailto:legal@savarigo.com">legal@savarigo.com</a> or write to SavariGo, 12 Rue
            Suffren, White Town, Puducherry 605001.
          </p>
        </div>
      </div>
    </section>
  );
}

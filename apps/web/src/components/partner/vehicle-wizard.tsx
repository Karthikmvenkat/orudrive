"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ImagePlus,
  Send,
  ShieldQuestionMark,
} from "lucide-react";
import {
  Field,
  adminButton,
  adminButtonSoft,
  adminInput,
  adminTextarea,
  inr,
} from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import type { ApiCategory, ApiLocation } from "@/lib/api/types";

const STEPS = [
  { title: "Basic Information", hint: "What the vehicle is" },
  { title: "Specifications", hint: "Engine, limits and notes" },
  { title: "Photos & Documents", hint: "Gallery and paperwork" },
  { title: "Pricing", hint: "Day rate and charges" },
  { title: "Availability", hint: "Pickup hub and dates" },
];

const REQUIRED: string[][] = [
  ["name", "brand", "categoryId", "registrationNumber", "year"],
  ["seats", "engine", "mileage", "description"],
  [],
  ["baseDayRate", "extraKmRate", "depositAmount"],
  ["locationId"],
];

const FUEL = ["PETROL", "DIESEL", "ELECTRIC", "HYBRID", "CNG"];
const TRANSMISSION = ["MANUAL", "AUTOMATIC"];

export function VehicleWizard({
  categories,
  locations,
  action,
}: {
  categories: ApiCategory[];
  locations: ApiLocation[];
  action: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [problems, setProblems] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Two fields are echoed back into the UI, so they need real state rather than
  // reading the DOM during render.
  const [live, setLive] = useState({ baseDayRate: "", locationId: "" });

  const percent = Math.round(((step + 1) / STEPS.length) * 100);
  const hub = locations.find((entry) => entry.id === live.locationId);

  function validate(index: number) {
    const form = formRef.current;
    if (!form) return [];
    const data = new FormData(form);
    return REQUIRED[index].filter((name) => {
      const value = data.get(name);
      return typeof value !== "string" || value.trim() === "";
    });
  }

  function goTo(index: number) {
    if (index > step) {
      const missing = validate(step);
      if (missing.length > 0) {
        setProblems(missing);
        return;
      }
    }
    setProblems([]);
    setStep(Math.min(Math.max(index, 0), STEPS.length - 1));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    const missing = REQUIRED.flatMap((names) => validateStepNames(event.currentTarget, names));
    if (missing.length > 0) {
      event.preventDefault();
      setProblems(missing);
      return;
    }
    setProblems([]);
    setSubmitting(true);
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={onSubmit}
      onInput={(event) => {
        const target = event.target as HTMLInputElement;
        if (target.name === "baseDayRate" || target.name === "locationId") {
          setLive((previous) => ({ ...previous, [target.name]: target.value }));
        }
      }}
      className="space-y-5"
    >
      <input
        type="hidden"
        name="redirectTo"
        value="/partner/vehicles?status=DRAFT"
      />

      <section className="rounded-panel border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="label-overline">Step {step + 1} of {STEPS.length}</p>
          <p className="text-[12px] font-semibold text-muted tabular-nums">{percent}% complete</p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-page">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ol className="mt-4 grid gap-2 sm:grid-cols-5">
          {STEPS.map((entry, index) => {
            const done = index < step;
            const current = index === step;
            return (
              <li key={entry.title}>
                <button
                  type="button"
                  onClick={() => goTo(index)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition",
                    current
                      ? "border-forest bg-forest text-white"
                      : done
                        ? "border-brand-200 bg-brand-50/70 text-brand-800"
                        : "border-line bg-surface text-ink-soft hover:border-brand-300",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold",
                      current
                        ? "bg-white/20 text-white"
                        : done
                          ? "bg-brand-500 text-ink"
                          : "bg-page text-muted",
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-bold">{entry.title}</span>
                    <span
                      className={cn(
                        "block truncate text-[10.5px]",
                        current ? "text-white/70" : "text-muted",
                      )}
                    >
                      {entry.hint}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {problems.length > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12px] font-semibold text-red-700">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              Still needed: {problems.join(", ")}. Each step&rsquo;s required fields are marked with
              an asterisk.
            </span>
          </p>
        )}
      </section>

      {step === 0 && (
        <section className="grid gap-3 rounded-panel border border-line bg-surface p-5 sm:grid-cols-2">
          <Field label="Listing name *" hint="Brand and model together, eg “Honda Activa 6G”">
            <input name="name" maxLength={120} className={adminInput} placeholder="Honda Activa 6G" />
          </Field>
          <Field label="Brand *">
            <input name="brand" maxLength={60} className={adminInput} placeholder="Honda" />
          </Field>
          <Field label="Category *">
            <select name="categoryId" className={adminInput} defaultValue="">
              <option value="" disabled>
                Choose a category
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Registration number *" hint="As printed on the RC book">
            <input
              name="registrationNumber"
              maxLength={20}
              className={adminInput}
              placeholder="PY01AB1234"
            />
          </Field>
          <Field label="Year of manufacture *">
            <input
              name="year"
              type="number"
              min={1990}
              max={2100}
              defaultValue={new Date().getFullYear()}
              className={adminInput}
            />
          </Field>
          <Field label="Transmission *">
            <select name="transmission" className={adminInput} defaultValue="MANUAL">
              {TRANSMISSION.map((value) => (
                <option key={value} value={value}>
                  {value.toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fuel type *">
            <select name="fuelType" className={adminInput} defaultValue="PETROL">
              {FUEL.map((value) => (
                <option key={value} value={value}>
                  {value.toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field label="URL slug" hint="Optional kebab-case; we generate one from the name">
            <input name="slug" maxLength={80} className={adminInput} placeholder="honda-activa-6g" />
          </Field>
        </section>
      )}

      {step === 1 && (
        <section className="grid gap-3 rounded-panel border border-line bg-surface p-5 sm:grid-cols-2">
          <Field label="Engine or motor *" hint="CC for ICE, kW or battery for electric">
            <input name="engine" maxLength={60} className={adminInput} placeholder="109.51 cc" />
          </Field>
          <Field label="Mileage *" hint="Shown on the listing card">
            <input name="mileage" maxLength={60} className={adminInput} placeholder="45 km/l" />
          </Field>
          <Field label="Seats *">
            <input name="seats" type="number" min={1} max={12} defaultValue={2} className={adminInput} />
          </Field>
          <Field label="Km included per day" hint="Leave blank for unlimited mileage">
            <input name="mileageLimitKm" type="number" min={0} className={adminInput} placeholder="150" />
          </Field>
          <Field label="Minimum rental (days)" className="sm:col-span-2" hint="Riders cannot book fewer days than this">
            <input name="minDays" type="number" min={1} max={60} defaultValue={1} className={adminInput} />
          </Field>
          <Field
            label="Description *"
            className="sm:col-span-2"
            hint="Colour, condition, helmet or seatbelt details all live here — the schema has no separate colour column."
          >
            <textarea
              name="description"
              rows={4}
              maxLength={2000}
              className={adminTextarea}
              placeholder="Blue scooter, 2 helmets, serviced every 3,000 km. Ideal for Pondicherry beach roads."
            />
          </Field>
        </section>
      )}

      {step === 2 && (
        <section className="grid gap-3 rounded-panel border border-line bg-surface p-5">
          <p className="text-[12.5px] leading-relaxed text-muted">
            SavariGo stores listing photos as links. Use the URL of an image you have already
            uploaded to your own host or to the SavariGo media folder — the first one becomes the
            gallery hero on the customer site.
          </p>
          {[
            { label: "Front photo", placeholder: "/images/vehicles/honda-activa-front.jpg" },
            { label: "Rear photo", placeholder: "/images/vehicles/honda-activa-rear.jpg" },
            { label: "Side photo", placeholder: "/images/vehicles/honda-activa-side.jpg" },
            { label: "Interior or detail photo", placeholder: "/images/vehicles/honda-activa-dash.jpg" },
          ].map((entry) => (
            <Field key={entry.label} label={entry.label}>
              <div className="flex items-center gap-2">
                <ImagePlus className="size-4 shrink-0 text-muted" />
                <input name="photo" maxLength={500} className={adminInput} placeholder={entry.placeholder} />
              </div>
            </Field>
          ))}
          <div className="rounded-xl border border-line bg-page/60 px-4 py-3.5">
            <p className="flex items-center gap-2 text-[12.5px] font-bold text-ink">
              <ShieldQuestionMark className="size-4 text-brand-700" />
              RC book and insurance are filed separately
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
              Vehicle documents are their own verified records. Open{" "}
              <Link href="/partner/documents" className="font-semibold text-brand-700 hover:underline">
                My Documents
              </Link>{" "}
              and submit the RC and insurance for this vehicle — Master Admin approves those
              before the listing can go live.
            </p>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="grid gap-3 rounded-panel border border-line bg-surface p-5 sm:grid-cols-2">
          <Field label="Day rate (₹) *">
            <input name="baseDayRate" type="number" min={0} step="1" className={adminInput} placeholder="899" />
          </Field>
          <Field label="Extra km charge (₹/km) *">
            <input name="extraKmRate" type="number" min={0} step="0.01" className={adminInput} placeholder="6" />
          </Field>
          <Field label="Refundable deposit (₹) *">
            <input name="depositAmount" type="number" min={0} step="1" defaultValue={1500} className={adminInput} />
          </Field>
          <Field label="Plan name" hint="Shown on the price card">
            <input name="planName" maxLength={60} defaultValue="Standard" className={adminInput} />
          </Field>
          <Field label="Weekly discount (%)">
            <input name="weeklyDiscountPercent" type="number" min={0} max={100} step="0.5" className={adminInput} placeholder="10" />
          </Field>
          <Field label="Monthly discount (%)">
            <input name="monthlyDiscountPercent" type="number" min={0} max={100} step="0.5" className={adminInput} placeholder="20" />
          </Field>
          <div className="rounded-xl border border-line bg-page/60 p-4 sm:col-span-2">
            <p className="text-[12.5px] font-bold text-ink">
              {inr(Number(live.baseDayRate) || 0)}{" "}
              <span className="font-normal text-muted">per day is the only base rate saved.</span>
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
              Hourly tariffs and doorstep-delivery charges have no columns in the booking engine,
              so SavariGo prices by day plus the extra-km rate, the deposit and the weekly or
              monthly discount. Put any delivery fee you charge into the description instead.
            </p>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="grid gap-3 rounded-panel border border-line bg-surface p-5 sm:grid-cols-2">
          <Field label="Pickup hub *" hint="Where riders collect the vehicle">
            <select name="locationId" className={adminInput} defaultValue="">
              <option value="" disabled>
                Choose a hub
              </option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} · {location.city}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hub operating hours" hint="Read from the hub record you picked">
            <input
              className={adminInput}
              readOnly
              value={hub ? `${hub.opensAt} – ${hub.closesAt}` : "Pick a hub to see its hours"}
            />
          </Field>
          <Field label="Available from">
            <input type="date" name="validFrom" className={adminInput} />
          </Field>
          <Field label="Available to">
            <input type="date" name="validTo" className={adminInput} />
          </Field>
          <div className="rounded-xl border border-amber-200 bg-tint-butter p-4 sm:col-span-2">
            <p className="text-[12.5px] font-bold text-amber-900">
              This listing is submitted as Pending approval
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-amber-900/80">
              Partners cannot approve their own vehicles, so SavariGo always files a new listing
              with status DRAFT. Master Admin reviews the RC, insurance and photos, then sets the
              vehicle to Available — only then does it appear on the customer website and app.
            </p>
          </div>
        </section>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-surface p-5">
        <button
          type="button"
          onClick={() => goTo(step - 1)}
          disabled={step === 0}
          className={adminButtonSoft}
        >
          <ChevronLeft className="size-4" /> Back
        </button>
        <p className="text-[11.5px] text-muted">
          {step === STEPS.length - 1
            ? "Submitting files the listing for Master Admin review."
            : `Step ${step + 1} of ${STEPS.length}`}
        </p>
        {step === STEPS.length - 1 ? (
          <button type="submit" className={adminButton} disabled={submitting}>
            <Send className="size-4" />
            {submitting ? "Submitting…" : "Submit for Master Admin Approval"}
          </button>
        ) : (
          <button type="button" onClick={() => goTo(step + 1)} className={adminButton}>
            Next step <ChevronRight className="size-4" />
          </button>
        )}
      </section>
    </form>
  );
}

function validateStepNames(form: HTMLFormElement, names: string[]) {
  const data = new FormData(form);
  return names.filter((name) => {
    const value = data.get(name);
    return typeof value !== "string" || value.trim() === "";
  });
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  ListFilter,
  Motorbike,
  Scooter,
  Search,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import type { Vehicle } from "@/types";
import { cn } from "@/lib/utils";
import { BikeCard } from "@/components/vehicles/bike-card";

type BikeType = "all" | "scooter" | "motorcycle";

const PAGE_SIZE = 6;
const PREMIUM_FROM = 1000;
const FUEL_OPTIONS = ["Petrol", "Diesel", "Electric", "Hybrid"] as const;
const RATING_OPTIONS = [4, 4.5];

const typeOptions: { value: Exclude<BikeType, "all">; label: string; icon: typeof Scooter }[] = [
  { value: "scooter", label: "Scooter", icon: Scooter },
  { value: "motorcycle", label: "Motorcycle", icon: Motorbike },
];

export function BikesBrowse({
  vehicles,
  initialType = "all",
  initialFuel = "",
}: {
  vehicles: Vehicle[];
  initialType?: BikeType;
  initialFuel?: string;
}) {
  const maxBound = useMemo(
    () =>
      Math.max(2000, Math.ceil(Math.max(0, ...vehicles.map((v) => v.pricePerDay)) / 100) * 100),
    [vehicles],
  );

  const [type, setType] = useState<BikeType>(initialType);
  const [electricOnly, setElectricOnly] = useState(initialFuel === "Electric");
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(maxBound);
  const [fuels, setFuels] = useState<string[]>(initialFuel && initialFuel !== "Electric" ? [initialFuel] : []);
  const [minRating, setMinRating] = useState(0);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const fuelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vehicle of vehicles) {
      counts.set(vehicle.fuel, (counts.get(vehicle.fuel) ?? 0) + 1);
    }
    return counts;
  }, [vehicles]);

  const results = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      if (type !== "all" && vehicle.category !== type) return false;
      if (electricOnly && vehicle.fuel !== "Electric") return false;
      if (premiumOnly && vehicle.pricePerDay < PREMIUM_FROM) return false;
      if (vehicle.pricePerDay < priceMin || vehicle.pricePerDay > priceMax) return false;
      if (fuels.length && !fuels.includes(vehicle.fuel)) return false;
      if (minRating && vehicle.rating < minRating) return false;
      if (availableOnly && !vehicle.available) return false;
      if (term && !`${vehicle.name} ${vehicle.brand} ${vehicle.category}`.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [
    vehicles,
    type,
    electricOnly,
    premiumOnly,
    priceMin,
    priceMax,
    fuels,
    minRating,
    availableOnly,
    keyword,
  ]);

  const signature = [
    type,
    electricOnly,
    premiumOnly,
    priceMin,
    priceMax,
    fuels.join(","),
    minRating,
    availableOnly,
    keyword,
    view,
  ].join("|");

  useEffect(() => {
    setPage(1);
  }, [signature]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const from = results.length ? (current - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(current * PAGE_SIZE, results.length);

  const clearAll = () => {
    setType("all");
    setElectricOnly(false);
    setPremiumOnly(false);
    setPriceMin(0);
    setPriceMax(maxBound);
    setFuels([]);
    setMinRating(0);
    setAvailableOnly(false);
  };

  const toggleType = (value: Exclude<BikeType, "all">) =>
    setType((current) => (current === value ? "all" : value));

  const toggleFuel = (fuel: string) =>
    setFuels((current) =>
      current.includes(fuel) ? current.filter((item) => item !== fuel) : [...current, fuel],
    );

  const pct = (value: number) => (value / maxBound) * 100;

  const chips = [
    { key: "all", label: "All", icon: LayoutGrid },
    { key: "scooter", label: "Scooter", icon: Scooter },
    { key: "motorcycle", label: "Motorcycle", icon: Motorbike },
    { key: "electric", label: "Electric", icon: Zap },
    { key: "premium", label: "Premium", icon: ShieldCheck },
  ] as const;

  const chipActive = (key: (typeof chips)[number]["key"]) => {
    if (key === "all") return type === "all" && !electricOnly && !premiumOnly;
    if (key === "electric") return electricOnly;
    if (key === "premium") return premiumOnly;
    return type === key;
  };

  const onChip = (key: (typeof chips)[number]["key"]) => {
    if (key === "all") {
      setType("all");
      setElectricOnly(false);
      setPremiumOnly(false);
    } else if (key === "electric") {
      setElectricOnly((value) => !value);
    } else if (key === "premium") {
      setPremiumOnly((value) => !value);
    } else {
      toggleType(key);
    }
  };

  const filters = (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 text-[14px] font-bold text-ink">
          <ListFilter className="size-4 text-brand-600" />
          Filters
        </p>
        <button
          type="button"
          onClick={clearAll}
          className="text-[11.5px] font-semibold text-muted transition hover:text-brand-700"
        >
          Clear All
        </button>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-[12.5px] font-bold text-ink">Vehicle Type</p>
        <div className="mt-2.5 space-y-1">
          {typeOptions.map((option) => {
            const active = type === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleType(option.value)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-[12.5px] font-semibold transition",
                  active
                    ? "bg-brand-50 text-brand-800"
                    : "text-ink-soft hover:bg-page",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-lg",
                    active ? "bg-brand-500 text-white" : "bg-page text-ink-soft",
                  )}
                >
                  <Icon className="size-4.5" />
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-bold text-ink">Price / Day</p>
          <p className="text-[11.5px] font-semibold text-muted">
            ₹{priceMin.toLocaleString("en-IN")} – ₹{priceMax.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="relative mt-4 h-5">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" />
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-500"
            style={{ left: `${pct(priceMin)}%`, right: `${100 - pct(priceMax)}%` }}
          />
          <input
            type="range"
            aria-label="Minimum price per day"
            min={0}
            max={maxBound}
            step={50}
            value={priceMin}
            onChange={(event) =>
              setPriceMin(Math.min(Number(event.target.value), priceMax - 50))
            }
            className="pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-500 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
          />
          <input
            type="range"
            aria-label="Maximum price per day"
            min={0}
            max={maxBound}
            step={50}
            value={priceMax}
            onChange={(event) =>
              setPriceMax(Math.max(Number(event.target.value), priceMin + 50))
            }
            className="pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-500 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
          />
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-[12.5px] font-bold text-ink">Fuel Type</p>
        <div className="mt-2 space-y-1.5">
          {FUEL_OPTIONS.map((fuel) => {
            const count = fuelCounts.get(fuel) ?? 0;
            return (
              <label
                key={fuel}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 py-0.5 text-[12.5px]",
                  count === 0 ? "cursor-not-allowed text-muted/60" : "text-ink-soft",
                )}
              >
                <input
                  type="checkbox"
                  checked={fuels.includes(fuel)}
                  disabled={count === 0}
                  onChange={() => toggleFuel(fuel)}
                  className="size-4 rounded border-line-strong accent-brand-500"
                />
                {fuel}
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-[12.5px] font-bold text-ink">Rating</p>
        <div className="mt-2 space-y-1.5">
          {RATING_OPTIONS.map((rating) => {
            const active = minRating === rating;
            return (
              <button
                key={rating}
                type="button"
                aria-pressed={active}
                onClick={() => setMinRating(active ? 0 : rating)}
                className="flex w-full items-center gap-2.5 py-0.5 text-[12.5px] text-ink-soft"
              >
                <span
                  className={cn(
                    "grid size-4 place-items-center rounded border",
                    active
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-line-strong bg-white",
                  )}
                >
                  {active && <Check className="size-3" />}
                </span>
                <Star
                  className={cn(
                    "size-3.5",
                    active ? "fill-brand-500 text-brand-500" : "fill-warning/80 text-warning",
                  )}
                />
                {rating}★ &amp; above
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-[12.5px] font-bold text-ink">Availability</p>
        <div className="mt-2.5 flex items-center gap-2.5 text-[12.5px] text-ink-soft">
          <button
            type="button"
            role="switch"
            aria-checked={availableOnly}
            aria-label="Only show available vehicles"
            onClick={() => setAvailableOnly((value) => !value)}
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full transition",
              availableOnly ? "bg-brand-500" : "bg-line-strong",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
                availableOnly ? "left-[22px]" : "left-0.5",
              )}
            />
          </button>
          Available now
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-[#f1faf2] p-4">
        <span className="grid size-9 place-items-center rounded-full bg-brand-500 text-white">
          <ShieldCheck className="size-4.5" />
        </span>
        <p className="mt-3 text-[13px] font-bold text-ink">Need it delivered?</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
          Free doorstep delivery within Puducherry for bookings of 2+ days.
        </p>
        <Image
          src="/images/services/rental-bikes.png"
          alt=""
          width={150}
          height={90}
          className="ml-auto -mb-1 mt-1 h-[70px] w-auto object-contain"
        />
      </div>
    </div>
  );

  return (
    <section id="bikes" className="scroll-mt-20 pb-14 pt-7 lg:pt-9">
      <div className="container-page grid gap-6 lg:grid-cols-[236px_minmax(0,1fr)] lg:gap-7">
        <aside className={cn("lg:block", filtersOpen ? "block" : "hidden")}>
          <div className="lg:sticky lg:top-24">{filters}</div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search bikes, scooters..."
                aria-label="Search bikes, scooters"
                className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-[13px] text-ink outline-none placeholder:text-muted focus:border-brand-300"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((value) => !value)}
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-white px-4 text-[12.5px] font-semibold text-ink-soft lg:hidden"
            >
              <ListFilter className="size-4" />
              Filters
            </button>
            <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
              <button
                type="button"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold transition",
                  view === "grid"
                    ? "bg-brand-500 text-white"
                    : "text-ink-soft hover:bg-page",
                )}
              >
                <LayoutGrid className="size-3.5" />
                Grid
              </button>
              <button
                type="button"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold transition",
                  view === "list"
                    ? "bg-brand-500 text-white"
                    : "text-ink-soft hover:bg-page",
                )}
              >
                <List className="size-3.5" />
                List
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {chips.map((chip) => {
              const Icon = chip.icon;
              const active = chipActive(chip.key);
              return (
                <button
                  key={chip.key}
                  type="button"
                  aria-pressed={active}
                  title={chip.key === "premium" ? "₹1,000 and above per day" : undefined}
                  onClick={() => onChip(chip.key)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold transition",
                    active
                      ? "border-transparent bg-brand-500 text-white"
                      : "border-line bg-white text-ink-soft hover:border-brand-300 hover:text-brand-700",
                  )}
                >
                  <Icon className="size-3.5" />
                  {chip.label}
                </button>
              );
            })}
          </div>

          {visible.length > 0 ? (
            <div
              className={cn(
                "mt-4",
                view === "grid"
                  ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  : "flex flex-col gap-3",
              )}
            >
              {visible.map((vehicle, index) => (
                <BikeCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  layout={view}
                  priority={index < 3}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-line-strong bg-page/60 px-6 py-16 text-center">
              <p className="text-[14px] font-bold text-ink">No bikes match these filters</p>
              <p className="mt-1 max-w-sm text-[12.5px] text-muted">
                Try widening the price range or clearing a filter.
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="mt-4 inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-[12.5px] font-semibold text-white hover:bg-brand-600"
              >
                Clear filters
              </button>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12px] text-muted">
              Showing {from}–{to} of {results.length} vehicle{results.length === 1 ? "" : "s"}
            </p>
            {pages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={current === 1}
                  onClick={() => setPage(Math.max(1, current - 1))}
                  className="grid size-9 place-items-center rounded-full border border-line bg-white text-ink-soft transition hover:border-brand-300 disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
                  <button
                    key={number}
                    type="button"
                    aria-label={`Page ${number}`}
                    aria-current={number === current ? "page" : undefined}
                    onClick={() => setPage(number)}
                    className={cn(
                      "grid size-9 place-items-center rounded-full text-[12.5px] font-semibold transition",
                      number === current
                        ? "bg-brand-500 text-white"
                        : "border border-line bg-white text-ink-soft hover:border-brand-300",
                    )}
                  >
                    {number}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={current === pages}
                  onClick={() => setPage(Math.min(pages, current + 1))}
                  className="grid size-9 place-items-center rounded-full border border-line bg-white text-ink-soft transition hover:border-brand-300 disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

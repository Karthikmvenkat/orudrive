"use client";

import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import type { Vehicle } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/overlay";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { FilterPanel, type Filters } from "@/components/vehicles/filters";

type SortKey = "recommended" | "price-asc" | "price-desc" | "rating";

const sortLabels: Record<SortKey, string> = {
  recommended: "Recommended",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
};

export function VehicleBrowse({
  vehicles,
  typeOptions,
  initialFilters,
  initialSort = "recommended",
  query = { city: "", from: "", to: "" },
  emptyMessage = "No vehicles match these filters. Try widening your price range or clearing a filter.",
  pageSize = 9,
}: {
  vehicles: Vehicle[];
  typeOptions: { value: string; label: string }[];
  initialFilters?: Partial<Filters>;
  initialSort?: SortKey;
  query?: { city?: string; from?: string; to?: string };
  emptyMessage?: string;
  pageSize?: number;
}) {
  const brands = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.brand))).sort(),
    [vehicles],
  );
  const priceBounds = useMemo(() => {
    const prices = vehicles.map((v) => v.pricePerDay);
    return {
      min: Math.floor(Math.min(...prices) / 100) * 100,
      max: Math.ceil(Math.max(...prices) / 100) * 100,
    };
  }, [vehicles]);

  const [filters, setFilters] = useState<Filters>({
    types: [],
    brands: [],
    fuels: [],
    maxPrice: priceBounds.max,
    minRating: 0,
    onlyAvailable: false,
    ...initialFilters,
  });
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [keyword, setKeyword] = useState("");
  const [visible, setVisible] = useState(pageSize);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const results = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    const list = vehicles.filter((vehicle) => {
      if (
        filters.types.length &&
        !filters.types.includes(vehicle.category) &&
        !filters.types.includes(vehicle.body ?? "")
      )
        return false;
      if (filters.brands.length && !filters.brands.includes(vehicle.brand)) return false;
      if (filters.fuels.length && !filters.fuels.includes(vehicle.fuel)) return false;
      if (vehicle.pricePerDay > filters.maxPrice) return false;
      if (filters.minRating && vehicle.rating < filters.minRating) return false;
      if (filters.onlyAvailable && !vehicle.available) return false;
      if (
        term &&
        !`${vehicle.name} ${vehicle.brand} ${vehicle.category}`.toLowerCase().includes(term)
      )
        return false;
      return true;
    });

    return list.sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return a.pricePerDay - b.pricePerDay;
        case "price-desc":
          return b.pricePerDay - a.pricePerDay;
        case "rating":
          return b.rating - a.rating;
        default:
          return Number(b.popular ?? false) - Number(a.popular ?? false) || b.rating - a.rating;
      }
    });
  }, [vehicles, filters, keyword, sort]);

  const shown = results.slice(0, visible);
  const reset = () => {
    setFilters({
      types: [],
      brands: [],
      fuels: [],
      maxPrice: priceBounds.max,
      minRating: 0,
      onlyAvailable: false,
    });
    setKeyword("");
  };

  const activeChips = [
    ...filters.types.map((t) => ({
      label: typeOptions.find((o) => o.value === t)?.label ?? t,
      clear: () => setFilters((p) => ({ ...p, types: p.types.filter((x) => x !== t) })),
    })),
    ...filters.brands.map((b) => ({
      label: b,
      clear: () => setFilters((p) => ({ ...p, brands: p.brands.filter((x) => x !== b) })),
    })),
    ...filters.fuels.map((f) => ({
      label: f,
      clear: () => setFilters((p) => ({ ...p, fuels: p.fuels.filter((x) => x !== f) })),
    })),
    ...(filters.minRating
      ? [{ label: `${filters.minRating}★ & above`, clear: () => setFilters((p) => ({ ...p, minRating: 0 })) }]
      : []),
  ];

  return (
    <div className="container-page grid gap-6 py-7 lg:grid-cols-[264px_1fr] lg:gap-8 lg:py-9">
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            brands={brands}
            typeOptions={typeOptions}
            priceBounds={priceBounds}
          />
          <div className="mt-3 rounded-xl border border-dashed border-brand-200 bg-brand-50/70 p-4">
            <p className="text-[12px] font-bold text-brand-800">Need it delivered?</p>
            <p className="mt-1 text-[11px] leading-relaxed text-brand-800/70">
              Free doorstep delivery within Puducherry for bookings of 2+ days.
            </p>
          </div>
        </div>
      </aside>

      <div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setVisible(pageSize);
                }}
                placeholder="Search Activa, Classic, i20…"
                aria-label="Search vehicles"
                className="field-base h-11 pl-9"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="lg:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
              Filters
            </Button>
            <label className="relative">
              <span className="sr-only">Sort vehicles</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="field-base h-11 w-full appearance-none pr-9 text-[12.5px] font-medium sm:w-[190px]"
              >
                {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                  <option key={key} value={key}>
                    Sort: {sortLabels[key]}
                  </option>
                ))}
              </select>
              <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            </label>
          </div>

          {(query.city || query.from || query.to) && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-page/70 px-3 py-2 text-[11.5px] text-ink-soft">
              {query.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5 text-brand-600" />
                  {query.city}
                </span>
              )}
              {query.from && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5 text-brand-600" />
                  {formatDate(query.from, { day: "2-digit", month: "short" })}
                  {query.to && ` – ${formatDate(query.to, { day: "2-digit", month: "short" })}`}
                </span>
              )}
              <span className="ml-auto text-[11px] text-muted">
                Prices shown for 1 day · deposit refundable
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12.5px] text-muted">
              <span className="font-bold text-ink">{results.length}</span> vehicle
              {results.length === 1 ? "" : "s"} found
            </p>
            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {activeChips.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={chip.clear}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 transition hover:bg-brand-100"
                  >
                    {chip.label}
                    <X className="size-3" />
                  </button>
                ))}
                <button
                  onClick={reset}
                  className="text-[11px] font-semibold text-muted underline-offset-2 hover:text-brand-700 hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {shown.length > 0 ? (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((vehicle, i) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} priority={i < 3} />
              ))}
            </div>

            <div className="mt-7 flex flex-col items-center gap-2">
              <p className="text-[11.5px] text-muted">
                Showing {shown.length} of {results.length} vehicles
              </p>
              {visible < results.length && (
                <Button
                  variant="outline"
                  onClick={() => setVisible((v) => v + pageSize)}
                  className="min-w-40"
                >
                  Load more vehicles
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="mt-6 flex flex-col items-center rounded-panel border border-dashed border-line bg-page/50 px-6 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-white text-muted shadow-soft">
              <Search className="size-6" />
            </span>
            <h3 className="mt-4 text-base font-bold text-ink">No vehicles found</h3>
            <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted">
              {emptyMessage}
            </p>
            <Button variant="soft" className="mt-4" onClick={reset}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" className="w-[90%] max-w-sm">
          <DialogTitle className="sr-only">Filter vehicles</DialogTitle>
          <div className="flex-1 overflow-y-auto p-3">
            <FilterPanel
              filters={filters}
              setFilters={setFilters}
              brands={brands}
              typeOptions={typeOptions}
              priceBounds={priceBounds}
              className="border-0"
            />
          </div>
          <div className="border-t border-line p-4">
            <Button className="w-full" onClick={() => setFiltersOpen(false)}>
              Show {results.length} vehicles
            </Button>
          </div>
        </SheetContent>
      </Dialog>
    </div>
  );
}

export function BrowseHeader({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count: number;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("border-b border-line bg-linear-to-b from-brand-50/60 to-white")}>
      <div className="container-page py-8 lg:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            {children}
            <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-[34px]">
              {title}
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{description}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-2 text-[11.5px] font-semibold text-brand-700">
            <span className="size-1.5 rounded-full bg-brand-500" />
            {count} vehicles available today
          </div>
        </div>
      </div>
    </section>
  );
}

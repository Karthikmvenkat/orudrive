"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { cn, inr } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox, RadioGroup, RadioGroupItem, Slider } from "@/components/ui/controls";

export type Filters = {
  types: string[];
  brands: string[];
  fuels: string[];
  maxPrice: number;
  minRating: number;
  onlyAvailable: boolean;
};

export function FilterPanel({
  filters,
  setFilters,
  brands,
  typeOptions,
  priceBounds,
  className,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  brands: string[];
  typeOptions: { value: string; label: string }[];
  priceBounds: { min: number; max: number };
  className?: string;
}) {
  const toggle = (key: "types" | "brands" | "fuels", value: string) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));

  const activeCount =
    filters.types.length +
    filters.brands.length +
    filters.fuels.length +
    (filters.maxPrice < priceBounds.max ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.onlyAvailable ? 1 : 0);

  return (
    <div className={cn("rounded-panel border border-line bg-surface", className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
        <p className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
          <SlidersHorizontal className="size-4 text-brand-600" />
          Filters
          {activeCount > 0 && <Badge size="sm">{activeCount}</Badge>}
        </p>
        <button
          type="button"
          onClick={() =>
            setFilters({
              types: [],
              brands: [],
              fuels: [],
              maxPrice: priceBounds.max,
              minRating: 0,
              onlyAvailable: false,
            })
          }
          className="text-[11.5px] font-semibold text-muted transition hover:text-brand-700"
        >
          Clear all
        </button>
      </div>

      <div className="divide-y divide-line">
        <Group title="Vehicle Type">
          {typeOptions.map((option) => (
            <CheckRow
              key={option.value}
              label={option.label}
              checked={filters.types.includes(option.value)}
              onChange={() => toggle("types", option.value)}
            />
          ))}
        </Group>

        <Group title="Price / Day">
          <div className="px-1 pt-1">
            <div className="mb-3 flex items-center justify-between text-[11.5px] text-muted">
              <span>{inr(priceBounds.min)}</span>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
                up to {inr(filters.maxPrice)}
              </span>
            </div>
            <Slider
              min={priceBounds.min}
              max={priceBounds.max}
              step={100}
              value={[filters.maxPrice]}
              onValueChange={([value]) =>
                setFilters((prev) => ({ ...prev, maxPrice: value }))
              }
              aria-label="Maximum price per day"
            />
          </div>
        </Group>

        <Group title="Brand">
          {brands.map((brand) => (
            <CheckRow
              key={brand}
              label={brand}
              checked={filters.brands.includes(brand)}
              onChange={() => toggle("brands", brand)}
            />
          ))}
        </Group>

        <Group title="Fuel">
          {["Petrol", "Diesel", "Electric"].map((fuel) => (
            <CheckRow
              key={fuel}
              label={fuel}
              checked={filters.fuels.includes(fuel)}
              onChange={() => toggle("fuels", fuel)}
            />
          ))}
        </Group>

        <Group title="Rating">
          <RadioGroup
            value={String(filters.minRating)}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, minRating: Number(value) }))
            }
            className="space-y-2.5"
          >
            {[
              { value: "0", label: "Any rating" },
              { value: "4.7", label: "4.7 and above" },
              { value: "4.5", label: "4.5 and above" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2.5 text-[12.5px] text-ink-soft"
              >
                <RadioGroupItem value={option.value} />
                {option.label}
              </label>
            ))}
          </RadioGroup>
        </Group>

        <Group title="Availability">
          <CheckRow
            label="Available right now"
            checked={filters.onlyAvailable}
            onChange={() =>
              setFilters((prev) => ({
                ...prev,
                onlyAvailable: !prev.onlyAvailable,
              }))
            }
          />
        </Group>
      </div>
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        {title}
      </p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 text-[12.5px] text-ink-soft transition hover:text-ink">
      <span className="flex items-center gap-2.5">
        <Checkbox checked={checked} onCheckedChange={onChange} aria-label={label} />
        {label}
      </span>
      {checked && <X className="size-3 text-line-strong" />}
    </label>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Bike, CarFront, IndianRupee, Zap } from "lucide-react";
import { Slider } from "@/components/ui/controls";
import { inr } from "@/lib/utils";
import { cn } from "@/lib/utils";

const vehicles = [
  { id: "scooter", label: "Scooter", rate: 349, icon: Zap },
  { id: "motorcycle", label: "Motorcycle", rate: 549, icon: Bike },
  { id: "car", label: "Car", rate: 1499, icon: CarFront },
] as const;

const PLATFORM_FEE = 0.2;

export function EarningsCalculator() {
  const [vehicleId, setVehicleId] = useState<(typeof vehicles)[number]["id"]>("scooter");
  const [days, setDays] = useState([20]);

  const vehicle = vehicles.find((item) => item.id === vehicleId) ?? vehicles[0];

  const { gross, net, yearly } = useMemo(() => {
    const gross = vehicle.rate * days[0];
    const net = Math.round(gross * (1 - PLATFORM_FEE));
    return { gross, net, yearly: net * 12 };
  }, [vehicle.rate, days]);

  return (
    <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-[17px] font-extrabold text-ink">Estimate your monthly earnings</h2>
      <p className="mt-1 text-[12px] text-muted">
        Based on current Puducherry demand. Your rate can be higher for newer models.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {vehicles.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setVehicleId(item.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11.5px] font-semibold transition",
              vehicleId === item.id
                ? "border-brand-500 bg-brand-50 text-brand-800"
                : "border-line bg-white text-ink-soft hover:border-brand-200",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-medium text-ink-soft">Booked days per month</span>
          <span className="font-bold text-ink">{days[0]} days</span>
        </div>
        <Slider
          value={days}
          onValueChange={setDays}
          min={5}
          max={26}
          step={1}
          className="mt-2"
          aria-label="Booked days per month"
        />
        <div className="mt-1 flex justify-between text-[10.5px] text-muted">
          <span>5 days</span>
          <span>26 days</span>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-forest p-4 text-white">
        <div className="flex items-center justify-between text-[11.5px] text-white/60">
          <span>Gross monthly</span>
          <span>{inr(gross)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11.5px] text-white/60">
          <span>Platform fee (20%)</span>
          <span>−{inr(gross - net)}</span>
        </div>
        <div className="mt-3 flex items-end justify-between border-t border-white/15 pt-3">
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-white/80">
            <IndianRupee className="size-3.5 text-brand-300" /> You take home
          </span>
          <span className="font-display text-[26px] font-extrabold leading-none">{inr(net)}</span>
        </div>
        <p className="mt-2 text-[11px] text-white/55">
          ≈ {inr(yearly)} per year at this pace. Insurance and servicing are on us.
        </p>
      </div>
    </div>
  );
}

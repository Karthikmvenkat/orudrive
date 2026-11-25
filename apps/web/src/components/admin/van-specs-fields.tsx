"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiCategory } from "@/lib/api/types";
import { AdminPanel, Field, adminInput } from "@/components/admin/ui";

export function VanSpecsFields({ categories }: { categories: ApiCategory[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVan, setIsVan] = useState(false);

  useEffect(() => {
    const form = ref.current?.closest("form");
    const select = form?.elements.namedItem("categoryId") as HTMLSelectElement | null;
    if (!form || !select) return;
    const sync = () => {
      setIsVan(categories.find((c) => c.id === select.value)?.slug === "van");
    };
    sync();
    select.addEventListener("change", sync);
    return () => select.removeEventListener("change", sync);
  }, [categories]);

  if (!isVan) return <div ref={ref} />;

  return (
    <div ref={ref}>
      <AdminPanel
        title="Van specifications"
        description="Required for van listings — the API rejects a van without luggage capacity and AC."
        bodyClassName="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Field label="Luggage capacity (bags)" hint="Required for vans. 0–30 bags.">
          <input
            name="luggageCapacity"
            type="number"
            min={0}
            max={30}
            step={1}
            required
            defaultValue={4}
            className={adminInput}
          />
        </Field>
        <Field label="Air conditioning" hint="Required for vans.">
          <select name="ac" required defaultValue="true" className={adminInput}>
            <option value="true">Yes — AC fitted</option>
            <option value="false">No — non-AC</option>
          </select>
        </Field>
      </AdminPanel>
    </div>
  );
}
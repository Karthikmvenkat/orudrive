import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { staffRequest } from "@/lib/api/server";
import type { ApiLocation } from "@/lib/api/types";
import {
  AdminAction,
  AdminDrawer,
  AdminEmpty,
  AdminPage,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
  adminButtonDanger,
  adminInput,
  firstParam,
  inr,
} from "@/components/admin/ui";
import { AdminActiveFlag } from "@/components/admin/status-badge";
import { RankedList } from "@/components/portal/charts";
import {
  createLocation,
  deleteLocation,
  setLocationActive,
} from "../actions";

export const metadata: Metadata = { title: "Locations · Admin" };

export default async function AdminLocationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locations = await staffRequest<ApiLocation[]>("/locations/manage");
  const redirectTo = "/admin/locations";

  const cities = [...new Set(locations.map((location) => location.city))].sort();
  const coverage = cities.map((city) => {
    const rows = locations.filter((location) => location.city === city);
    return {
      city,
      hubs: rows.length,
      vehicles: rows.reduce((sum, row) => sum + row.vehicleCount, 0),
      state: rows[0]?.state ?? "",
    };
  });
  const maxCityVehicles = Math.max(...coverage.map((row) => row.vehicles), 1);

  return (
    <AdminPage
      title="City & Location"
      description="Where SavariGo operates: the cities covered and the physical handover points customers pick at checkout."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
    >
      <AdminPanel
        title="City coverage"
        description="Derived from the hubs below, so a city only appears once it has a real pickup point."
      >
        <RankedList
          rows={coverage.map((row) => ({
            title: row.city,
            subtitle: `${row.hubs} hub${row.hubs === 1 ? "" : "s"} · ${row.state}`,
            value: `${row.vehicles} vehicles`,
            share: row.vehicles / maxCityVehicles,
          }))}
        />
      </AdminPanel>
      <AdminPanel title="Add a hub">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-[13px] font-semibold text-brand-700">
            <Plus className="size-4" /> New hub form
          </summary>
          <form
            action={createLocation}
            className="grid gap-4 border-t border-line px-5 py-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <Field label="Name">
              <input name="name" required className={adminInput} placeholder="Beach Road Hub" />
            </Field>
            <Field label="Address line 1">
              <input name="addressLine1" required className={adminInput} />
            </Field>
            <Field label="Address line 2">
              <input name="addressLine2" className={adminInput} />
            </Field>
            <Field label="City">
              <input name="city" defaultValue="Puducherry" className={adminInput} />
            </Field>
            <Field label="State">
              <input name="state" defaultValue="Puducherry" className={adminInput} />
            </Field>
            <Field label="Postal code">
              <input name="postalCode" required className={adminInput} placeholder="605001" />
            </Field>
            <Field label="Phone">
              <input name="phone" className={adminInput} placeholder="+91 98765 43210" />
            </Field>
            <Field label="Opens at">
              <input name="opensAt" type="time" defaultValue="07:00" className={adminInput} />
            </Field>
            <Field label="Closes at">
              <input name="closesAt" type="time" defaultValue="23:00" className={adminInput} />
            </Field>
            <Field label="Active">
              <select name="isActive" className={adminInput} defaultValue="true">
                <option value="true">Active</option>
                <option value="false">Hidden</option>
              </select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <button className={adminButton} type="submit">
                Create hub
              </button>
            </div>
          </form>
        </details>
      </AdminPanel>

      <AdminPanel title={`${locations.length} hubs`}>
        <AdminTable
          minWidth={960}
          head={["Hub", "Address", "Hours", "Vehicles", "From", "State", "Actions"]}
        >
          {locations.length === 0 && (
            <AdminEmpty colSpan={7}>No hubs yet.</AdminEmpty>
          )}
          {locations.map((location) => (
            <tr key={location.id} className="align-top">
              <td className="px-5 py-4">
                <p className="font-semibold text-ink">{location.name}</p>
                <p className="font-mono text-[11px] text-muted">{location.slug}</p>
                <p className="text-[11px] text-muted">{location.phone ?? "No phone"}</p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {location.addressLine1}
                {location.addressLine2 ? `, ${location.addressLine2}` : ""}
                <p className="text-[11px] text-muted">
                  {location.city}, {location.state} {location.postalCode}
                </p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {location.opensAt}–{location.closesAt}
              </td>
              <td className="px-5 py-4 text-ink-soft">{location.vehicleCount}</td>
              <td className="px-5 py-4 text-ink-soft">
                {location.fromPrice ? inr(location.fromPrice) : "—"}
              </td>
              <td className="px-5 py-4">
                <AdminActiveFlag active={location.isActive} />
              </td>
              <td className="px-5 py-4">
                <AdminAction>
                  <form action={setLocationActive}>
                    <input type="hidden" name="id" value={location.id} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <input
                      type="hidden"
                      name="active"
                      value={location.isActive ? "false" : "true"}
                    />
                    <button className="text-[12px] font-semibold text-brand-700 hover:underline">
                      {location.isActive ? "Hide" : "Publish"}
                    </button>
                  </form>
                  {location.vehicleCount === 0 && (
                    <AdminDrawer label="Delete">
                      <form action={deleteLocation} className="space-y-3">
                        <input type="hidden" name="id" value={location.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <p className="text-[12px] text-muted">
                          Only hubs without vehicles can be deleted.
                        </p>
                        <button className={adminButtonDanger} type="submit">
                          Delete {location.name}
                        </button>
                      </form>
                    </AdminDrawer>
                  )}
                </AdminAction>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>
    </AdminPage>
  );
}

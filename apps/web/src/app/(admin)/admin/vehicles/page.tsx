import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { staffRequest } from "@/lib/api/server";
import type {
  AdminOverview,
  AdminPartnerItem,
  ApiCategory,
  ApiVehicle,
  Paginated,
  VehicleStatusValue,
} from "@/lib/api/types";
import {
  AdminAction,
  AdminDrawer,
  AdminEmpty,
  AdminPage,
  AdminPager,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
  adminButtonDanger,
  adminButtonSoft,
  adminInput,
  adminTextarea,
  firstParam,
  inr,
} from "@/components/admin/ui";
import { AdminVehicleStatus } from "@/components/admin/status-badge";
import { PortalTabs } from "@/components/portal/ui";
import {
  retireVehicle,
  setVehicleStatus,
  updateVehicle,
  updateVehiclePricing,
} from "../actions";

export const metadata: Metadata = { title: "Vehicles · Admin" };

const vehicleStatuses: VehicleStatusValue[] = [
  "DRAFT",
  "AVAILABLE",
  "UNAVAILABLE",
  "MAINTENANCE",
  "RETIRED",
];

/** `booked` is not a column on a vehicle, it is a live availability overlap. */
const VIEWS = [
  { key: "", label: "All vehicles" },
  { key: "AVAILABLE", label: "Available" },
  { key: "BOOKED", label: "Booked now" },
  { key: "DRAFT", label: "Pending approval" },
  { key: "UNAVAILABLE", label: "Unavailable" },
  { key: "MAINTENANCE", label: "Maintenance" },
  { key: "RETIRED", label: "Retired" },
];

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = firstParam(params.view) ?? "";
  const q = firstParam(params.q);
  const category = firstParam(params.category) ?? "";
  const owner = firstParam(params.owner);
  const page = Number(firstParam(params.page) ?? "1") || 1;

  const statusFilter = VIEWS.some((entry) => entry.key === view) && view !== "BOOKED" ? view : "";
  const isBookedView = view === "BOOKED";

  const [vehicles, overview, partners, categories, booked] = await Promise.all([
    staffRequest<Paginated<ApiVehicle>>("/vehicles/manage", {
      query: {
        status: statusFilter || undefined,
        bookedNow: isBookedView ? "true" : undefined,
        q,
        category: category || undefined,
        ownerId: owner,
        page,
        limit: 20,
      },
    }),
    staffRequest<AdminOverview>("/admin/overview"),
    staffRequest<Paginated<AdminPartnerItem>>("/admin/partners", {
      query: { limit: 100 },
    }),
    staffRequest<ApiCategory[]>("/categories"),
    staffRequest<Paginated<ApiVehicle>>("/vehicles/manage", {
      query: { bookedNow: "true", ownerId: owner, category: category || undefined, limit: 1 },
    }),
  ]);

  const partnerByUserId = new Map(
    partners.data.map((partner) => [partner.userId, partner] as const),
  );

  const query: Record<string, string | undefined> = {
    view: view || undefined,
    category: category || undefined,
    owner,
    q,
  };
  const hrefFor = (overrides: Record<string, string | undefined>) => {
    const merged = { ...query, ...overrides };
    const entries = Object.entries(merged).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    );
    if (entries.length === 0) return "/admin/vehicles";
    return `/admin/vehicles?${new URLSearchParams(entries).toString()}`;
  };
  const redirectTo = hrefFor({});

  const viewCounts: Record<string, number> = {
    "": overview.vehicles.total,
    BOOKED: booked.meta.total,
    ...Object.fromEntries(
      vehicleStatuses.map((value) => [value, overview.vehicles.byStatus[value] ?? 0]),
    ),
  };

  const partner = owner ? partnerByUserId.get(owner) : undefined;
  // Chip counts come from platform-wide totals, so they only stay honest when
  // no other filter narrows the list.
  const showViewCounts = !q && !owner && !category;
  const showCategoryCounts = !q && !owner && !view;

  return (
    <AdminPage
      title="Vehicles"
      description="Inventory, availability and day-rate pricing across every partner's fleet. New partner submissions start as drafts and only Master Admin can move one to Available."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <div className="flex flex-wrap items-end gap-2">
          <form className="flex flex-wrap items-end gap-2" method="get">
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="category" value={category} />
            <input type="hidden" name="owner" value={owner ?? ""} />
            <Field label="Search" className="w-52">
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Name, brand or description"
                className={adminInput}
              />
            </Field>
            <button className={adminButton} type="submit">
              Filter
            </button>
            {(q || owner || category || view) && (
              <Link href="/admin/vehicles" className={adminButtonSoft}>
                Clear filters
              </Link>
            )}
          </form>
          <Link href="/admin/vehicles/new" className={adminButton}>
            Add vehicle
          </Link>
        </div>
      }
    >
      {partner && (
        <p className="text-[12.5px] text-muted">
          Filtered to one partner:{" "}
          <Link
            href={`/admin/partners/${partner.id}`}
            className="font-semibold text-brand-700 hover:underline"
          >
            {partner.tradingName}
          </Link>{" "}
          lists {partner.vehicles} vehicles and holds {partner.bookings} bookings on the platform.
        </p>
      )}
      <PortalTabs
        tabs={VIEWS.map((entry) => ({
          key: entry.key,
          label: entry.label,
          count: showViewCounts ? (viewCounts[entry.key] ?? 0) : undefined,
        }))}
        active={view}
        basePath="/admin/vehicles"
        param="view"
        search={query}
      />
      <PortalTabs
        tabs={[
          {
            key: "",
            label: "All types",
            count: showCategoryCounts ? overview.vehicles.total : undefined,
          },
          ...categories.map((row) => ({
            key: row.slug,
            label: row.name,
            count: showCategoryCounts ? row.vehicleCount : undefined,
          })),
        ]}
        active={category}
        basePath="/admin/vehicles"
        param="category"
        search={query}
      />

      <AdminPanel title={`${vehicles.meta.total} vehicles match these filters`}>
        <AdminTable
          minWidth={1240}
          head={[
            "Vehicle",
            "Type",
            "Rental partner",
            "Location",
            "Day rate",
            "Availability",
            "Approval",
            "Actions",
          ]}
        >
          {vehicles.data.length === 0 && (
            <AdminEmpty colSpan={8}>No vehicles match these filters.</AdminEmpty>
          )}
          {vehicles.data.map((vehicle) => {
            const plan = vehicle.pricing?.[0];
            const partner = vehicle.owner ? partnerByUserId.get(vehicle.owner.id) : undefined;
            return (
              <tr key={vehicle.id} className="align-top">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-page">
                      {vehicle.primaryImage ? (
                        <Image
                          src={vehicle.primaryImage.url}
                          alt={vehicle.primaryImage.alt}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div>
                      <p className="font-semibold text-ink">{vehicle.name}</p>
                      <p className="text-[11px] text-muted">
                        {vehicle.brand} · {vehicle.year}
                      </p>
                      <p className="font-mono text-[11px] text-muted">
                        {vehicle.registrationNumber ?? "Plate not recorded"}
                      </p>
                      <p className="text-[11px] text-muted">
                        {vehicle.rating.toFixed(1)} ★ · {vehicle.reviewCount} reviews
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-[12px] text-ink-soft">
                  {vehicle.category.name}
                  <p className="text-[11px] text-muted">
                    {vehicle.transmission === "AUTOMATIC" ? "Automatic" : "Manual"} ·{" "}
                    {vehicle.fuelType.toLowerCase()}
                  </p>
                  <p className="text-[11px] text-muted">{vehicle.seats} seats</p>
                </td>
                <td className="px-5 py-4 text-[12px]">
                  {partner ? (
                    <Link
                      href={`/admin/partners/${partner.id}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {partner.tradingName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-ink-soft">
                      {vehicle.owner?.email ?? "Owner account unknown"}
                    </span>
                  )}
                  <p className="text-[11px] text-muted tabular-nums">
                    {partner ? partner.partnerCode : "No partner profile"}
                  </p>
                  {partner && (
                    <p className="text-[11px] text-muted">
                      {partner.commissionPercent}% platform commission
                    </p>
                  )}
                </td>
                <td className="px-5 py-4 text-[12px] text-ink-soft">
                  {vehicle.location.name}
                  <p className="text-[11px] text-muted">{vehicle.location.city}</p>
                </td>
                <td className="px-5 py-4 font-semibold text-ink">
                  {inr(vehicle.pricePerDay)}
                  <p className="text-[11px] font-normal text-muted">
                    {plan ? `Plan: ${plan.name}` : "No active plan"}
                  </p>
                  <p className="text-[11px] font-normal text-muted">
                    {plan ? `${inr(plan.extraKmRate)}/extra km` : "—"}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <AdminVehicleStatus status={vehicle.status} />
                  <p className="mt-1 text-[11px] text-muted">
                    {vehicle.status === "AVAILABLE"
                      ? "Live on website and app"
                      : "Hidden from customers"}
                  </p>
                </td>
                <td className="px-5 py-4 text-[12px] text-ink-soft">
                  {vehicle.status === "DRAFT" ? (
                    <span className="font-semibold text-amber-700">Pending approval</span>
                  ) : (
                    <span className="font-semibold text-ink-soft">Approved listing</span>
                  )}
                  <p className="mt-1 text-[11px] text-muted">
                    {vehicle.registrationNumber ? (
                      <Link
                        href={`/admin/documents?q=${encodeURIComponent(vehicle.registrationNumber)}`}
                        className="text-brand-700 hover:underline"
                      >
                        Paperwork for this plate
                      </Link>
                    ) : (
                      "No plate recorded"
                    )}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <AdminAction>
                    <AdminDrawer label="Status">
                      <form action={setVehicleStatus} className="space-y-3">
                        <input type="hidden" name="id" value={vehicle.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <Field label="New status">
                          <select
                            name="status"
                            className={adminInput}
                            defaultValue={vehicle.status}
                          >
                            {vehicleStatuses.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <button className={adminButton} type="submit">
                          Save status
                        </button>
                      </form>
                    </AdminDrawer>
                    {plan && (
                      <AdminDrawer label="Pricing">
                        <form action={updateVehiclePricing} className="grid grid-cols-2 gap-3">
                          <input type="hidden" name="pricingId" value={plan.id} />
                          <input type="hidden" name="redirectTo" value={redirectTo} />
                          <Field label="Day rate (₹)">
                            <input
                              name="baseDayRate"
                              type="number"
                              step="0.01"
                              min={0}
                              defaultValue={plan.baseDayRate}
                              className={adminInput}
                            />
                          </Field>
                          <Field label="Extra km (₹)">
                            <input
                              name="extraKmRate"
                              type="number"
                              step="0.01"
                              min={0}
                              defaultValue={plan.extraKmRate}
                              className={adminInput}
                            />
                          </Field>
                          <Field label="Deposit (₹)">
                            <input
                              name="depositAmount"
                              type="number"
                              step="0.01"
                              min={0}
                              defaultValue={plan.depositAmount}
                              className={adminInput}
                            />
                          </Field>
                          <Field label="Min days">
                            <input
                              name="minDays"
                              type="number"
                              min={1}
                              defaultValue={plan.minDays}
                              className={adminInput}
                            />
                          </Field>
                          <Field label="Weekly discount %">
                            <input
                              name="weeklyDiscountPercent"
                              type="number"
                              step="0.01"
                              min={0}
                              max={100}
                              defaultValue={plan.weeklyDiscountPercent ?? ""}
                              className={adminInput}
                            />
                          </Field>
                          <Field label="Monthly discount %">
                            <input
                              name="monthlyDiscountPercent"
                              type="number"
                              step="0.01"
                              min={0}
                              max={100}
                              defaultValue={plan.monthlyDiscountPercent ?? ""}
                              className={adminInput}
                            />
                          </Field>
                          <div className="col-span-2">
                            <button className={adminButton} type="submit">
                              Save pricing
                            </button>
                          </div>
                        </form>
                      </AdminDrawer>
                    )}
                    <AdminDrawer label="Edit">
                      <form action={updateVehicle} className="grid grid-cols-2 gap-3">
                        <input type="hidden" name="id" value={vehicle.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <Field label="Name">
                          <input name="name" defaultValue={vehicle.name} className={adminInput} />
                        </Field>
                        <Field label="Brand">
                          <input name="brand" defaultValue={vehicle.brand} className={adminInput} />
                        </Field>
                        <Field label="Year">
                          <input
                            name="year"
                            type="number"
                            min={1990}
                            max={2100}
                            defaultValue={vehicle.year}
                            className={adminInput}
                          />
                        </Field>
                        <Field label="Seats">
                          <input
                            name="seats"
                            type="number"
                            min={1}
                            max={12}
                            defaultValue={vehicle.seats}
                            className={adminInput}
                          />
                        </Field>
                        <Field label="Engine">
                          <input name="engine" defaultValue={vehicle.engine} className={adminInput} />
                        </Field>
                        <Field label="Mileage">
                          <input name="mileage" defaultValue={vehicle.mileage} className={adminInput} />
                        </Field>
                        <Field label="Deposit (₹)">
                          <input
                            name="depositAmount"
                            type="number"
                            step="0.01"
                            min={0}
                            defaultValue={vehicle.depositAmount}
                            className={adminInput}
                          />
                        </Field>
                        <Field label="Description" className="col-span-2">
                          <textarea
                            name="description"
                            defaultValue={vehicle.description}
                            className={adminTextarea}
                          />
                        </Field>
                        <div className="col-span-2">
                          <button className={adminButton} type="submit">
                            Save vehicle
                          </button>
                        </div>
                      </form>
                    </AdminDrawer>
                    {vehicle.status !== "RETIRED" && (
                      <AdminDrawer label="Retire">
                        <form action={retireVehicle} className="space-y-3">
                          <input type="hidden" name="id" value={vehicle.id} />
                          <input type="hidden" name="redirectTo" value={redirectTo} />
                          <p className="text-[12px] text-muted">
                            Retiring keeps historical bookings and payments intact
                            but removes the vehicle from the catalogue.
                          </p>
                          <button className={adminButtonDanger} type="submit">
                            Retire vehicle
                          </button>
                        </form>
                      </AdminDrawer>
                    )}
                  </AdminAction>
                </td>
              </tr>
            );
          })}
        </AdminTable>
        <AdminPager
          page={vehicles.meta.page}
          totalPages={vehicles.meta.totalPages}
          path="/admin/vehicles"
          params={query}
        />
      </AdminPanel>

      <p className="text-[12px] text-muted">
        The add page takes one primary photo. Further gallery images go through the API at{" "}
        <span className="font-mono text-ink-soft">POST /vehicles/:id/images</span>{" "}
        or the Swagger console.
      </p>
    </AdminPage>
  );
}

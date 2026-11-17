import type { Metadata } from "next";
import Link from "next/link";
import { staffRequest } from "@/lib/api/server";
import type { ApiCategory, ApiLocation, VehicleStatusValue } from "@/lib/api/types";
import {
  AdminPage,
  AdminPanel,
  Field,
  adminButton,
  adminButtonSoft,
  adminInput,
  adminTextarea,
  firstParam,
} from "@/components/admin/ui";
import { createVehicle } from "../../actions";

export const metadata: Metadata = { title: "Add a vehicle · Admin" };

const vehicleStatuses: VehicleStatusValue[] = [
  "DRAFT",
  "AVAILABLE",
  "UNAVAILABLE",
  "MAINTENANCE",
  "RETIRED",
];

const fuelTypes = ["PETROL", "DIESEL", "ELECTRIC", "CNG", "HYBRID"];

export default async function NewVehiclePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [categories, locations] = await Promise.all([
    staffRequest<ApiCategory[]>("/categories/manage"),
    staffRequest<ApiLocation[]>("/locations/manage"),
  ]);

  return (
    <AdminPage
      title="Add a vehicle"
      description="Creates the inventory record and its first pricing plan. Everything here is optional except the starred fields, and the plan name defaults to Standard."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <Link href="/admin/vehicles" className={adminButtonSoft}>
          Back to vehicles
        </Link>
      }
    >
      <form action={createVehicle} className="space-y-5">
        <input type="hidden" name="redirectTo" value="/admin/vehicles" />

        <AdminPanel
          title="Identity"
          description="What the bike or car is. The slug is generated from the name when left blank."
          bodyClassName="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Name" className="lg:col-span-2">
            <input name="name" required className={adminInput} placeholder="Ather 450X" />
          </Field>
          <Field label="Brand">
            <input name="brand" required className={adminInput} placeholder="Ather" />
          </Field>
          <Field label="Registration">
            <input
              name="registrationNumber"
              required
              className={adminInput}
              placeholder="PY01AB1234"
            />
          </Field>
          <Field label="Year">
            <input
              name="year"
              type="number"
              min={1990}
              max={2100}
              defaultValue={2025}
              className={adminInput}
            />
          </Field>
          <Field label="Custom slug" hint="kebab-case, e.g. ather-450x">
            <input name="slug" className={adminInput} placeholder="auto from name" />
          </Field>
          <Field label="Category">
            <select name="categoryId" required className={adminInput}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pickup hub">
            <select name="locationId" required className={adminInput}>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Transmission">
            <select name="transmission" className={adminInput} defaultValue="AUTOMATIC">
              <option value="AUTOMATIC">Automatic</option>
              <option value="MANUAL">Manual</option>
            </select>
          </Field>
          <Field label="Fuel">
            <select name="fuelType" className={adminInput} defaultValue="PETROL">
              {fuelTypes.map((fuel) => (
                <option key={fuel} value={fuel}>
                  {fuel}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Seats">
            <input
              name="seats"
              type="number"
              min={1}
              max={12}
              defaultValue={2}
              className={adminInput}
            />
          </Field>
          <Field label="Engine" hint="Free text, e.g. 6 kW or 124.8 cc">
            <input name="engine" required className={adminInput} placeholder="6 kW" />
          </Field>
          <Field label="Mileage" hint="Free text, e.g. 85 km range">
            <input name="mileage" required className={adminInput} placeholder="85 km range" />
          </Field>
          <Field label="Status" hint="Only AVAILABLE vehicles reach customers.">
            <select name="status" className={adminInput} defaultValue="DRAFT">
              {vehicleStatuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Included km per day"
            hint="Blank means unlimited kilometres."
            className="lg:col-span-2"
          >
            <input
              name="mileageLimitKm"
              type="number"
              min={0}
              step={1}
              className={adminInput}
              placeholder="180"
            />
          </Field>
          <Field label="Description" className="sm:col-span-2 lg:col-span-4">
            <textarea
              name="description"
              required
              minLength={10}
              className={adminTextarea}
              placeholder="What makes this vehicle a good pick?"
            />
          </Field>
          <label className="flex items-center gap-2 text-[12px] font-semibold text-ink-soft lg:col-span-2">
            <input type="checkbox" name="popular" className="size-4 accent-brand-600" />
            Feature in &quot;Popular rides&quot; on the home screen
          </label>
        </AdminPanel>

        <AdminPanel
          title="Day-rate pricing"
          description="Stored as the vehicle's first plan. Discounts left blank simply do not apply."
          bodyClassName="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Plan name">
            <input name="planName" defaultValue="Standard" className={adminInput} />
          </Field>
          <Field label="Day rate (₹)">
            <input
              name="baseDayRate"
              type="number"
              min={0}
              step="0.01"
              required
              className={adminInput}
              placeholder="699"
            />
          </Field>
          <Field label="Extra km (₹)">
            <input
              name="extraKmRate"
              type="number"
              min={0}
              step="0.01"
              required
              className={adminInput}
              placeholder="6"
            />
          </Field>
          <Field label="Deposit (₹)">
            <input
              name="depositAmount"
              type="number"
              min={0}
              step="0.01"
              required
              className={adminInput}
              placeholder="1500"
            />
          </Field>
          <Field label="Min days">
            <input
              name="minDays"
              type="number"
              min={1}
              defaultValue={1}
              className={adminInput}
            />
          </Field>
          <Field label="Weekly discount %">
            <input
              name="weeklyDiscountPercent"
              type="number"
              min={0}
              max={100}
              step="0.01"
              className={adminInput}
              placeholder="10"
            />
          </Field>
          <Field label="Monthly discount %">
            <input
              name="monthlyDiscountPercent"
              type="number"
              min={0}
              max={100}
              step="0.01"
              className={adminInput}
              placeholder="20"
            />
          </Field>
          <Field label="Plan valid from" hint="Blank starts today.">
            <input name="validFrom" type="date" className={adminInput} />
          </Field>
          <Field label="Plan valid to" hint="Blank means it does not expire.">
            <input name="validTo" type="date" className={adminInput} />
          </Field>
        </AdminPanel>

        <AdminPanel
          title="Primary photo"
          description="The app loads this path from the website origin, so the file must already exist in apps/web/public before riders can see it."
          bodyClassName="grid gap-4 px-5 py-5 sm:grid-cols-2"
        >
          <Field label="Image path or URL">
            <input
              name="imageUrl"
              className={adminInput}
              placeholder="/images/vehicles/ather-450x.jpg"
            />
          </Field>
          <Field label="Alt text" hint="Defaults to the vehicle name.">
            <input name="imageAlt" className={adminInput} placeholder="Ather 450X in Puducherry" />
          </Field>
        </AdminPanel>

        <div className="flex flex-wrap items-center gap-3">
          <button className={adminButton} type="submit">
            Create vehicle
          </button>
          <Link href="/admin/vehicles" className={adminButtonSoft}>
            Cancel
          </Link>
          <p className="text-[12px] text-muted">
            More photos after creation: the vehicle gallery holds up to ten images.
          </p>
        </div>
      </form>
    </AdminPage>
  );
}

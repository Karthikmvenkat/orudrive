import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import {
  AdminNotice,
  AdminPage,
  AdminPanel,
  adminButtonSoft,
  firstParam,
} from "@/components/admin/ui";
import { VehicleWizard } from "@/components/partner/vehicle-wizard";
import { vendorRequest } from "@/lib/api/server";
import type { ApiCategory, ApiLocation } from "@/lib/api/types";
import { submitVehicleForApproval } from "../../actions";

export const metadata: Metadata = { title: "Add New Vehicle" };

export default async function PartnerNewVehiclePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [categories, locations] = await Promise.all([
    vendorRequest<ApiCategory[]>("/categories"),
    vendorRequest<ApiLocation[]>("/locations"),
  ]);

  return (
    <AdminPage
      title="Add New Vehicle"
      description="Five steps: basics, specifications, photos, pricing and availability. When you submit, the listing is filed with Master Admin as Pending approval."
    >
      <AdminNotice
        notice={firstParam(params.notice)}
        error={firstParam(params.error)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/partner/vehicles" className={adminButtonSoft}>
          <ArrowLeft className="size-4" /> Back to my vehicles
        </Link>
        <p className="text-[11.5px] text-muted">
          Nothing here is live to riders until Master Admin approves the vehicle and its RC and
          insurance.
        </p>
      </div>

      <VehicleWizard
        categories={categories}
        locations={locations}
        action={submitVehicleForApproval}
      />

      <AdminPanel title="What happens after you submit">
        <ol className="divide-y divide-line">
          {[
            {
              title: "Saved as a draft on your fleet",
              body: "Partners cannot grant themselves the Available status, so the API files every new listing as DRAFT.",
            },
            {
              title: "Master Admin reviews the paperwork",
              body: "RC, insurance and GST sit in the platform verification queue. Upload them from My Documents so the review can be finished in one pass.",
            },
            {
              title: "Approved vehicles go live",
              body: "Once status becomes Available the listing appears on the SavariGo website and mobile app at the day rate you set.",
            },
            {
              title: "Bookings arrive on this portal",
              body: "New requests land in Booking Requests, then Active Rentals after you accept, and Rental History when the trip closes.",
            },
          ].map((entry, index) => (
            <li key={entry.title} className="flex gap-3 px-5 py-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 text-[12px] font-bold text-brand-700">
                {index + 1}
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-ink">{entry.title}</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">
                  {entry.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="flex items-start gap-2 border-t border-line px-5 py-4 text-[11.5px] leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-700" />
          SavariGo records your commission rate on every booking, so the payout you see in My
          Earnings & Payments always matches the rate Master Admin approved for your partner
          account.
        </p>
      </AdminPanel>
    </AdminPage>
  );
}

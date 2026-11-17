import type { Metadata } from "next";
import Link from "next/link";
import { Building, CircleUser, Percent, Save, ShieldCheck } from "lucide-react";
import {
  AdminPage,
  AdminPanel,
  Field,
  adminButton,
  adminInput,
  firstParam,
  when,
} from "@/components/admin/ui";
import { PartnerStatusBadge } from "@/components/portal/badges";
import { StatCard, StatGrid } from "@/components/portal/ui";
import { vendorRequest } from "@/lib/api/server";
import type { VendorOverview, VendorProfile } from "@/lib/api/types";
import { updatePartnerProfile } from "../actions";

export const metadata: Metadata = { title: "Profile & Settings" };

export default async function PartnerProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [profile, overview] = await Promise.all([
    vendorRequest<VendorProfile>("/vendor/profile"),
    vendorRequest<VendorOverview>("/vendor/overview"),
  ]);

  return (
    <AdminPage
      title="Profile & Settings"
      description="Your trading identity as Master Admin sees it. Commission and approval status are controlled by the platform, so they are read-only here."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <Link href="/partner/documents" className={adminButton}>
          <ShieldCheck className="size-4" /> My documents
        </Link>
      }
    >
      <StatGrid columns={4}>
        <StatCard
          label="Partner code"
          value={profile.partnerCode}
          hint="Quote this in every support ticket"
          icon={CircleUser}
        />
        <StatCard
          label="Approval status"
          value={profile.status}
          hint={profile.approvedAt ? `Approved ${when(profile.approvedAt)}` : "Not approved yet"}
          icon={ShieldCheck}
          tint={profile.status === "APPROVED" ? "mint" : "butter"}
        />
        <StatCard
          label="Platform commission"
          value={`${profile.commissionPercent}%`}
          hint={`You keep ${100 - profile.commissionPercent}% of every booking`}
          icon={Percent}
          tint="peach"
        />
        <StatCard
          label="Fleet size"
          value={String(overview.vehicles.total)}
          hint={`${overview.vehicles.available} live for booking`}
          icon={Building}
          tint="sky"
        />
      </StatGrid>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <AdminPanel
          title="Trading details"
          description="These appear on invoices, partner listings and payouts."
        >
          <form action={updatePartnerProfile} className="grid gap-3 p-5 lg:grid-cols-2">
            <input type="hidden" name="redirectTo" value="/partner/profile" />
            <Field label="Trading name" hint="2–80 characters, required by the API">
              <input
                name="tradingName"
                required
                minLength={2}
                maxLength={80}
                defaultValue={profile.tradingName}
                className={adminInput}
              />
            </Field>
            <Field label="Legal name">
              <input
                name="legalName"
                maxLength={120}
                defaultValue={profile.legalName ?? ""}
                className={adminInput}
              />
            </Field>
            <Field label="Phone">
              <input
                name="phone"
                maxLength={20}
                placeholder="+91 98400 12345"
                defaultValue={profile.phone ?? ""}
                className={adminInput}
              />
            </Field>
            <Field label="GSTIN" hint="15 characters, eg 33AABCP1234F1Z5">
              <input
                name="gstin"
                maxLength={15}
                defaultValue={profile.gstin ?? ""}
                className={adminInput}
              />
            </Field>
            <Field label="City">
              <input name="city" maxLength={60} defaultValue={profile.city} className={adminInput} />
            </Field>
            <Field label="State">
              <input
                name="state"
                maxLength={60}
                defaultValue={profile.state}
                className={adminInput}
              />
            </Field>
            <Field label="Address" className="lg:col-span-2">
              <input
                name="addressLine1"
                maxLength={200}
                defaultValue={profile.addressLine1 ?? ""}
                className={adminInput}
              />
            </Field>
            <Field
              label="Logo URL"
              className="lg:col-span-2"
              hint="Absolute https:// URL or a path on this site, eg /images/partners/pondy.jpg"
            >
              <input
                name="logoUrl"
                maxLength={500}
                defaultValue={profile.logoUrl ?? ""}
                className={adminInput}
              />
            </Field>
            <div className="lg:col-span-2">
              <button className={adminButton} type="submit">
                <Save className="size-4" /> Save profile
              </button>
            </div>
          </form>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel title="Controlled by Master Admin">
            <dl className="divide-y divide-line">
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <dt className="text-[12.5px] text-muted">Partner code</dt>
                <dd className="font-mono text-[13px] font-semibold text-ink">
                  {profile.partnerCode}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <dt className="text-[12.5px] text-muted">Approval status</dt>
                <dd>
                  <PartnerStatusBadge status={profile.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <dt className="text-[12.5px] text-muted">Commission</dt>
                <dd className="text-[13px] font-semibold tabular-nums text-ink">
                  {profile.commissionPercent}%
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <dt className="text-[12.5px] text-muted">Account email</dt>
                <dd className="text-right text-[12.5px] text-ink-soft">{profile.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <dt className="text-[12.5px] text-muted">Roles on this account</dt>
                <dd className="text-right text-[12px] text-ink-soft">{profile.roles.join(", ")}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <dt className="text-[12.5px] text-muted">Joined</dt>
                <dd className="text-[12.5px] text-ink-soft">{when(profile.createdAt)}</dd>
              </div>
            </dl>
            <p className="border-t border-line px-5 py-4 text-[11.5px] leading-relaxed text-muted">
              Changing commission needs a Master Admin decision — raise a Support ticket and quote{" "}
              {profile.partnerCode}.
            </p>
          </AdminPanel>

          <AdminPanel title="Decision note">
            <p className="px-5 py-4 text-[12.5px] leading-relaxed text-ink-soft">
              {profile.decisionNote ??
                "Master Admin has not left a note on your partner record."}
            </p>
          </AdminPanel>
        </div>
      </div>
    </AdminPage>
  );
}

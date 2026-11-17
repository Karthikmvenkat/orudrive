import type { Metadata } from "next";
import { AdminPage, firstParam } from "@/components/admin/ui";
import { CustomersPanel } from "@/components/admin/customers-panel";
import { DriversPanel } from "@/components/admin/drivers-panel";
import { PortalTabs } from "@/components/portal/ui";

export const metadata: Metadata = { title: "User Management" };

const TABS = [
  { key: "customers", label: "Customers" },
  { key: "drivers", label: "Drivers" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = TABS.some((entry) => entry.key === firstParam(params.tab))
    ? String(params.tab)
    : "customers";
  const page = Number(firstParam(params.page) ?? "1") || 1;

  return (
    <AdminPage
      title="User Management"
      description="Every rider and chauffeur account on the platform, with verification state."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <p className="text-[12px] text-muted">
          {overviewHint(tab)}
        </p>
      }
    >
      <PortalTabs tabs={TABS} active={tab} basePath="/admin/users" />
      {tab === "customers" ? (
        <CustomersPanel q={firstParam(params.q)} city={firstParam(params.city)} page={page} />
      ) : (
        <DriversPanel status={firstParam(params.status)} q={firstParam(params.q)} page={page} />
      )}
    </AdminPage>
  );
}

function overviewHint(tab: string) {
  return tab === "customers"
    ? "Rider profiles, licence checks and booking totals."
    : "Chauffeur applications, rates and availability.";
}

import { PortalShell } from "@/components/portal/shell";
import { PARTNER_NAV, PARTNER_SECONDARY_LINKS, PARTNER_TITLES } from "@/components/portal/nav";
import { requireUser } from "@/lib/api/server";

export default async function PartnerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(["VENDOR"], "/partner");

  return (
    <PortalShell
      user={user}
      nav={PARTNER_NAV}
      titles={PARTNER_TITLES}
      brandLabel="SavariGo Partners"
      roleLabel="Rental Partner"
      homeHref="/partner"
      notificationsHref="/partner/notifications"
      secondaryLinks={PARTNER_SECONDARY_LINKS}
    >
      {children}
    </PortalShell>
  );
}

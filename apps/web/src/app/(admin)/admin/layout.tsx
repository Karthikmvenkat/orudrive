import { PortalShell } from "@/components/portal/shell";
import { ADMIN_EXTERNAL_LINKS, ADMIN_NAV, ADMIN_SECONDARY_LINKS, ADMIN_TITLES } from "@/components/portal/nav";
import { requireUser } from "@/lib/api/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["ADMIN", "SUPPORT"], "/admin");

  return (
    <PortalShell
      user={user}
      nav={ADMIN_NAV}
      titles={ADMIN_TITLES}
      brandLabel="SavariGo Admin"
      roleLabel="Master Admin"
      homeHref="/admin"
      notificationsHref="/admin/notifications"
      secondaryLinks={ADMIN_SECONDARY_LINKS}
      externalLinks={ADMIN_EXTERNAL_LINKS}
    >
      {children}
    </PortalShell>
  );
}

import Link from "next/link";
import { Hourglass } from "lucide-react";
import { PortalShell } from "@/components/portal/shell";
import { PARTNER_NAV, PARTNER_SECONDARY_LINKS, PARTNER_TITLES } from "@/components/portal/nav";
import { requireUser, vendorRequest } from "@/lib/api/server";
import type { VendorProfile } from "@/lib/api/types";

export default async function PartnerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(["VENDOR"], "/partner");
  const profile = await vendorRequest<VendorProfile>("/vendor/profile").catch(
    () => null,
  );

  if (profile && profile.status !== "APPROVED") {
    return (
      <div className="grid min-h-screen place-items-center bg-page p-6">
        <div className="w-full max-w-md rounded-panel border border-line bg-white p-7 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-brand-50 text-brand-700">
            <Hourglass className="size-5" />
          </span>
          <h1 className="mt-3 text-[19px] font-extrabold text-ink">
            {profile.status === "PENDING"
              ? "Application under review"
              : profile.status === "REJECTED"
                ? "Application declined"
                : "Partner account suspended"}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {profile.status === "PENDING"
              ? "Master Admin is reviewing your application. The partner portal opens as soon as it is approved."
              : "Sign-in stays closed until Master Admin restores your partner account."}
          </p>
          {profile.decisionNote && (
            <p className="mt-3 rounded-[14px] bg-page/70 p-3 text-[12.5px] text-ink-soft">
              {profile.decisionNote}
            </p>
          )}
          <Link
            href="/contact"
            className="mt-4 inline-flex text-[12.5px] font-semibold text-brand-700 hover:underline"
          >
            Contact support
          </Link>
        </div>
      </div>
    );
  }

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

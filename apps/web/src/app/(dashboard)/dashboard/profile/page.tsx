import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardHero } from "@/components/dashboard/ui";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { myCustomerProfile } from "@/lib/api/account";
import { getAccessToken, getSessionUser } from "@/lib/api/server";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const [user, token] = await Promise.all([getSessionUser(), getAccessToken()]);
  if (!user || !token) redirect("/login?next=/dashboard/profile");
  const profile = await myCustomerProfile(token);

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="Account"
        title="Profile & Settings"
        description="Keep your contact details current so pickups and invoices reach you on time."
      />
      <ProfileForm user={user} profile={profile} />
    </div>
  );
}

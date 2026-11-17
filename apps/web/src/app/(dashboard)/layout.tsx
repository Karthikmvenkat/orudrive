import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { requireUser } from "@/lib/api/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(undefined, "/dashboard");

  return (
    <div className="min-h-dvh bg-page">
      <div className="flex">
        <DashboardSidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar user={user} />
          <main id="main" className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

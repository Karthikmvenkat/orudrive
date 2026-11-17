"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarCheck,
  CarFront,
  ClipboardList,
  Coins,
  FileClock,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Settings,
  ShieldCheck,
  Star,
  Tags,
  Ticket,
  Users,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Avatar, AvatarFallback } from "@/components/ui/overlay";
import { cn, initials } from "@/lib/utils";
import type { ApiMe } from "@/lib/api/types";
import { useSession } from "@/lib/session";

const nav = [
  {
    group: "Operations",
    links: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck },
      { label: "Payments", href: "/admin/payments", icon: Coins },
    ],
  },
  {
    group: "Catalogue",
    links: [
      { label: "Vehicles", href: "/admin/vehicles", icon: CarFront },
      { label: "Categories", href: "/admin/categories", icon: Tags },
      { label: "Locations", href: "/admin/locations", icon: MapPinned },
    ],
  },
  {
    group: "People",
    links: [
      { label: "Customers", href: "/admin/customers", icon: Users },
      { label: "Drivers", href: "/admin/drivers", icon: ShieldCheck },
    ],
  },
  {
    group: "Growth",
    links: [
      { label: "Coupons", href: "/admin/coupons", icon: Ticket },
      { label: "Reviews", href: "/admin/reviews", icon: Star },
    ],
  },
  {
    group: "System",
    links: [
      { label: "Settings", href: "/admin/settings", icon: Settings },
      { label: "Audit log", href: "/admin/audit", icon: FileClock },
      { label: "API docs", href: "http://localhost:4100/docs", icon: BookOpen, external: true },
    ],
  },
];

const titles: Record<string, string> = {
  "/admin": "Operations overview",
  "/admin/bookings": "Bookings",
  "/admin/payments": "Payments & refunds",
  "/admin/vehicles": "Fleet",
  "/admin/categories": "Categories",
  "/admin/locations": "Pickup locations",
  "/admin/customers": "Customers",
  "/admin/drivers": "Drivers",
  "/admin/coupons": "Coupons",
  "/admin/reviews": "Reviews",
  "/admin/settings": "Platform settings",
  "/admin/audit": "Audit log",
};

function displayName(user: ApiMe) {
  return user.customerProfile?.fullName ?? user.email.split("@")[0];
}

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export function AdminShell({
  user,
  children,
}: {
  user: ApiMe;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useSession();

  return (
    <div className="min-h-dvh bg-page">
      <div className="flex">
        <aside className="sticky top-0 hidden h-dvh w-[252px] shrink-0 flex-col overflow-y-auto border-r border-line bg-forest px-3 py-5 lg:flex">
          <Link href="/admin" className="px-3" aria-label="SavariGo admin">
            <span className="text-[18px] font-extrabold tracking-[-0.02em] text-white">
              SavariGo <span className="text-brand-400">Admin</span>
            </span>
          </Link>

          <nav className="mt-6 space-y-5">
            {nav.map((group) => (
              <div key={group.group}>
                <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {group.group}
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {group.links.map((link) => {
                    const active = isActive(pathname, link.href);
                    const content = (
                      <>
                        <link.icon
                          className={cn(
                            "size-[17px]",
                            active ? "text-brand-300" : "text-white/50",
                          )}
                          strokeWidth={active ? 2.1 : 1.9}
                        />
                        {link.label}
                      </>
                    );
                    return (
                      <li key={link.href}>
                        {link.external ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                          >
                            {content}
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition",
                              active
                                ? "bg-white/12 font-semibold text-white"
                                : "text-white/70 hover:bg-white/10 hover:text-white",
                            )}
                          >
                            {content}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="mt-auto pt-5">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <ClipboardList className="size-4" /> Back to website
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <div className="lg:hidden">
                <Logo />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-ink">
                  {titles[pathname] ?? "Admin"}
                </p>
                <p className="hidden text-[11px] text-muted sm:block">
                  Signed in as {user.roles.filter((role) => role !== "CUSTOMER").join(", ")}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Avatar className="size-9">
                  <AvatarFallback>{initials(displayName(user))}</AvatarFallback>
                </Avatar>
                <div className="hidden text-right sm:block">
                  <p className="text-[12.5px] font-semibold text-ink">{displayName(user)}</p>
                  <p className="text-[10.5px] text-muted">{user.email}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-1 overflow-x-auto border-t border-line px-3 py-1.5 lg:hidden">
              {nav.flatMap((group) => group.links).filter((link) => !link.external).map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition",
                      active
                        ? "bg-brand-50 text-brand-800"
                        : "text-muted hover:bg-page hover:text-ink",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </header>

          <main id="main" className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

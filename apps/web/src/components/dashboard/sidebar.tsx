"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, LogOut, Menu } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { SheetContent, Dialog, DialogTrigger, Avatar, AvatarFallback } from "@/components/ui/overlay";
import { dashboardNav } from "@/components/dashboard/nav-items";
import { useSession } from "@/lib/session";
import type { ApiMe } from "@/lib/api/types";
import { cn, initials } from "@/lib/utils";

function displayName(user: ApiMe) {
  return user.customerProfile?.fullName ?? user.email.split("@")[0];
}

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6">
      {dashboardNav.map((group) => (
        <div key={group.group}>
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted/70">
            {group.group}
          </p>
          <ul className="mt-2 space-y-1">
            {group.links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition",
                      active
                        ? "bg-brand-50 text-brand-800"
                        : "text-ink-soft hover:bg-page hover:text-ink",
                    )}
                  >
                    <link.icon
                      className={cn("size-[18px]", active ? "text-brand-600" : "text-muted")}
                      strokeWidth={active ? 2.2 : 1.9}
                    />
                    {link.label}
                    {link.badge && (
                      <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1.5 text-[10.5px] font-bold text-white">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DashboardSidebar({ user }: { user: ApiMe }) {
  const { signOut } = useSession();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[256px] shrink-0 flex-col border-r border-line bg-white px-4 py-5 lg:flex">
      <Logo className="px-2" />

      <div className="mt-7 flex-1 overflow-y-auto">
        <NavList />
      </div>

      <div className="mt-4 rounded-panel bg-forest p-4">
        <p className="text-[13px] font-bold text-white">Need a hand?</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-white/60">
          Our support team replies in under 2 minutes, 24×7.
        </p>
        <Button asChild size="sm" className="mt-3 w-full bg-white text-forest hover:bg-brand-50">
          <Link href="/contact">Chat with us</Link>
        </Button>
      </div>

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-3 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-ink-soft transition hover:bg-page hover:text-ink"
      >
        <LogOut className="size-[18px] text-muted" />
        Sign out
      </button>
    </aside>
  );
}

export function MobileDashboardNav({ user }: { user: ApiMe }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <SheetContent side="left" className="px-4 py-5">
        <Logo className="px-2" />
        <div className="mt-6 flex-1 overflow-y-auto">
          <NavList />
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-line p-3">
          <Avatar>
            <AvatarFallback>{initials(displayName(user))}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-ink">{displayName(user)}</p>
            <p className="truncate text-[11.5px] text-muted">{user.email}</p>
          </div>
          <ChevronsUpDown className="size-4 text-muted" />
        </div>
      </SheetContent>
    </Dialog>
  );
}

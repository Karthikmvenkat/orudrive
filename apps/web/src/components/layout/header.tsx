"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Headset, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { Logo } from "@/components/shared/logo";

const menus = [
  {
    label: "For Riders",
    links: [
      { label: "Bikes & Scooters", href: "/bikes-scooters" },
      { label: "Cars", href: "/cars" },
      { label: "Tow Vehicle", href: "/tow-vehicle" },
      { label: "Acting Drivers", href: "/driver-on-demand" },
      { label: "Mobile Puncher", href: "/mobile-puncher" },
    ],
  },
  {
    label: "For Drivers",
    links: [
      { label: "Become a partner", href: "/list-your-vehicle" },
      { label: "Partner portal", href: "/partner" },
      { label: "How SavariGo works", href: "/how-it-works" },
    ],
  },
  {
    label: "For Businesses",
    links: [
      { label: "List your fleet", href: "/list-your-vehicle" },
      { label: "Corporate rides", href: "/contact" },
      { label: "About SavariGo", href: "/about" },
    ],
  },
];

export function Header() {
  const { user, loading, isStaff } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);

  const firstName =
    user?.customerProfile?.fullName?.split(" ")[0] ??
    user?.email.split("@")[0] ??
    "";
  const initials = firstName.slice(0, 2).toUpperCase();
  const profileHref = isStaff ? "/admin" : "/dashboard";
  const profileLabel = user
    ? isStaff
      ? "Admin console"
      : firstName
    : "Sign in";

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/90 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center gap-3 xl:h-[84px]">
        <Logo className="shrink-0" />

        <nav
          aria-label="Primary"
          className="mx-auto hidden items-center gap-1 lg:flex"
        >
          <Link
            href="/"
            className={cn(
              "rounded-full px-5 py-2.5 text-[14px] font-semibold transition",
              pathname === "/"
                ? "bg-forest text-white"
                : "text-ink-soft hover:bg-brand-50 hover:text-forest",
            )}
          >
            Home
          </Link>

          {menus.map((menu) => {
            const active = menu.links.some((link) =>
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href),
            );
            return (
              <div
                key={menu.label}
                className="relative"
                onMouseEnter={() => setOpen(menu.label)}
                onMouseLeave={() =>
                  setOpen((current) => (current === menu.label ? null : current))
                }
                onFocus={() => setOpen(menu.label)}
                onBlur={(event) => {
                  if (
                    !event.currentTarget.contains(
                      event.relatedTarget as Node | null,
                    )
                  ) {
                    setOpen((current) =>
                      current === menu.label ? null : current,
                    );
                  }
                }}
              >
                <button
                  type="button"
                  aria-expanded={open === menu.label}
                  onClick={() =>
                    setOpen(open === menu.label ? null : menu.label)
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[14px] font-semibold transition",
                    active
                      ? "text-forest"
                      : "text-ink-soft hover:bg-brand-50 hover:text-forest",
                  )}
                >
                  {menu.label}
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-muted transition-transform",
                      open === menu.label && "rotate-180",
                    )}
                  />
                </button>
                {open === menu.label && (
                  <div className="absolute left-1/2 top-full -translate-x-1/2 pt-2">
                    <div className="min-w-[214px] rounded-2xl border border-line bg-white p-2 shadow-lift">
                      {menu.links.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          onClick={() => setOpen(null)}
                          className="block rounded-xl px-3 py-2 text-[13.5px] font-medium text-ink-soft transition hover:bg-brand-50 hover:text-forest"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4 lg:ml-0">
          <Link
            href="/contact"
            className="hidden items-center gap-2 text-[14px] font-semibold text-ink-soft transition hover:text-brand-700 sm:inline-flex"
          >
            Support
            <Headset className="size-[18px]" />
          </Link>
          <span className="hidden h-7 w-px bg-line sm:block" aria-hidden />

          {loading ? (
            <span className="block size-10 animate-pulse rounded-full bg-page" />
          ) : (
            <Link
              href={user ? profileHref : "/login"}
              aria-label={user ? `Account: ${profileLabel}` : "Sign in"}
              className={cn(
                "grid size-10 place-items-center rounded-full border text-[12px] font-bold transition",
                user
                  ? "border-brand-500 bg-brand-500 text-white hover:bg-brand-600"
                  : "border-ink/25 bg-white text-ink-soft hover:border-brand-500 hover:text-brand-700",
              )}
            >
              {user ? initials : <UserRound className="size-[19px]" />}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

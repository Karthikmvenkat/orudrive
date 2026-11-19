"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { Logo } from "@/components/shared/logo";

export function Header() {
  const { user, loading, isStaff } = useSession();
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
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center xl:h-[72px]">
        <Logo />

        <div className="ml-auto">
          {loading ? (
            <span className="block h-9 w-24 animate-pulse rounded-full bg-page" />
          ) : (
            <Link
              href={user ? profileHref : "/login"}
              aria-label={user ? `Account: ${profileLabel}` : "Sign in"}
              className="inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-1 text-[13px] font-semibold text-ink-soft transition hover:text-brand-700 sm:pr-3"
            >
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-full text-[12px] font-bold",
                  user
                    ? "bg-brand-500 text-white"
                    : "border border-line bg-white text-ink-soft",
                )}
              >
                {user ? initials : <UserRound className="size-4" />}
              </span>
              <span className={cn("hidden sm:block", user && "capitalize")}>
                {profileLabel}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

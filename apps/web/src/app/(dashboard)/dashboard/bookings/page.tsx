import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardHero } from "@/components/dashboard/ui";
import { BookingsList } from "@/components/dashboard/bookings-list";
import { myBookings } from "@/lib/api/account";
import { toBooking } from "@/lib/api/adapters";
import { getAccessToken } from "@/lib/api/server";

export const metadata: Metadata = { title: "My Bookings" };

export default async function BookingsPage() {
  const token = await getAccessToken();
  if (!token) redirect("/login?next=/dashboard/bookings");
  const bookings = (await myBookings(token, 100)).map(toBooking);

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="Your rides"
        title="My Bookings"
        description="Track upcoming pickups, revisit past rides and download invoices."
        action={
          <Button asChild variant="outline">
            <Link href="/bikes-scooters">
              New booking <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />
      <BookingsList bookings={bookings} />
    </div>
  );
}

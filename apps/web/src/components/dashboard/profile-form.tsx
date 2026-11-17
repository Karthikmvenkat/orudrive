"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/controls";
import { Avatar, AvatarFallback } from "@/components/ui/overlay";
import { Panel } from "@/components/dashboard/ui";
import type { ApiCustomerProfile, ApiMe } from "@/lib/api/types";
import { initials } from "@/lib/utils";

const profileSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  city: z.string().min(2, "Enter your city"),
  licenceNumber: z.string().max(40).optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;
type Prefs = { bookings: boolean; offers: boolean; sms: boolean };

export function ProfileForm({
  user,
  profile,
}: {
  user: ApiMe;
  profile: ApiCustomerProfile | null;
}) {
  const router = useRouter();
  const name = profile?.fullName ?? user.email.split("@")[0];
  const storedPrefs = (profile?.preferences ?? {}) as Partial<Prefs>;
  const [prefs, setPrefs] = useState<Prefs>({
    bookings: storedPrefs.bookings ?? true,
    offers: storedPrefs.offers ?? true,
    sms: storedPrefs.sms ?? false,
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name,
      email: user.email,
      phone: profile?.phone ?? user.phone ?? "",
      city: profile?.city ?? "Puducherry",
      licenceNumber: profile?.licenceNumber ?? "",
    },
  });

  const memberSince = new Date(profile?.memberSince ?? user.createdAt).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" },
  );

  const onSubmit = async (values: ProfileValues) => {
    try {
      const profileResponse = await fetch("/api/proxy/customers/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.name.trim(),
          city: values.city.trim(),
          ...(values.licenceNumber?.trim()
            ? { licenceNumber: values.licenceNumber.trim() }
            : {}),
        }),
      });
      if (!profileResponse.ok) {
        const payload = (await profileResponse.json().catch(() => null)) as {
          message?: string;
        } | null;
        toast.error(payload?.message ?? "Could not update your profile.");
        return;
      }
      const phone = values.phone.replace(/[\s-]/g, "").replace(/^\+91/, "");
      if (phone !== (profile?.phone ?? user.phone ?? "").replace(/[\s-]/g, "").replace(/^\+91/, "")) {
        const phoneResponse = await fetch("/api/proxy/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        if (!phoneResponse.ok) {
          toast.error("Profile saved, but the phone number could not be updated.");
          router.refresh();
          return;
        }
      }
      reset(values);
      toast.success("Profile updated");
      router.refresh();
    } catch {
      toast.error("Could not update your profile. Please try again.");
    }
  };

  const togglePref = async (key: keyof Prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    const response = await fetch("/api/proxy/customers/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: next }),
    }).catch(() => null);
    if (!response?.ok) {
      setPrefs(prefs);
      toast.error("Could not save your notification preference.");
    }
  };

  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Avatar className="size-16">
            <AvatarFallback className="text-lg">{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-ink">{name}</p>
            <p className="text-[12px] text-muted">
              Member since {memberSince} · {profile?.city ?? "Puducherry"}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <Camera className="size-3.5" /> Photo upload coming soon
          </span>
        </div>
      </Panel>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Panel title="Personal information">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="mt-1 text-[11px] text-danger">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Mobile number</Label>
              <Input id="phone" inputMode="tel" {...register("phone")} />
              {errors.phone && (
                <p className="mt-1 text-[11px] text-danger">{errors.phone.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" disabled {...register("email")} />
              <p className="mt-1 text-[10.5px] text-muted">
                Contact support to change your login email.
              </p>
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
              {errors.city && <p className="mt-1 text-[11px] text-danger">{errors.city.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="licence">Driving licence number</Label>
              <Input
                id="licence"
                placeholder="TN0120190012345"
                {...register("licenceNumber")}
              />
              <p className="mt-1 text-[10.5px] text-muted">
                Verified at pick-up. Changing it may require re-verification.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
            <p className="text-[11.5px] text-muted">
              Company invoices can be issued against this address.
            </p>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </Panel>
      </form>

      <Panel title="Notifications">
        <ul className="divide-y divide-line">
          {[
            {
              key: "bookings" as const,
              label: "Booking updates",
              detail: "Pickup reminders, return alerts and invoice emails.",
            },
            {
              key: "offers" as const,
              label: "Offers & promotions",
              detail: "Weekly discounts and seasonal coupons.",
            },
            {
              key: "sms" as const,
              label: "SMS alerts",
              detail: "Text messages for pickup and drop reminders.",
            },
          ].map((item) => (
            <li key={item.key} className="flex items-start gap-3 px-5 py-3.5">
              <Checkbox
                id={`pref-${item.key}`}
                checked={prefs[item.key]}
                onCheckedChange={() => void togglePref(item.key)}
                className="mt-0.5"
              />
              <label htmlFor={`pref-${item.key}`} className="cursor-pointer">
                <span className="block text-[12.5px] font-semibold text-ink">{item.label}</span>
                <span className="block text-[11.5px] text-muted">{item.detail}</span>
              </label>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Security">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[12.5px] font-semibold text-ink">Password</p>
            <p className="text-[11.5px] text-muted">Last changed 4 months ago.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/forgot-password">
              <KeyRound className="size-4" /> Change password
            </Link>
          </Button>
        </div>
      </Panel>
    </div>
  );
}

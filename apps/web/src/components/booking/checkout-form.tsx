"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarDays,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Smartphone,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Vehicle } from "@/types";
import type { CheckoutLocation } from "@/lib/api/adapters";
import type { ApiBooking, ApiQuote } from "@/lib/api/types";
import { cn, inr, nightsBetween } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Checkbox, RadioGroup, RadioGroupItem } from "@/components/ui/controls";
import { pickupLocations } from "@/lib/data/categories";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (payload: unknown) => void) => void;
    };
  }
}

interface RazorpayOrder {
  paymentId: string;
  bookingId: string;
  bookingCode: string;
  amount: number;
  amountPaise: number;
  currency: string;
  keyId?: string;
  order: { id: string; amount: number; currency: string; status: string };
}

const schema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    phone: z
      .string()
      .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    email: z.string().email("Enter a valid email address"),
    pickupDate: z.string().min(1, "Choose a pick-up date"),
    returnDate: z.string().min(1, "Choose a return date"),
    pickupLocation: z.string().min(1),
    payment: z.enum(["upi", "card", "pay_at_pickup"]),
    terms: z.boolean().refine((v) => v, "Please accept the rental terms"),
  })
  .refine((data) => new Date(data.returnDate) >= new Date(data.pickupDate), {
    path: ["returnDate"],
    message: "Return date cannot be before pick-up",
  });

type FormValues = z.infer<typeof schema>;

const paymentOptions = [
  {
    id: "upi" as const,
    label: "UPI / Google Pay / PhonePe",
    hint: "Instant confirmation",
    icon: Smartphone,
  },
  {
    id: "card" as const,
    label: "Credit / Debit Card",
    hint: "Visa, Mastercard, RuPay",
    icon: CreditCard,
  },
  {
    id: "pay_at_pickup" as const,
    label: "Pay at pick-up",
    hint: "Cash or UPI at the counter",
    icon: Banknote,
  },
];

function iso(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function atPickupTime(date: string) {
  return new Date(`${date}T09:00:00+05:30`).toISOString();
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message[0] ?? "Something went wrong";
    return data.message ?? "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutForm({
  vehicle,
  vehicleId,
  contact,
  locations,
  initialFrom,
  initialTo,
  initialCity,
  initialLocationId,
}: {
  vehicle: Vehicle;
  vehicleId?: string;
  contact?: { fullName: string; email: string; phone: string };
  locations?: CheckoutLocation[];
  initialFrom?: string;
  initialTo?: string;
  initialCity?: string;
  initialLocationId?: string;
}) {
  const router = useRouter();
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [quote, setQuote] = useState<ApiQuote | null>(null);

  const locationOptions =
    locations && locations.length > 0
      ? locations.map((loc) => ({ value: loc.name, id: loc.id }))
      : pickupLocations.map((loc) => ({ value: loc, id: undefined }));

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: contact?.fullName ?? "",
      phone: contact?.phone ?? "",
      email: contact?.email ?? "",
      pickupDate: initialFrom ?? "",
      returnDate: initialTo ?? "",
      pickupLocation:
        locationOptions.find((option) => option.value === initialCity)?.value ??
        initialCity ??
        vehicle.location,
      payment: "upi",
      terms: false,
    },
  });

  const pickupDate = watch("pickupDate");
  const returnDate = watch("returnDate");
  const payment = watch("payment");
  const pickupLocation = watch("pickupLocation");

  useEffect(() => {
    if (!initialFrom) setValue("pickupDate", iso(1));
    if (!initialTo) setValue("returnDate", iso(2));
  }, [initialFrom, initialTo, setValue]);

  const pickupLocationId =
    locationOptions.find((option) => option.value === pickupLocation)?.id ??
    (initialLocationId &&
    locationOptions.some((option) => option.value === pickupLocation)
      ? initialLocationId
      : undefined);

  useEffect(() => {
    if (!vehicleId || !pickupLocationId || !pickupDate || !returnDate) {
      setQuote(null);
      return;
    }
    if (new Date(returnDate) < new Date(pickupDate)) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/proxy/bookings/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleId,
            pickupLocationId,
            pickupAt: atPickupTime(pickupDate),
            returnAt: atPickupTime(returnDate),
            ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
          }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as ApiQuote;
        if (!cancelled) setQuote(data);
      } catch {
        // Keep the local estimate; submit surfaces the API error.
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [vehicleId, pickupLocationId, pickupDate, returnDate, appliedCoupon]);

  const days = useMemo(
    () => (pickupDate && returnDate ? nightsBetween(pickupDate, returnDate) : 1),
    [pickupDate, returnDate],
  );
  const rental = quote?.pricing.rentalAmount ?? vehicle.pricePerDay * days;
  const discount = quote?.pricing.discountAmount ?? appliedCoupon?.discount ?? 0;
  const tax = quote?.pricing.taxAmount ?? 0;
  const deposit = quote?.pricing.depositAmount ?? vehicle.deposit;
  const total = quote?.pricing.totalAmount ?? Math.max(0, rental - discount) + deposit;

  const applyCoupon = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    if (!vehicleId) {
      toast.error("Coupons are unavailable right now — please try again later.");
      return;
    }
    try {
      const response = await fetch("/api/proxy/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          vehicleId,
          durationDays: days,
          subtotal: rental,
        }),
      });
      if (!response.ok) {
        toast.error(await readError(response));
        return;
      }
      const result = (await response.json()) as {
        code: string;
        discount: number;
      };
      setAppliedCoupon({ code: result.code, discount: result.discount });
      toast.success(`Coupon applied — you saved ${inr(result.discount)}`);
    } catch {
      toast.error("Could not validate the coupon. Please try again.");
    }
  };

  const finish = (booking: ApiBooking, method: FormValues["payment"]) => {
    const params = new URLSearchParams({
      vehicle: vehicle.slug,
      from: booking.pickupAt.slice(0, 10),
      to: booking.returnAt.slice(0, 10),
      city: booking.pickupLocation.name,
      total: String(booking.amounts.totalAmount),
      payment: method,
    });
    router.push(`/booking/${booking.code}/confirmed?${params.toString()}`);
  };

  const onSubmit = async (values: FormValues) => {
    if (!vehicleId) {
      toast.error("Booking is temporarily unavailable. Please try again in a moment.");
      return;
    }
    if (!pickupLocationId) {
      toast.error("Choose a valid pick-up location.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/proxy/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          pickupLocationId,
          pickupAt: atPickupTime(values.pickupDate),
          returnAt: atPickupTime(values.returnDate),
          ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        }),
      });
      if (!response.ok) {
        toast.error(await readError(response));
        return;
      }
      const booking = (await response.json()) as ApiBooking;

      if (values.payment === "pay_at_pickup") {
        finish(booking, values.payment);
        return;
      }

      const orderResponse = await fetch("/api/proxy/payments/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          idempotencyKey: `booking-${booking.id}`,
        }),
      });

      if (orderResponse.status === 503) {
        toast.info(
          "Online payments aren't configured yet. Your booking is reserved — pay at pick-up.",
        );
        finish(booking, "pay_at_pickup");
        return;
      }
      if (!orderResponse.ok) {
        toast.error(await readError(orderResponse));
        return;
      }

      const order = (await orderResponse.json()) as RazorpayOrder;
      if (!order.keyId || !order.order?.id || !(await loadRazorpay())) {
        toast.info("Payment gateway unavailable. Your booking is reserved — pay at pick-up.");
        finish(booking, "pay_at_pickup");
        return;
      }

      const checkout = new window.Razorpay!({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: "SavariGo",
        description: `${vehicle.name} · ${booking.code}`,
        order_id: order.order.id,
        prefill: {
          name: values.fullName,
          email: values.email,
          contact: values.phone,
        },
        theme: { color: "#4caf2b" },
        handler: async (result: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verify = await fetch("/api/proxy/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: result.razorpay_order_id,
              razorpayPaymentId: result.razorpay_payment_id,
              razorpaySignature: result.razorpay_signature,
            }),
          });
          if (!verify.ok) {
            toast.error(await readError(verify));
            finish(booking, "pay_at_pickup");
            return;
          }
          finish(booking, values.payment);
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            toast.info(
              `Payment cancelled — booking ${booking.code} is reserved. Complete payment from My Bookings.`,
            );
          },
        },
      });
      checkout.on("payment.failed", () => {
        setSubmitting(false);
        toast.error("Payment failed. Your booking is reserved — try again from My Bookings.");
      });
      checkout.open();
    } catch {
      toast.error("Could not create your booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_392px]">
      <div className="space-y-5">
        <section className="card-base p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold text-ink">Pick-up &amp; return</h2>
            <span className="text-[11px] text-muted">
              {days} day{days > 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="pickupDate">Pick-up date</Label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-600" />
                <Input
                  id="pickupDate"
                  type="date"
                  min={iso(0)}
                  className="pl-9"
                  {...register("pickupDate")}
                />
              </div>
              {errors.pickupDate && (
                <p className="mt-1 text-[11px] text-danger">{errors.pickupDate.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="returnDate">Return date</Label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-600" />
                <Input
                  id="returnDate"
                  type="date"
                  min={pickupDate || iso(0)}
                  className="pl-9"
                  {...register("returnDate")}
                />
              </div>
              {errors.returnDate && (
                <p className="mt-1 text-[11px] text-danger">{errors.returnDate.message}</p>
              )}
            </div>
          </div>

          <div className="mt-3">
            <Label htmlFor="pickupLocation">Pick-up location</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-600" />
              <select
                id="pickupLocation"
                className="field-base h-11 appearance-none pl-9 pr-9"
                {...register("pickupLocation")}
              >
                {locationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              Free delivery within Puducherry city limits. We&apos;ll confirm the
              exact address on WhatsApp.
            </p>
          </div>
        </section>

        <section className="card-base p-5">
          <h2 className="text-[15px] font-bold text-ink">Your information</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="fullName">Full name</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input id="fullName" className="pl-9" {...register("fullName")} />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-[11px] text-danger">{errors.fullName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input
                  id="phone"
                  inputMode="tel"
                  className="pl-9"
                  {...register("phone")}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-[11px] text-danger">{errors.phone.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input id="email" type="email" className="pl-9" {...register("email")} />
              </div>
              {errors.email && (
                <p className="mt-1 text-[11px] text-danger">{errors.email.message}</p>
              )}
            </div>
          </div>
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-page px-3 py-2 text-[11px] text-muted">
            <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
            Your driving licence will be verified at pick-up. No card details are
            stored on our servers.
          </p>
        </section>

        <section className="card-base p-5">
          <h2 className="text-[15px] font-bold text-ink">Payment method</h2>
          <RadioGroup
            value={payment}
            onValueChange={(value) =>
              setValue("payment", value as FormValues["payment"], { shouldValidate: true })
            }
            className="mt-3.5 space-y-2"
          >
            {paymentOptions.map((option) => (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition",
                  payment === option.id
                    ? "border-brand-400 bg-brand-50/60"
                    : "border-line hover:border-brand-200",
                )}
              >
                <RadioGroupItem value={option.id} />
                <option.icon className="size-4 text-brand-700" />
                <span className="flex-1">
                  <span className="block text-[12.5px] font-semibold text-ink">
                    {option.label}
                  </span>
                  <span className="block text-[10.5px] text-muted">{option.hint}</span>
                </span>
                {option.id === "upi" && (
                  <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand-800">
                    Recommended
                  </span>
                )}
              </label>
            ))}
          </RadioGroup>

          <label className="mt-4 flex items-start gap-2.5 text-[11.5px] leading-relaxed text-muted">
            <Checkbox
              className="mt-0.5"
              checked={watch("terms")}
              onCheckedChange={(checked) =>
                setValue("terms", checked === true, { shouldValidate: true })
              }
            />
            <span>
              I agree to the{" "}
              <a href="/terms" className="font-medium text-brand-700 underline">
                rental terms
              </a>{" "}
              and{" "}
              <a href="/terms#cancellation" className="font-medium text-brand-700 underline">
                cancellation policy
              </a>
              .
            </span>
          </label>
          {errors.terms && (
            <p className="mt-1 text-[11px] text-danger">{errors.terms.message}</p>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card-base overflow-hidden">
          <div className="border-b border-line p-4">
            <div className="flex gap-3">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-page">
                <Image
                  src={vehicle.image}
                  alt={vehicle.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-ink">
                  {vehicle.name}
                </p>
                <p className="mt-0.5 text-[10.5px] text-muted">
                  {vehicle.location} · {vehicle.transmission}
                </p>
                <p className="mt-1.5 text-[13px] font-bold text-brand-700">
                  {inr(vehicle.pricePerDay)}
                  <span className="text-[10px] font-medium text-muted"> /day</span>
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between text-[11.5px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-brand-600" />
                {pickupDate || "—"} → {returnDate || "—"}
              </span>
              <span>{days} day{days > 1 ? "s" : ""}</span>
            </div>

            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <Tag className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                  className="field-base h-10 pl-8 text-[12px] uppercase placeholder:normal-case"
                />
              </div>
              <Button type="button" variant="outline" size="sm" className="h-10" onClick={applyCoupon}>
                Apply
              </Button>
            </div>
            {appliedCoupon && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-[11px] text-brand-800">
                <span className="font-semibold">{appliedCoupon.code} applied</span>
                <button
                  type="button"
                  onClick={() => setAppliedCoupon(null)}
                  className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                >
                  Remove <X className="size-3" />
                </button>
              </div>
            )}

            <dl className="mt-3.5 space-y-2 border-t border-line pt-3 text-[12px]">
              <div className="flex justify-between text-muted">
                <dt>
                  Rental ({inr(vehicle.pricePerDay)} × {days})
                </dt>
                <dd className="font-medium text-ink">{inr(rental)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-brand-700">
                  <dt>Coupon discount</dt>
                  <dd className="font-medium">−{inr(discount)}</dd>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-muted">
                  <dt>Taxes &amp; fees</dt>
                  <dd className="font-medium text-ink">{inr(tax)}</dd>
                </div>
              )}
              <div className="flex justify-between text-muted">
                <dt>Security deposit (refundable)</dt>
                <dd className="font-medium text-ink">{inr(deposit)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2.5 text-[14px]">
                <dt className="font-bold text-ink">Total payable</dt>
                <dd className="font-display font-extrabold text-brand-700">{inr(total)}</dd>
              </div>
            </dl>

            <Button
              type="submit"
              size="lg"
              className="mt-4 w-full"
              disabled={submitting || !vehicleId}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Confirming…
                </>
              ) : (
                <>
                  {payment === "pay_at_pickup" ? "Reserve now" : `Pay ${inr(total)} & Book Now`}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
            {!vehicleId && (
              <p className="mt-2 text-center text-[10px] text-danger">
                Booking is temporarily unavailable. Please try again in a moment.
              </p>
            )}
            <p className="mt-2 text-center text-[10px] leading-relaxed text-muted">
              By confirming you agree to our cancellation policy. Deposit is refunded
              within 3 working days of return.
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted">
          <span className="inline-flex items-center gap-1">
            <BadgeCheck className="size-3 text-brand-600" /> Secure checkout
          </span>
          <span className="inline-flex items-center gap-1">
            <Smartphone className="size-3 text-brand-600" /> UPI supported
          </span>
        </div>
      </aside>
    </form>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

const listingSchema = z.object({
  name: z.string().min(2, "Please tell us your name"),
  phone: z
    .string()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().email("Enter a valid email address"),
  type: z.enum(["scooter", "motorcycle", "car"]),
  model: z.string().min(2, "Add the make and model"),
  year: z
    .string()
    .regex(/^(19|20)\d{2}$/, "Enter a 4-digit year")
    .refine((value) => Number(value) >= 2015, "We accept vehicles from 2015 onwards"),
  message: z.string().optional(),
});

type ListingValues = z.infer<typeof listingSchema>;

export function ListingForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ListingValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: { type: "scooter" },
  });

  const onSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    toast.success("Application received — we'll call you within one working day");
    reset({ type: "scooter" });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-panel border border-line bg-surface p-5 sm:p-6"
    >
      <h2 className="text-[17px] font-extrabold text-ink">List your vehicle</h2>
      <p className="mt-1 text-[12px] text-muted">
        Takes two minutes. We&apos;ll inspect the vehicle and call you to agree a rate.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="list-name">Full name</Label>
          <Input id="list-name" placeholder="Your name" {...register("name")} />
          {errors.name && <p className="mt-1 text-[11px] text-danger">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="list-phone">Mobile number</Label>
          <Input
            id="list-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            {...register("phone")}
          />
          {errors.phone && <p className="mt-1 text-[11px] text-danger">{errors.phone.message}</p>}
        </div>
        <div>
          <Label htmlFor="list-email">Email</Label>
          <Input
            id="list-email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-[11px] text-danger">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="list-type">Vehicle type</Label>
          <select
            id="list-type"
            className="field-base h-11 w-full appearance-none py-0 pr-9"
            {...register("type")}
          >
            <option value="scooter">Scooter</option>
            <option value="motorcycle">Motorcycle</option>
            <option value="car">Car</option>
          </select>
        </div>
        <div>
          <Label htmlFor="list-model">Make and model</Label>
          <Input id="list-model" placeholder="Honda Activa 6G" {...register("model")} />
          {errors.model && <p className="mt-1 text-[11px] text-danger">{errors.model.message}</p>}
        </div>
        <div>
          <Label htmlFor="list-year">Year</Label>
          <Input id="list-year" inputMode="numeric" placeholder="2023" {...register("year")} />
          {errors.year && <p className="mt-1 text-[11px] text-danger">{errors.year.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="list-message">Anything else? (optional)</Label>
          <Textarea
            id="list-message"
            placeholder="Condition, accessories, current mileage, preferred pickup area…"
            {...register("message")}
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="mt-5 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Submitting…
          </>
        ) : (
          "Apply to list my vehicle"
        )}
      </Button>
      <p className="mt-2.5 text-center text-[10.5px] text-muted">
        No listing fee. We only earn when your vehicle earns.
      </p>
    </form>
  );
}

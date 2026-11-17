"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/controls";

const contactSchema = z.object({
  name: z.string().min(2, "Please tell us your name"),
  email: z.string().email("Enter a valid email address"),
  phone: z
    .string()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  topic: z.enum(["booking", "refund", "vehicle", "partner", "other"]),
  message: z.string().min(10, "Add a little more detail (10+ characters)"),
});

type ContactValues = z.infer<typeof contactSchema>;

const topics = [
  { value: "booking", label: "A booking or ride" },
  { value: "refund", label: "Payments & refunds" },
  { value: "vehicle", label: "Vehicle condition or documents" },
  { value: "partner", label: "Listing my vehicle" },
  { value: "other", label: "Something else" },
];

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { topic: "booking" },
  });

  const onSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    toast.success("Message sent — we'll reply within 2 hours");
    reset({ topic: "booking" });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-panel border border-line bg-surface p-5 sm:p-7"
    >
      <h2 className="text-[19px] font-extrabold text-ink">Send us a message</h2>
      <p className="mt-1 text-[12.5px] text-muted">
        We reply to every message within two hours, day or night.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name">Full name</Label>
          <Input id="contact-name" placeholder="Karthik M." {...register("name")} />
          {errors.name && <p className="mt-1 text-[11px] text-danger">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="contact-phone">Mobile number</Label>
          <Input
            id="contact-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            {...register("phone")}
          />
          {errors.phone && <p className="mt-1 text-[11px] text-danger">{errors.phone.message}</p>}
        </div>
        <div>
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-[11px] text-danger">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="contact-topic">What&apos;s this about?</Label>
          <select
            id="contact-topic"
            className="field-base h-11 w-full appearance-none py-0 pr-9"
            {...register("topic")}
          >
            {topics.map((topic) => (
              <option key={topic.value} value={topic.value}>
                {topic.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="contact-message">Message</Label>
          <Textarea
            id="contact-message"
            placeholder="Tell us what happened — booking code, dates and any photos help us fix things faster."
            {...register("message")}
          />
          {errors.message && (
            <p className="mt-1 text-[11px] text-danger">{errors.message.message}</p>
          )}
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-2 text-[11.5px] leading-relaxed text-muted">
        <Checkbox defaultChecked className="mt-0.5" />
        Keep me posted about offers and ride updates. You can opt out any time.
      </label>

      <Button type="submit" size="lg" className="mt-5 w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            Send message <Send className="size-4" />
          </>
        )}
      </Button>
    </form>
  );
}

import { Badge, type BadgeProps } from "@/components/ui/badge";
import type {
  DocumentStatusValue,
  PartnerStatusValue,
  TicketCategoryValue,
  TicketPriorityValue,
  TicketStatusValue,
} from "@/lib/api/types";

type Entry = { label: string; variant: BadgeProps["variant"] };

const partnerMap: Record<PartnerStatusValue, Entry> = {
  PENDING: { label: "Pending approval", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
  SUSPENDED: { label: "Suspended", variant: "danger" },
};

const documentMap: Record<DocumentStatusValue, Entry> = {
  PENDING: { label: "Awaiting review", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
  EXPIRED: { label: "Expired", variant: "danger" },
};

const ticketMap: Record<TicketStatusValue, Entry> = {
  OPEN: { label: "Open", variant: "warning" },
  IN_PROGRESS: { label: "In progress", variant: "info" },
  RESOLVED: { label: "Resolved", variant: "success" },
  CLOSED: { label: "Closed", variant: "neutral" },
};

const priorityMap: Record<TicketPriorityValue, Entry> = {
  LOW: { label: "Low", variant: "neutral" },
  NORMAL: { label: "Normal", variant: "info" },
  HIGH: { label: "High", variant: "warning" },
  URGENT: { label: "Urgent", variant: "danger" },
};

function FromMap<T extends string>({ map, value }: { map: Record<T, Entry>; value: string }) {
  const entry = map[value as T] ?? { label: value, variant: "neutral" as const };
  return <Badge variant={entry.variant} size="sm">{entry.label}</Badge>;
}

export function PartnerStatusBadge({ status }: { status: string }) {
  return <FromMap map={partnerMap} value={status} />;
}

export function DocumentStatusBadge({ status }: { status: string }) {
  return <FromMap map={documentMap} value={status} />;
}

export function TicketStatusBadge({ status }: { status: string }) {
  return <FromMap map={ticketMap} value={status} />;
}

export function TicketPriorityBadge({ priority }: { priority: string }) {
  return <FromMap map={priorityMap} value={priority} />;
}

const categoryLabels: Record<TicketCategoryValue, string> = {
  BOOKING: "Booking",
  PAYMENT: "Payment",
  VEHICLE: "Vehicle",
  PARTNER: "Partner",
  ACCOUNT: "Account",
  OTHER: "Other",
};

export function TicketCategoryLabel({ category }: { category: string }) {
  return (
    <span className="text-[12px] font-semibold text-ink-soft">
      {categoryLabels[category as TicketCategoryValue] ?? category}
    </span>
  );
}

export function PendingCount({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
      <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      {count} {label}
    </span>
  );
}

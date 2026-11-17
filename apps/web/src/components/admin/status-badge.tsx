import { Badge, type BadgeProps } from "@/components/ui/badge";
import type {
  ApiBookingStatus,
  ApiPaymentStatus,
  DriverVerification,
  VehicleStatusValue,
} from "@/lib/api/types";

const bookingMap: Record<ApiBookingStatus, { label: string; variant: BadgeProps["variant"] }> = {
  PENDING: { label: "Pending", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "info" },
  ONGOING: { label: "Ongoing", variant: "solid" },
  COMPLETED: { label: "Completed", variant: "neutral" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
  NO_SHOW: { label: "No show", variant: "danger" },
};

const paymentMap: Record<ApiPaymentStatus, { label: string; variant: BadgeProps["variant"] }> = {
  PENDING: { label: "Unpaid", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
  REFUNDED: { label: "Refunded", variant: "info" },
  FAILED: { label: "Failed", variant: "danger" },
};

export function AdminBookingStatus({ status }: { status: ApiBookingStatus }) {
  const entry = bookingMap[status] ?? { label: status, variant: "neutral" as const };
  return (
    <Badge variant={entry.variant} size="sm">
      {entry.label}
    </Badge>
  );
}

export function AdminPaymentStatus({ status }: { status: ApiPaymentStatus | string }) {
  const entry =
    paymentMap[status as ApiPaymentStatus] ?? {
      label: status,
      variant: "neutral" as const,
    };
  return (
    <Badge variant={entry.variant} size="sm">
      {entry.label}
    </Badge>
  );
}

const vehicleMap: Record<VehicleStatusValue, { label: string; variant: BadgeProps["variant"] }> = {
  DRAFT: { label: "Draft", variant: "neutral" },
  AVAILABLE: { label: "Available", variant: "success" },
  UNAVAILABLE: { label: "Unavailable", variant: "warning" },
  MAINTENANCE: { label: "Maintenance", variant: "warning" },
  RETIRED: { label: "Retired", variant: "neutral" },
};

export function AdminVehicleStatus({ status }: { status: VehicleStatusValue }) {
  const entry = vehicleMap[status] ?? { label: status, variant: "neutral" as const };
  return (
    <Badge variant={entry.variant} size="sm">
      {entry.label}
    </Badge>
  );
}

const driverMap: Record<DriverVerification, { label: string; variant: BadgeProps["variant"] }> = {
  PENDING: { label: "Pending check", variant: "warning" },
  VERIFIED: { label: "Verified", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
  SUSPENDED: { label: "Suspended", variant: "danger" },
};

export function AdminDriverStatus({ status }: { status: DriverVerification | string }) {
  const entry =
    driverMap[status as DriverVerification] ?? {
      label: status,
      variant: "neutral" as const,
    };
  return (
    <Badge variant={entry.variant} size="sm">
      {entry.label}
    </Badge>
  );
}

export function AdminActiveFlag({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "neutral"} size="sm">
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

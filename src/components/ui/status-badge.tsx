"use client";

import { cn } from "@/lib/utils";

type StatusVariant =
  | "lunas"
  | "belum"
  | "tertunggak"
  | "pending"
  | "approved"
  | "rejected";

const VARIANT_STYLES: Record<StatusVariant, string> = {
  lunas: "text-[var(--status-lunas)] bg-[var(--status-lunas-bg)]",
  belum: "text-[var(--ink-muted)] bg-[var(--surface-alt)]",
  tertunggak: "text-[var(--status-tertunggak)] bg-[var(--status-tertunggak-bg)]",
  pending: "text-[var(--status-pending)] bg-[var(--status-pending-bg)]",
  approved: "text-[var(--status-approved)] bg-[var(--status-approved-bg)]",
  rejected: "text-[var(--status-rejected)] bg-[var(--status-rejected-bg)]",
};

export function StatusBadge({
  variant,
  label,
  className,
}: {
  variant: StatusVariant;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn("status-badge", VARIANT_STYLES[variant], className)}
      role="status"
    >
      <span className="status-badge__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

/** Helper untuk konversi status string DB → variant badge. */
export function strukStatusVariant(
  status: string
): StatusVariant {
  switch (status) {
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "PENDING":
      return "pending";
    default:
      return "pending";
  }
}

export function strukStatusLabel(status: string): string {
  switch (status) {
    case "APPROVED":
      return "Disetujui";
    case "REJECTED":
      return "Ditolak";
    case "PENDING":
      return "Pending";
    default:
      return status;
  }
}

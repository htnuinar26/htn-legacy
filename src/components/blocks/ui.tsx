"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--ink)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function SummaryCard({
  icon: Icon,
  iconColor = "primary",
  value,
  label,
}: {
  icon: LucideIcon;
  iconColor?: "primary" | "green" | "red" | "amber";
  value: string;
  label: string;
}) {
  const iconBg = {
    primary: "var(--summary-icon-bg)",
    green: "var(--status-lunas-bg)",
    red: "var(--status-tertunggak-bg)",
    amber: "var(--status-pending-bg)",
  }[iconColor];
  const iconColorVal = {
    primary: "var(--accent-primary)",
    green: "var(--status-lunas)",
    red: "var(--status-tertunggak)",
    amber: "var(--status-pending)",
  }[iconColor];

  return (
    <div className="summary-card">
      <div
        className="summary-card__icon"
        style={{ background: iconBg, color: iconColorVal }}
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="summary-card__value tabular-nums">{value}</p>
        <p className="summary-card__label">{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface)] px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-alt)]">
        <Icon className="h-6 w-6 text-[var(--ink-muted)]" strokeWidth={2} />
      </div>
      <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[var(--ink-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-[var(--ink-muted)]">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--accent-primary)]" />
      {label}
    </div>
  );
}

export function ErrorBanner({
  message,
  requestId,
}: {
  message: string;
  requestId?: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-[var(--status-tertunggak)]/30 bg-[var(--status-tertunggak-bg)] px-4 py-3"
    >
      <p className="whitespace-pre-line text-sm font-medium text-[var(--status-tertunggak)]">
        {message}
      </p>
      {requestId && (
        <p className="mt-1 text-xs text-[var(--status-tertunggak)]/70">
          ID Permintaan: {requestId}
        </p>
      )}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card-editorial", className)}>{children}</div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-default)] px-5 py-4">
      <div>
        <h2 className="text-base font-bold text-[var(--ink)]">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-[var(--ink-muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

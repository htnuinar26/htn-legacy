"use client";

import { useEffect, useState } from "react";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  ReceiptText,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
} from "lucide-react";
import {
  PageHeader,
  SummaryCard,
  Card,
  CardHeader,
  LoadingState,
  ErrorBanner,
  EmptyState,
} from "@/components/blocks/ui";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatRupiahFull,
  formatPeriodLong,
  formatPeriodLabel,
} from "@/lib/format";

type AdminDashboard = {
  role: "admin";
  periodeBerjalan: string;
  nominalIuran: number;
  stats: {
    totalAnggota: number;
    lunas: number;
    belumLunas: number;
    tertunggak: number;
    pendingStruk: number;
    approvedStruk: number;
    masukPeriode: number;
    keluarPeriode: number;
    saldoPeriode: number;
    saldoTotal: number;
  };
  trenKeuangan: Array<{
    periodeBulan: string;
    masuk: number;
    keluar: number;
  }>;
};

export function DashboardView() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data && typeof json.data === "object") {
          setData({
            ...json.data,
            trenKeuangan: Array.isArray(json.data.trenKeuangan)
              ? json.data.trenKeuangan
              : [],
          });
        }
        else setError(json.error);
      })
      .catch(() => setError({ message: "Gagal memuat dashboard." }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error || !data) {
    return <ErrorBanner message={error?.message ?? "Gagal memuat data."} requestId={error?.requestId} />;
  }

  const s = data.stats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Admin"
        description={`Periode berjalan: ${formatPeriodLong(data.periodeBerjalan)} · Iuran: ${formatRupiahFull(data.nominalIuran)}`}
      />

      {/* Summary cards baris 1 - anggota */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={Users} iconColor="primary" value={String(s.totalAnggota)} label="Total Anggota" />
        <SummaryCard icon={CheckCircle2} iconColor="green" value={String(s.lunas)} label="Lunas" />
        <SummaryCard icon={Clock} iconColor="amber" value={String(s.belumLunas)} label="Belum Lunas" />
        <SummaryCard icon={AlertTriangle} iconColor="red" value={String(s.tertunggak)} label="Tertunggak" />
      </div>

      {/* Summary cards baris 2 - keuangan */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={Wallet} iconColor="primary" value={formatRupiahFull(s.saldoTotal)} label="Saldo Total" />
        <SummaryCard icon={TrendingUp} iconColor="green" value={formatRupiahFull(s.masukPeriode)} label="Masuk (Periode)" />
        <SummaryCard icon={TrendingDown} iconColor="red" value={formatRupiahFull(s.keluarPeriode)} label="Keluar (Periode)" />
        <SummaryCard icon={ReceiptText} iconColor="amber" value={String(s.pendingStruk)} label="Struk Pending" />
      </div>

      <Card>
        <CardHeader title="Tren Keuangan" description="Pemasukan dan pengeluaran enam periode terakhir" />
        <div className="h-72 min-w-0 p-4 sm:p-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.trenKeuangan} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="var(--border-default)" strokeDasharray="3 3" />
              <XAxis
                dataKey="periodeBulan"
                tickFormatter={formatPeriodLabel}
                stroke="var(--ink-muted)"
                tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(value) => `Rp ${Number(value).toLocaleString("id-ID")}`}
                stroke="var(--ink-muted)"
                tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                width={80}
              />
              <Tooltip
                formatter={(value, name) => [formatRupiahFull(Number(value)), name === "masuk" ? "Pemasukan" : "Pengeluaran"]}
                labelFormatter={(label) => formatPeriodLong(String(label))}
                contentStyle={{
                  background: "var(--surface)",
                  borderColor: "var(--border-default)",
                  color: "var(--ink)",
                }}
              />
              <Legend formatter={(value) => value === "masuk" ? "Pemasukan" : "Pengeluaran"} />
              <Bar dataKey="masuk" fill="var(--status-lunas)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="keluar" fill="var(--status-tertunggak)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Status Pembayaran Anggota" description={`Periode ${formatPeriodLong(data.periodeBerjalan)}`} />
          <div className="space-y-4 p-5">
            <ProgressRow
              label="Lunas"
              value={s.lunas}
              total={s.totalAnggota}
              color="var(--status-lunas)"
            />
            <ProgressRow
              label="Belum Lunas"
              value={s.belumLunas}
              total={s.totalAnggota}
              color="var(--status-pending)"
            />
            <ProgressRow
              label="Tertunggak"
              value={s.tertunggak}
              total={s.totalAnggota}
              color="var(--status-tertunggak)"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Ringkasan Keuangan" description="Periode berjalan" />
          <div className="space-y-3 p-5">
            <Row label="Pemasukan" value={formatRupiahFull(s.masukPeriode)} color="var(--status-lunas)" />
            <Row label="Pengeluaran" value={formatRupiahFull(s.keluarPeriode)} color="var(--status-tertunggak)" />
            <div className="border-t border-[var(--border-default)] pt-3">
              <Row
                label="Saldo Periode"
                value={formatRupiahFull(s.saldoPeriode)}
                color="var(--accent-primary)"
                bold
              />
            </div>
          </div>
        </Card>
      </div>

      {s.pendingStruk > 0 && (
        <Card>
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--status-pending-bg)]">
              <Clock className="h-5 w-5 text-[var(--status-pending)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">
                {s.pendingStruk} struk menunggu review
              </p>
              <p className="text-sm text-[var(--ink-muted)]">
                Buka menu Review Struk untuk memeriksa dan menyetujui receipt anggota.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-[var(--ink-soft)]">{label}</span>
        <span className="tabular-nums font-semibold text-[var(--ink)]">
          {value} / {total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-alt)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? "font-semibold text-[var(--ink)]" : "text-[var(--ink-muted)]"}`}>
        {label}
      </span>
      <span
        className={`tabular-nums ${bold ? "text-lg font-extrabold" : "text-sm font-bold"}`}
        style={{ color: color ?? "var(--ink)" }}
      >
        {value}
      </span>
    </div>
  );
}

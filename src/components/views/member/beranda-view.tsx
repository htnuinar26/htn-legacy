"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ReceiptText,
  TrendingUp,
  TrendingDown,
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
import { StatusBadge, strukStatusVariant, strukStatusLabel } from "@/components/ui/status-badge";
import {
  formatRupiahFull,
  formatPeriodLong,
  formatDateTime,
  getBayarStatus,
} from "@/lib/format";

type DashboardData = {
  role: "anggota";
  periodeBerjalan: string;
  nominalIuran: number;
  deadlineTanggal: number;
  anggota: {
    id: string;
    nama: string;
    statusBayar: string;
    periodeBerjalan: string;
  };
  strukTerbaru: Array<{
    id: string;
    periodeBulan: string;
    status: string;
    nominal: number | null;
    createdAt: string;
  }>;
  transaksiTerbaru: Array<{
    id: string;
    tipe: string;
    nominal: number;
    keterangan: string | null;
    periodeBulan: string;
    createdAt: string;
  }>;
};

export function BerandaView({
  member,
}: {
  member: { anggotaId: string; nama: string };
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error);
      })
      .catch(() => setError({ message: "Gagal memuat data dashboard." }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error || !data) {
    return <ErrorBanner message={error?.message ?? "Gagal memuat data."} requestId={error?.requestId} />;
  }

  const bayarStatus = getBayarStatus(
    data.anggota.statusBayar,
    data.deadlineTanggal
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Selamat datang, ${member.nama}`}
        description={`Periode berjalan: ${formatPeriodLong(data.periodeBerjalan)}`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={Wallet}
          iconColor="primary"
          value={formatRupiahFull(data.nominalIuran)}
          label="Nominal Iuran / Bulan"
        />
        <SummaryCard
          icon={CheckCircle2}
          iconColor={bayarStatus.variant === "lunas" ? "green" : bayarStatus.variant === "tertunggak" ? "red" : "amber"}
          value={bayarStatus.label}
          label="Status Pembayaran"
        />
        <SummaryCard
          icon={ReceiptText}
          iconColor="amber"
          value={String(data.strukTerbaru.length)}
          label="Struk Terbaru"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Struk terbaru */}
        <Card>
          <CardHeader title="Struk Terbaru" description="5 receipt terbaru Anda" />
          <div className="p-5">
            {data.strukTerbaru.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="Belum ada struk"
                description="Unggah receipt pembayaran iuran Anda pada menu Struk Iuran."
              />
            ) : (
              <ul className="space-y-3">
                {data.strukTerbaru.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-default)] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        {formatPeriodLong(s.periodeBulan)}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {formatDateTime(s.createdAt)}
                      </p>
                    </div>
                    <StatusBadge
                      variant={strukStatusVariant(s.status)}
                      label={strukStatusLabel(s.status)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Transaksi terbaru */}
        <Card>
          <CardHeader title="Transaksi Terbaru" description="Riwayat transaksi Anda" />
          <div className="p-5">
            {data.transaksiTerbaru.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Belum ada transaksi"
                description="Transaksi iuran Anda akan muncul di sini."
              />
            ) : (
              <ul className="space-y-3">
                {data.transaksiTerbaru.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-default)] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{
                          background:
                            t.tipe === "MASUK"
                              ? "var(--status-lunas-bg)"
                              : "var(--status-tertunggak-bg)",
                          color:
                            t.tipe === "MASUK"
                              ? "var(--status-lunas)"
                              : "var(--status-tertunggak)",
                        }}
                      >
                        {t.tipe === "MASUK" ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <TrendingUp className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ink)]">
                          {t.keterangan ?? t.tipe}
                        </p>
                        <p className="text-xs text-[var(--ink-muted)]">
                          {formatPeriodLong(t.periodeBulan)}
                        </p>
                      </div>
                    </div>
                    <p
                      className="tabular-nums text-sm font-bold"
                      style={{
                        color:
                          t.tipe === "MASUK"
                            ? "var(--status-lunas)"
                            : "var(--status-tertunggak)",
                      }}
                    >
                      {t.tipe === "MASUK" ? "+" : "-"}
                      {formatRupiahFull(t.nominal)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {bayarStatus.variant === "tertunggak" && (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--status-tertunggak)]/30 bg-[var(--status-tertunggak-bg)] px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--status-tertunggak)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--status-tertunggak)]">
              Pembayaran tertunggak
            </p>
            <p className="text-sm text-[var(--status-tertunggak)]/80">
              Anda memiliki iuran tertunggak untuk periode{" "}
              {formatPeriodLong(data.periodeBerjalan)}. Segera unggah receipt
              pembayaran pada menu Struk Iuran.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

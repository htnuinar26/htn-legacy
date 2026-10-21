"use client";

import { useEffect, useState } from "react";
import {
  FileBarChart,
  TrendingUp,
  TrendingDown,
  Wallet,
  ReceiptText,
  Users,
  Download,
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
  formatRupiahFull,
  formatPeriodLong,
  formatDateTime,
  currentPeriod,
} from "@/lib/format";

type LaporanData = {
  periodeBulan: string;
  ringkasan: {
    masuk: number;
    keluar: number;
    saldo: number;
    totalTransaksi: number;
    strukApproved: number;
    lunas: number;
    belumLunas: number;
    tertunggak: number;
    totalAnggota: number;
  };
  transaksi: Array<{
    id: string;
    tipe: string;
    nominal: number;
    keterangan: string | null;
    anggotaNama: string | null;
    strukId: string | null;
    createdAt: string;
  }>;
  strukApproved: Array<{
    id: string;
    anggotaNama: string;
    nominal: number;
    url: string;
    createdAt: string;
  }>;
};

export function LaporanView() {
  const [bulan, setBulan] = useState(currentPeriod());
  const [data, setData] = useState<LaporanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    fetch(`/api/laporan?bulan=${bulan}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error);
      })
      .catch(() => setError({ message: "Gagal terhubung ke server." }))
      .finally(() => setLoading(false));
  }, [bulan]);

  function exportCSV() {
    if (!data) return;
    const rows = [
      ["Tanggal", "Tipe", "Nominal", "Keterangan", "Anggota"],
      ...data.transaksi.map((t) => [
        formatDateTime(t.createdAt),
        t.tipe,
        String(t.nominal),
        t.keterangan ?? "",
        t.anggotaNama ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${bulan}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        description={`Laporan keuangan dan status anggota per periode.`}
        action={
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              className="input-editorial h-10 text-sm"
              aria-label="Pilih periode"
            />
            <button
              type="button"
              onClick={exportCSV}
              disabled={!data}
              className="flex h-10 items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--surface-alt)] disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        }
      />

      {loading ? (
        <LoadingState />
      ) : error || !data ? (
        <ErrorBanner message={error?.message ?? "Gagal memuat data."} requestId={error?.requestId} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard icon={Wallet} iconColor="primary" value={formatRupiahFull(data.ringkasan.saldo)} label={`Saldo ${formatPeriodLong(bulan)}`} />
            <SummaryCard icon={TrendingUp} iconColor="green" value={formatRupiahFull(data.ringkasan.masuk)} label="Pemasukan" />
            <SummaryCard icon={TrendingDown} iconColor="red" value={formatRupiahFull(data.ringkasan.keluar)} label="Pengeluaran" />
            <SummaryCard icon={ReceiptText} iconColor="amber" value={String(data.ringkasan.strukApproved)} label="Struk Disetujui" />
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard icon={Users} iconColor="primary" value={String(data.ringkasan.totalAnggota)} label="Total Anggota" />
            <SummaryCard icon={Users} iconColor="green" value={String(data.ringkasan.lunas)} label="Lunas" />
            <SummaryCard icon={Users} iconColor="amber" value={String(data.ringkasan.belumLunas)} label="Belum Lunas" />
            <SummaryCard icon={Users} iconColor="red" value={String(data.ringkasan.tertunggak)} label="Tertunggak" />
          </div>

          <Card>
            <CardHeader
              title={`Transaksi ${formatPeriodLong(bulan)}`}
              description={`${data.transaksi.length} transaksi`}
            />
            <div className="p-5">
              {data.transaksi.length === 0 ? (
                <EmptyState icon={FileBarChart} title="Belum ada transaksi" description="Tidak ada transaksi pada periode ini." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-zebra w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                        <th className="px-3 py-2 font-semibold">Tanggal</th>
                        <th className="px-3 py-2 font-semibold">Tipe</th>
                        <th className="px-3 py-2 font-semibold">Keterangan</th>
                        <th className="px-3 py-2 font-semibold">Anggota</th>
                        <th className="px-3 py-2 text-right font-semibold">Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.transaksi.map((t) => (
                        <tr key={t.id} className="border-t border-[var(--border-default)]">
                          <td className="whitespace-nowrap px-3 py-3 text-xs text-[var(--ink-muted)]">
                            {formatDateTime(t.createdAt)}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className="rounded-full px-2 py-0.5 text-xs font-semibold"
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
                              {t.tipe}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-[var(--ink)]">
                            {t.keterangan ?? "-"}
                          </td>
                          <td className="px-3 py-3 text-[var(--ink-muted)]">
                            {t.anggotaNama ?? "-"}
                          </td>
                          <td
                            className="whitespace-nowrap px-3 py-3 text-right tabular-nums font-bold"
                            style={{
                              color:
                                t.tipe === "MASUK"
                                  ? "var(--status-lunas)"
                                  : "var(--status-tertunggak)",
                            }}
                          >
                            {t.tipe === "MASUK" ? "+" : "-"}
                            {formatRupiahFull(t.nominal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          {data.strukApproved.length > 0 && (
            <Card>
              <CardHeader
                title="Struk Disetujui"
                description={`${data.strukApproved.length} receipt disetujui pada periode ini`}
              />
              <div className="p-5">
                <div className="overflow-x-auto">
                  <table className="table-zebra w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                        <th className="px-3 py-2 font-semibold">Anggota</th>
                        <th className="px-3 py-2 font-semibold">Tanggal</th>
                        <th className="px-3 py-2 text-right font-semibold">Nominal</th>
                        <th className="px-3 py-2 text-right font-semibold">File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.strukApproved.map((s) => (
                        <tr key={s.id} className="border-t border-[var(--border-default)]">
                          <td className="px-3 py-3 font-medium text-[var(--ink)]">
                            {s.anggotaNama}
                          </td>
                          <td className="px-3 py-3 text-xs text-[var(--ink-muted)]">
                            {formatDateTime(s.createdAt)}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums font-bold text-[var(--ink)]">
                            {formatRupiahFull(s.nominal)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
                            >
                              Lihat
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

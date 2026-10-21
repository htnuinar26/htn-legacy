"use client";

import { useEffect, useState } from "react";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
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

type Transaksi = {
  id: string;
  tipe: string;
  nominal: number;
  keterangan: string | null;
  periodeBulan: string;
  anggotaNama: string | null;
  createdAt: string;
};

type KasData = {
  transaksi: Transaksi[];
  ringkasanPerPeriode: Array<{
    periode: string;
    masuk: number;
    keluar: number;
    saldo: number;
  }>;
  saldo: number;
  saldoPeriode: number | null;
};

export function KasView() {
  const [bulan, setBulan] = useState(currentPeriod());
  const [data, setData] = useState<KasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/transaksi?bulan=${bulan}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error);
      })
      .catch(() => setError({ message: "Gagal memuat data kas." }))
      .finally(() => setLoading(false));
  }, [bulan]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kas Organisasi"
        description="Riwayat transaksi kas dan saldo organisasi."
        action={
          <select
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="input-editorial h-10 w-auto"
            aria-label="Pilih periode"
          >
            {(data?.ringkasanPerPeriode ?? []).map((r) => (
              <option key={r.periode} value={r.periode}>
                {formatPeriodLong(r.periode)}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={Wallet}
          iconColor="primary"
          value={formatRupiahFull(data?.saldo ?? 0)}
          label="Saldo Total"
        />
        <SummaryCard
          icon={TrendingUp}
          iconColor="green"
          value={formatRupiahFull(
            data?.ringkasanPerPeriode.find((r) => r.periode === bulan)?.masuk ?? 0
          )}
          label="Pemasukan Periode Ini"
        />
        <SummaryCard
          icon={TrendingDown}
          iconColor="red"
          value={formatRupiahFull(
            data?.ringkasanPerPeriode.find((r) => r.periode === bulan)?.keluar ?? 0
          )}
          label="Pengeluaran Periode Ini"
        />
      </div>

      <Card>
        <CardHeader
          title={`Transaksi ${formatPeriodLong(bulan)}`}
          description={`${data?.transaksi.length ?? 0} transaksi pada periode ini`}
        />
        <div className="p-5">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorBanner message={error.message} requestId={error.requestId} />
          ) : !data || data.transaksi.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Belum ada transaksi"
              description="Transaksi kas pada periode ini akan muncul di sini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-zebra w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                    <th className="px-3 py-2 font-semibold">Tanggal</th>
                    <th className="px-3 py-2 font-semibold">Keterangan</th>
                    <th className="px-3 py-2 text-right font-semibold">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transaksi.map((t) => (
                    <tr key={t.id} className="border-t border-[var(--border-default)]">
                      <td className="whitespace-nowrap px-3 py-3 text-[var(--ink-muted)]">
                        {formatDateTime(t.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-[var(--ink)]">
                          {t.keterangan ?? t.tipe}
                        </p>
                        {t.anggotaNama && (
                          <p className="text-xs text-[var(--ink-muted)]">
                            {t.anggotaNama}
                          </p>
                        )}
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
    </div>
  );
}

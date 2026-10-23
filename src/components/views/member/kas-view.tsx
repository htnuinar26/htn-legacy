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
import { CustomSelect } from "@/components/ui/custom-select";

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
  periodeBerjalan: string;
};

export function KasView() {
  // Periode yang dipilih anggota. Null berarti anggota belum memilih, jadi
  // yang dipakai adalah periode berjalan dari server. Nilai ini diturunkan,
  // bukan disimpan lewat effect, supaya tidak ada setState di dalam effect.
  const [bulanDipilih, setBulanDipilih] = useState<string | null>(null);
  const [data, setData] = useState<KasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  const bulan = bulanDipilih ?? data?.periodeBerjalan ?? currentPeriod();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // Reset error setiap reload. Kalau tidak, banner error dari percobaan
    // sebelumnya tetap tampil walaupun reload berikutnya berhasil, karena
    // pengecekan `error` dilakukan sebelum pengecekan `data`.
    setError(null);
    fetch(`/api/transaksi?bulan=${bulan}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data && typeof json.data === "object") {
          setData({
            ...json.data,
            transaksi: Array.isArray(json.data.transaksi) ? json.data.transaksi : [],
            ringkasanPerPeriode: Array.isArray(json.data.ringkasanPerPeriode)
              ? json.data.ringkasanPerPeriode
              : [],
          });
        }
        else setError(json.error);
      })
      .catch(() => setError({ message: "Gagal memuat data kas." }))
      .finally(() => setLoading(false));
  }, [bulan]);

  // `ringkasanPerPeriode` hanya berisi periode yang punya transaksi, jadi
  // periode berjalan dan periode yang dipilih harus ditambahkan sendiri.
  // Tanpa itu dropdown bisa tampil kosong dan periode berjalan tidak
  // bisa dipilih.
  const periodeOptions = Array.from(
    new Set([
      ...(data?.ringkasanPerPeriode ?? []).map((r) => r.periode),
      bulan,
      data?.periodeBerjalan ?? currentPeriod(),
    ])
  ).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kas Organisasi"
        description="Riwayat transaksi kas dan saldo organisasi."
        action={
          <CustomSelect
            value={bulan}
            onChange={setBulanDipilih}
            className="w-full sm:w-52"
            ariaLabel="Pilih periode"
            options={periodeOptions.map((p) => ({ value: p, label: formatPeriodLong(p) }))}
          />
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

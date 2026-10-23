"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Loader2,
  X,
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
import { RupiahInput } from "@/components/ui/rupiah-input";
import { CustomSelect } from "@/components/ui/custom-select";
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
  strukId: string | null;
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

export function AdminKasView() {
  // Periode yang dipilih Admin. Null berarti Admin belum memilih, jadi
  // yang dipakai adalah periode berjalan dari server. Nilai ini diturunkan,
  // bukan disimpan lewat effect, supaya tidak ada setState di dalam effect.
  const [bulanDipilih, setBulanDipilih] = useState<string | null>(null);
  const [data, setData] = useState<KasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaksi | null>(null);
  const [deleting, setDeleting] = useState(false);

  const bulan = bulanDipilih ?? data?.periodeBerjalan ?? currentPeriod();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transaksi?bulan=${bulan}`);
      const json = await res.json();
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
    } catch {
      setError({ message: "Gagal terhubung ke server." });
    } finally {
      setLoading(false);
    }
  }, [bulan]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/transaksi/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error?.message ?? "Gagal menghapus transaksi.");
        return;
      }
      if (json.data?.storageCleanupErrors?.length > 0) {
        alert(
          `Transaksi dihapus, namun ${json.data.storageCleanupErrors.length} file storage gagal dihapus dan perlu pembersihan manual. Lihat audit log.`
        );
      }
      setDeleteTarget(null);
      load();
    } catch {
      alert("Gagal terhubung ke server.");
    } finally {
      setDeleting(false);
    }
  }

  const masuk = data?.ringkasanPerPeriode.find((r) => r.periode === bulan)?.masuk ?? 0;
  const keluar = data?.ringkasanPerPeriode.find((r) => r.periode === bulan)?.keluar ?? 0;

  // Daftar periode pilihan. `ringkasanPerPeriode` hanya berisi periode
  // yang punya transaksi, jadi periode berjalan dan periode yang sedang
  // dipilih harus ditambahkan sendiri. Tanpa itu dropdown bisa kosong dan
  // periode berjalan tidak bisa dipilih.
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
        description="Catat transaksi kas dan kelola riwayat transaksi."
        action={
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex h-11 items-center gap-2 rounded-lg bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-white hover:bg-[var(--button-primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            Catat Transaksi
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard icon={Wallet} iconColor="primary" value={formatRupiahFull(data?.saldo ?? 0)} label="Saldo Total" />
        <SummaryCard icon={TrendingUp} iconColor="green" value={formatRupiahFull(masuk)} label="Masuk Periode" />
        <SummaryCard icon={TrendingDown} iconColor="red" value={formatRupiahFull(keluar)} label="Keluar Periode" />
      </div>

      <Card>
        <CardHeader
          title={`Transaksi ${formatPeriodLong(bulan)}`}
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
        <div className="p-5">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorBanner message={error.message} requestId={error.requestId} />
          ) : !data || data.transaksi.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Belum ada transaksi"
              description="Catat transaksi kas manual untuk periode ini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-zebra w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                    <th className="px-3 py-2 font-semibold">Tanggal</th>
                    <th className="px-3 py-2 font-semibold">Keterangan</th>
                    <th className="px-3 py-2 font-semibold">Anggota</th>
                    <th className="px-3 py-2 text-right font-semibold">Nominal</th>
                    <th className="px-3 py-2 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transaksi.map((t) => (
                    <tr key={t.id} className="border-t border-[var(--border-default)]">
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-[var(--ink-muted)]">
                        {formatDateTime(t.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-[var(--ink)]">
                          {t.keterangan ?? t.tipe}
                        </p>
                        {t.strukId && (
                          <span className="text-xs font-medium text-[var(--accent-secondary)]">
                            Terkait struk
                          </span>
                        )}
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
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          aria-label="Hapus transaksi"
                          onClick={() => setDeleteTarget(t)}
                          className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--status-tertunggak-bg)] hover:text-[var(--status-tertunggak)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} aria-hidden="true" />
          <div className="relative z-10 animate-in fade-in-0 zoom-in-95 duration-200">
            <TransaksiForm
              bulan={bulan}
              onClose={() => setShowForm(false)}
              onSaved={() => {
                setShowForm(false);
                load();
              }}
            />
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} aria-hidden="true" />
          <div className="relative z-10 animate-in fade-in-0 zoom-in-95 duration-200">
            <DeleteTransaksiDialog
              transaksi={deleteTarget}
              deleting={deleting}
              onCancel={() => setDeleteTarget(null)}
              onConfirm={handleDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TransaksiForm({
  bulan,
  onClose,
  onSaved,
}: {
  bulan: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tipe, setTipe] = useState<"MASUK" | "KELUAR">("MASUK");
  const [nominal, setNominal] = useState<number | null>(null);
  const [keterangan, setKeterangan] = useState("");
  const [periodeBulan, setPeriodeBulan] = useState(bulan);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{
    message: string;
    fields?: Record<string, string>;
    requestId?: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!nominal || nominal <= 0) {
      setError({ message: "Nominal harus bilangan bulat positif.", fields: { nominal: "Wajib diisi" } });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/transaksi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipe,
          nominal,
          keterangan: keterangan.trim() || undefined,
          periodeBulan,
          anggotaId: null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError({
          message: json.error?.message ?? "Gagal menyimpan.",
          fields: json.error?.fields,
          requestId: json.error?.requestId,
        });
        return;
      }
      onSaved();
    } catch {
      setError({ message: "Gagal terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative z-10 w-full max-w-md rounded-xl bg-[var(--surface)] shadow-[var(--shadow-modal)] animate-in fade-in-0 zoom-in-95 duration-200">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Catat transaksi kas"
        className="relative z-10 w-full max-w-md rounded-xl bg-[var(--surface)] shadow-[var(--shadow-modal)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-base font-bold text-[var(--ink)]">Catat Transaksi</h2>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form noValidate onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipe("MASUK")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                tipe === "MASUK"
                  ? "border-[var(--status-lunas)] bg-[var(--status-lunas-bg)] text-[var(--status-lunas)]"
                  : "border-[var(--border-default)] text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Pemasukan
            </button>
            <button
              type="button"
              onClick={() => setTipe("KELUAR")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                tipe === "KELUAR"
                  ? "border-[var(--status-tertunggak)] bg-[var(--status-tertunggak-bg)] text-[var(--status-tertunggak)]"
                  : "border-[var(--border-default)] text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              Pengeluaran
            </button>
          </div>

          <RupiahInput
            id="kas-nominal"
            label="Nominal *"
            value={nominal}
            onChange={setNominal}
            error={error?.fields?.nominal}
            hint="Nominal transaksi (contoh: 50000). Tidak ada batasan kelipatan."
          />

          <div className="space-y-1.5">
            <label htmlFor="kas-keterangan" className="block text-sm font-medium text-[var(--ink)]">
              Keterangan
            </label>
            <input
              id="kas-keterangan"
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Keterangan transaksi..."
              className="input-editorial h-11"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="kas-periode" className="block text-sm font-medium text-[var(--ink)]">
              Periode
            </label>
            <input
              id="kas-periode"
              type="text"
              value={periodeBulan}
              onChange={(e) => setPeriodeBulan(e.target.value)}
              placeholder="YYYY-MM"
              pattern="\d{4}-\d{2}"
              aria-invalid={!!error?.fields?.periodeBulan}
              aria-describedby={error?.fields?.periodeBulan ? "kas-periode-error" : undefined}
              className="input-editorial h-11"
            />
            {error?.fields?.periodeBulan ? (
              <p
                id="kas-periode-error"
                role="alert"
                className="text-xs font-medium text-[var(--status-tertunggak)]"
              >
                {error.fields.periodeBulan}
              </p>
            ) : null}
          </div>

          {error && <ErrorBanner message={error.message} requestId={error.requestId} />}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-lg border border-[var(--border-default)] px-5 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--surface-alt)]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex h-11 items-center gap-2 rounded-lg bg-[var(--button-primary-bg)] px-5 text-sm font-semibold text-white hover:bg-[var(--button-primary-hover)] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteTransaksiDialog({
  transaksi,
  deleting,
  onCancel,
  onConfirm,
}: {
  transaksi: Transaksi;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="relative z-10 w-full max-w-md rounded-xl bg-[var(--surface)] p-6 shadow-[var(--shadow-modal)] animate-in fade-in-0 zoom-in-95 duration-200">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Konfirmasi hapus transaksi"
        className="relative z-10 w-full max-w-md rounded-xl bg-[var(--surface)] p-6 shadow-[var(--shadow-modal)]"
      >
        <h2 className="text-base font-bold text-[var(--ink)]">Hapus Transaksi?</h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Transaksi <strong className="text-[var(--ink)]">{transaksi.tipe}</strong> sebesar{" "}
          <strong className="text-[var(--ink)]">{formatRupiahFull(transaksi.nominal)}</strong> akan dihapus.
          {transaksi.strukId && (
            <>
              {" "}Karena transaksi ini terkait struk, struk akan ditandai{" "}
              <strong className="text-[var(--status-rejected)]">REJECTED</strong>, file storage dihapus,
              dan status anggota disinkronkan. Audit log tetap dicatat.
            </>
          )}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="h-11 rounded-lg border border-[var(--border-default)] px-4 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--surface-alt)] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex h-11 items-center gap-2 rounded-lg bg-[var(--button-danger-bg)] px-4 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

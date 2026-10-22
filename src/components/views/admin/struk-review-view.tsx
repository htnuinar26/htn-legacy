"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ReceiptText,
  Check,
  X,
  Loader2,
  Eye,
  XCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  LoadingState,
  ErrorBanner,
  EmptyState,
} from "@/components/blocks/ui";
import {
  StatusBadge,
  strukStatusVariant,
  strukStatusLabel,
} from "@/components/ui/status-badge";
import { RupiahInput } from "@/components/ui/rupiah-input";
import {
  formatPeriodLong,
  formatDateTime,
  formatRupiahFull,
} from "@/lib/format";

type Struk = {
  id: string;
  anggotaId: string;
  anggotaNama: string;
  periodeBulan: string;
  status: string;
  nominal: number | null;
  sumber: string;
  alasanReject: string | null;
  catatan: string | null;
  url: string;
  createdAt: string;
  reviewedAt: string | null;
};

export function StrukReviewView() {
  const [list, setList] = useState<Struk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [reviewing, setReviewing] = useState<Struk | null>(null);

  const load = useCallback(async () => {
     
    setLoading(true);
    setError(null);
    try {
      const statusParam = filter === "ALL" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/struk${statusParam}`);
      const json = await res.json();
      if (json.success) setList(json.data);
      else setError(json.error);
    } catch {
      setError({ message: "Gagal terhubung ke server." });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Struk"
        description="Periksa receipt pembayaran anggota secara manual dan setujui atau tolak."
      />

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] p-1">
        {([
          { v: "PENDING", label: "Pending" },
          { v: "APPROVED", label: "Disetujui" },
          { v: "REJECTED", label: "Ditolak" },
          { v: "ALL", label: "Semua" },
        ] as const).map((t) => (
          <button
            key={t.v}
            type="button"
            onClick={() => setFilter(t.v)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              filter === t.v
                ? "bg-[var(--accent-primary)] text-white"
                : "text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorBanner message={error.message} requestId={error.requestId} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={`Tidak ada struk ${filter === "ALL" ? "" : filter === "PENDING" ? "pending" : filter === "APPROVED" ? "disetujui" : "ditolak"}`}
          description="Struk yang sesuai filter akan muncul di sini."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              <div className="border-b border-[var(--border-default)] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-[var(--ink)]">
                    {s.anggotaNama}
                  </p>
                  <StatusBadge
                    variant={strukStatusVariant(s.status)}
                    label={strukStatusLabel(s.status)}
                  />
                </div>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                  {formatPeriodLong(s.periodeBulan)} · {formatDateTime(s.createdAt)}
                </p>
                {s.sumber === "ADMIN_MANUAL" && (
                  <p className="mt-1 text-xs font-medium text-[var(--accent-secondary)]">
                    Struk manual Admin
                  </p>
                )}
              </div>
              {/* Thumbnail */}
              <div className="aspect-video w-full bg-[var(--surface-alt)]">
                { }
                <img
                  src={s.url}
                  alt={`Receipt ${s.anggotaNama} ${s.periodeBulan}`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                {s.status === "APPROVED" && s.nominal && (
                  <p className="mb-3 text-sm text-[var(--ink-muted)]">
                    Nominal: <span className="font-bold text-[var(--ink)]">{formatRupiahFull(s.nominal)}</span>
                  </p>
                )}
                {s.status === "REJECTED" && s.alasanReject && (
                  <div className="mb-3 rounded-md bg-[var(--status-rejected-bg)] px-3 py-2">
                    <p className="text-xs font-semibold text-[var(--status-rejected)]">
                      Alasan: {s.alasanReject}
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--ink-soft)] hover:bg-[var(--surface-alt)]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Lihat
                  </a>
                  {s.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => setReviewing(s)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--button-primary-bg)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--button-primary-hover)]"
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {reviewing && (
        <ReviewDialog
          struk={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ReviewDialog({
  struk,
  onClose,
  onDone,
}: {
  struk: Struk;
  onClose: () => void;
  onDone: () => void;
}) {
  const [nominal, setNominal] = useState<number | null>(struk.nominal ?? null);
  const [nominalIuran, setNominalIuran] = useState<number | null>(null);
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [alasan, setAlasan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{
    message: string;
    fields?: Record<string, string>;
    requestId?: string;
  } | null>(null);

  // Ambil nominal iuran default supaya Admin langsung melihat nilai yang
  // akan dipakai kalau field nominal dikosongkan.
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setNominalIuran(json.data.nominalIuran);
      })
      .catch(() => {
        // Nilai default tidak wajib dimuat. Server sudah punya fallback
        // sendiri kalau field nominal tidak dikirim.
      });
  }, []);

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    if (action === "reject" && !alasan.trim()) {
      setError({ message: "Alasan penolakan wajib diisi.", fields: { alasan: "Wajib diisi" } });
      setSaving(false);
      return;
    }

    const payload: Record<string, unknown> = { action };
    if (action === "approve") {
      // Hanya kirim nominal kalau Admin benar-benar mengisinya. Kalau
      // dikosongkan, field tidak dikirim sama sekali supaya server memakai
      // fallback ke nominal receipt lalu nominal iuran. Mengirim `null`
      // sebelumnya membuat server menolak dengan 400.
      if (nominal !== null && nominal > 0) {
        payload.nominal = nominal;
      }
    } else {
      payload.alasan = alasan.trim();
    }

    try {
      const res = await fetch(`/api/struk/${struk.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError({
          message: json.error?.message ?? "Gagal memproses.",
          fields: json.error?.fields,
          requestId: json.error?.requestId,
        });
        return;
      }
      onDone();
    } catch {
      setError({ message: "Gagal terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review struk"
        className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto scroll-area-custom rounded-xl bg-[var(--surface)] shadow-[var(--shadow-modal)] animate-in fade-in-0 zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-[var(--ink)]">Review Struk</h2>
            <p className="text-sm text-[var(--ink-muted)]">
              {struk.anggotaNama} · {formatPeriodLong(struk.periodeBulan)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          {/* Preview gambar */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Receipt
            </p>
            <div className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--surface-alt)]">
              { }
              <img
                src={struk.url}
                alt={`Receipt ${struk.anggotaNama}`}
                className="h-auto w-full object-contain"
              />
            </div>
            <a
              href={struk.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-primary)] hover:underline"
            >
              <Eye className="h-3.5 w-3.5" />
              Buka di tab baru
            </a>
          </div>

          {/* Form keputusan */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAction("approve")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  action === "approve"
                    ? "border-[var(--status-lunas)] bg-[var(--status-lunas-bg)] text-[var(--status-lunas)]"
                    : "border-[var(--border-default)] text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Setujui
              </button>
              <button
                type="button"
                onClick={() => setAction("reject")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  action === "reject"
                    ? "border-[var(--status-tertunggak)] bg-[var(--status-tertunggak-bg)] text-[var(--status-tertunggak)]"
                    : "border-[var(--border-default)] text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
                }`}
              >
                <XCircle className="h-4 w-4" />
                Tolak
              </button>
            </div>

            {action === "approve" ? (
              <div>
                <RupiahInput
                  id="review-nominal"
                  label="Nominal Iuran"
                  value={nominal}
                  onChange={setNominal}
                  error={error?.fields?.nominal}
                  hint={
                    nominalIuran
                      ? `Kosongkan untuk memakai nominal iuran bawaan ${formatRupiahFull(nominalIuran)}.`
                      : "Kosongkan untuk memakai nominal iuran bawaan."
                  }
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="review-alasan" className="block text-sm font-medium text-[var(--ink)]">
                  Alasan Penolakan *
                </label>
                <textarea
                  id="review-alasan"
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  rows={4}
                  placeholder="Jelaskan alasan struk ditolak (wajib)..."
                  className="input-editorial"
                />
                {error?.fields?.alasan && (
                  <p role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
                    {error.fields.alasan}
                  </p>
                )}
              </div>
            )}

            {error && (
              <ErrorBanner message={error.message} requestId={error.requestId} />
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-lg border border-[var(--border-default)] px-5 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--surface-alt)]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className={`flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-50 ${
                  action === "approve"
                    ? "bg-[var(--status-lunas)] hover:brightness-95"
                    : "bg-[var(--button-danger-bg)] hover:brightness-95"
                }`}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : action === "approve" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                {action === "approve" ? "Setujui" : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

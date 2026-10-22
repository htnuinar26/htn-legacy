"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Upload,
  ReceiptText,
  Loader2,
  FileImage,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  LoadingState,
  ErrorBanner,
  EmptyState,
} from "@/components/blocks/ui";
import { StatusBadge, strukStatusVariant, strukStatusLabel } from "@/components/ui/status-badge";
import {
  recentPeriods,
  formatPeriodLong,
  formatDateTime,
} from "@/lib/format";

type StrukItem = {
  id: string;
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

export function StrukView({
  member,
}: {
  member: { anggotaId: string; nama: string };
}) {
  const [periods] = useState(recentPeriods());
  const [selectedPeriod, setSelectedPeriod] = useState(periods[0] ?? "");
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<{
    message: string;
    requestId?: string;
    fields?: Record<string, string>;
  } | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [list, setList] = useState<StrukItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch(`/api/anggota/${member.anggotaId}/struk`);
      const json = await res.json();
      if (json.success) setList(json.data);
      else setListError(json.error?.message ?? "Gagal memuat riwayat struk.");
    } catch {
      setListError("Gagal terhubung ke server.");
    } finally {
      setListLoading(false);
    }
  }, [member.anggotaId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setUploadError(null);
    setUploadSuccess(null);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !password || !selectedPeriod) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append("anggotaId", member.anggotaId);
      formData.append("password", password);
      formData.append("periodeBulan", selectedPeriod);
      formData.append("file", file);

      const res = await fetch("/api/struk/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) {
        setUploadError({
          message: json.error?.message ?? "Gagal mengunggah struk.",
          requestId: json.error?.requestId,
          fields: json.error?.fields,
        });
        return;
      }
      setUploadSuccess(
        `Struk untuk periode ${formatPeriodLong(selectedPeriod)} berhasil dikirim dan menunggu review Admin.`
      );
      setFile(null);
      setPassword("");
      // Reset file input.
      const input = document.getElementById("struk-file") as HTMLInputElement | null;
      if (input) input.value = "";
      loadList();
    } catch {
      setUploadError({ message: "Gagal terhubung ke server. Periksa koneksi." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Struk Iuran"
        description="Unggah receipt pembayaran iuran dan lihat riwayat Anda."
      />

      {/* Form upload */}
      <Card>
        <CardHeader
          title="Unggah Struk Baru"
          description="Masukkan password per aksi, pilih periode, lalu pilih file gambar."
        />
        <form onSubmit={handleUpload} className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--ink)]">
                Nama
              </label>
              <input
                type="text"
                value={member.nama}
                disabled
                className="input-editorial h-11 cursor-not-allowed opacity-70"
              />
              <p className="text-xs text-[var(--ink-muted)]">
                Nama terisi otomatis dari sesi Anda.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="struk-password" className="block text-sm font-medium text-[var(--ink)]">
                Password Per Aksi
              </label>
              <input
                id="struk-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="input-editorial h-11"
                required
                aria-invalid={!!uploadError?.fields?.password}
              />
              {uploadError?.fields?.password && (
                <p role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
                  {uploadError.fields.password}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="struk-period" className="block text-sm font-medium text-[var(--ink)]">
              Periode Iuran
            </label>
            <select
              id="struk-period"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              aria-invalid={!!uploadError?.fields?.periodeBulan}
              aria-describedby={uploadError?.fields?.periodeBulan ? "struk-period-error" : undefined}
              className="input-editorial h-11"
            >
              {periods.map((p) => (
                <option key={p} value={p}>
                  {formatPeriodLong(p)}
                </option>
              ))}
            </select>
            {uploadError?.fields?.periodeBulan && (
              <p
                id="struk-period-error"
                role="alert"
                className="text-xs font-medium text-[var(--status-tertunggak)]"
              >
                {uploadError.fields.periodeBulan}
              </p>
            )}
            <p className="text-xs text-[var(--ink-muted)]">
              Hanya 4 periode terbaru yang tersedia. Satu anggota hanya boleh
              memiliki satu receipt aktif per periode.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="struk-file" className="block text-sm font-medium text-[var(--ink)]">
              File Receipt
            </label>
            <div className="flex items-center gap-3">
              <input
                id="struk-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="block w-full text-sm text-[var(--ink-muted)] file:mr-4 file:rounded-md file:border-0 file:bg-[var(--accent-primary)] file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-[var(--button-primary-hover)]"
                required
              />
            </div>
            {file && (
              <p className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
                <FileImage className="h-3.5 w-3.5" />
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
            <p className="text-xs text-[var(--ink-muted)]">
              Format: JPG, PNG, atau WebP. Maksimal 5 MB.
            </p>
            {uploadError?.fields?.file && (
              <p role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
                {uploadError.fields.file}
              </p>
            )}
          </div>

          {uploadError && (
            <ErrorBanner message={uploadError.message} requestId={uploadError.requestId} />
          )}

          {uploadSuccess && (
            <div className="flex items-start gap-3 rounded-lg border border-[var(--status-lunas)]/30 bg-[var(--status-lunas-bg)] px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--status-lunas)]" />
              <p className="text-sm font-medium text-[var(--status-lunas)]">
                {uploadSuccess}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !file || !password || !selectedPeriod}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--button-primary-bg)] px-6 font-semibold text-white transition-all hover:bg-[var(--button-primary-hover)] active:scale-[0.98] disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "Mengunggah..." : "Kirim Struk"}
          </button>
        </form>
      </Card>

      {/* Riwayat struk */}
      <Card>
        <CardHeader title="Riwayat Struk" description="Semua receipt yang pernah Anda kirim" />
        <div className="p-5">
          {listLoading ? (
            <LoadingState />
          ) : listError ? (
            <ErrorBanner message={listError} />
          ) : list.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="Belum ada struk"
              description="Struk yang Anda unggah akan muncul di sini dengan status terkini."
            />
          ) : (
            <ul className="space-y-3">
              {list.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-[var(--border-default)] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[var(--ink)]">
                          {formatPeriodLong(s.periodeBulan)}
                        </p>
                        <StatusBadge
                          variant={strukStatusVariant(s.status)}
                          label={strukStatusLabel(s.status)}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        Dikirim: {formatDateTime(s.createdAt)}
                        {s.reviewedAt && ` · Direview: ${formatDateTime(s.reviewedAt)}`}
                      </p>
                      {s.sumber === "ADMIN_MANUAL" && (
                        <p className="mt-1 text-xs font-medium text-[var(--accent-secondary)]">
                          Dibuat manual oleh Admin
                        </p>
                      )}
                      {s.status === "REJECTED" && s.alasanReject && (
                        <div className="mt-2 rounded-md bg-[var(--status-rejected-bg)] px-3 py-2">
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--status-rejected)]">
                            <XCircle className="h-3.5 w-3.5" />
                            Alasan penolakan:
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--status-rejected)]/90">
                            {s.alasanReject}
                          </p>
                          <p className="mt-1 text-xs text-[var(--status-rejected)]/70">
                            Anda dapat mengirim ulang struk untuk periode ini.
                          </p>
                        </div>
                      )}
                      {s.status === "APPROVED" && s.nominal && (
                        <p className="mt-1 text-xs text-[var(--ink-muted)]">
                          Nominal: Rp {s.nominal.toLocaleString("id-ID")}
                        </p>
                      )}
                    </div>
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--ink-soft)] hover:bg-[var(--surface-alt)]"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Lihat
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Info status */}
      <div className="flex flex-wrap gap-4 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] p-4">
        <StatusInfo icon={Clock} label="Pending" desc="Menunggu review Admin" variant="pending" />
        <StatusInfo icon={CheckCircle2} label="Disetujui" desc="Iuran tercatat" variant="approved" />
        <StatusInfo icon={XCircle} label="Ditolak" desc="Bisa kirim ulang" variant="rejected" />
      </div>
    </div>
  );
}

function StatusInfo({
  icon: Icon,
  label,
  desc,
  variant,
}: {
  icon: typeof Clock;
  label: string;
  desc: string;
  variant: "pending" | "approved" | "rejected";
}) {
  const color = {
    pending: "var(--status-pending)",
    approved: "var(--status-approved)",
    rejected: "var(--status-rejected)",
  }[variant];
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4" style={{ color }} />
      <div>
        <p className="text-xs font-semibold" style={{ color }}>
          {label}
        </p>
        <p className="text-xs text-[var(--ink-muted)]">{desc}</p>
      </div>
    </div>
  );
}

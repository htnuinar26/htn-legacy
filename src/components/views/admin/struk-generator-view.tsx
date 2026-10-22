"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import {
  FilePlus2,
  Loader2,
  CheckCircle2,
  Download,
  FileImage,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  LoadingState,
  ErrorBanner,
  EmptyState,
} from "@/components/blocks/ui";
import { RupiahInput } from "@/components/ui/rupiah-input";
import {
  formatPeriodLong,
  formatRupiahFull,
  formatDateTime,
} from "@/lib/format";

type AnggotaOption = {
  id: string;
  nama: string;
  nim: string | null;
  email: string | null;
  telepon: string | null;
  statusBayar: string;
};

type GenData = {
  periodeBerjalan: string;
  nominalIuran: number;
  anggota: AnggotaOption[];
};

type GenResult = {
  strukId: string;
  status: string;
  nominal: number;
  periodeBulan: string;
  anggotaNama: string;
  fileUrl: string;
  filePath: string;
} | null;

// Skema validasi client sesuai ARCHITECTURE.md node H: "Client validasi Zod
// sebelum submit, anggotaId wajib, nominal integer positif".
const GeneratorClientSchema = z.object({
  anggotaId: z.string().min(1, "Pilih anggota terlebih dahulu"),
  nominal: z
    .number({ message: "Nominal wajib diisi" })
    .int("Nominal harus bilangan bulat positif")
    .positive("Nominal harus lebih dari 0")
    .max(2_000_000_000, "Nominal maksimal 2.000.000.000"),
});

export function StrukGeneratorView() {
  const [data, setData] = useState<GenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedAnggota, setSelectedAnggota] = useState("");
  const [nominal, setNominal] = useState<number | null>(null);
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{
    message: string;
    fields?: Record<string, string>;
    requestId?: string;
  } | null>(null);
  const [result, setResult] = useState<GenResult>(null);

  useEffect(() => {
    fetch("/api/admin/struk-generator/anggota")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
          setNominal(json.data.nominalIuran);
        } else setLoadError(json.error?.message ?? "Gagal memuat data.");
      })
      .catch(() => setLoadError("Gagal terhubung ke server."))
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setResult(null);

    // Validasi client dengan Zod sebelum submit, sesuai node H pada
    // ARCHITECTURE.md.
    const parsed = GeneratorClientSchema.safeParse({
      anggotaId: selectedAnggota,
      nominal,
    });
    if (!parsed.success) {
      setError({
        message: "Data struk generator tidak valid.",
        fields: Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0] ?? "_"), i.message])
        ),
      });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/struk-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anggotaId: selectedAnggota,
          nominal,
          catatan: catatan.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError({
          message: json.error?.message ?? "Gagal membuat struk manual.",
          fields: json.error?.fields,
          requestId: json.error?.requestId,
        });
        return;
      }
      setResult(json.data);
      // Refresh daftar anggota (yang baru dibuat struknya tidak lagi tersedia).
      const refresh = await fetch("/api/admin/struk-generator/anggota");
      const rjson = await refresh.json();
      if (rjson.success) setData(rjson.data);
      setSelectedAnggota("");
      setCatatan("");
    } catch {
      setError({ message: "Gagal terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (loadError || !data) {
    return <ErrorBanner message={loadError ?? "Gagal memuat data."} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generator Struk Manual"
        description={`Buat receipt manual untuk pembayaran tunai. Periode: ${formatPeriodLong(data.periodeBerjalan)}`}
      />

      {result && (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--status-lunas)]/30 bg-[var(--status-lunas-bg)] px-4 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--status-lunas)]" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--status-lunas)]">
              Struk manual berhasil dibuat
            </p>
            <p className="mt-1 text-sm text-[var(--status-lunas)]/90">
              {result.anggotaNama} · {formatPeriodLong(result.periodeBulan)} · {formatRupiahFull(result.nominal)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--status-lunas)]/70">
              Status: APPROVED · Transaksi MASUK tercatat atomik.
            </p>
          </div>
          <a
            href={result.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--status-lunas)]/40 px-3 py-2 text-xs font-medium text-[var(--status-lunas)] hover:bg-white/20"
          >
            <Download className="h-3.5 w-3.5" />
            Lihat
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Form Struk Manual"
            description="Pilih anggota tanpa receipt aktif, isi nominal, lalu generate."
          />
          <form noValidate onSubmit={handleGenerate} className="space-y-5 p-5">
            <div className="space-y-1.5">
              <label htmlFor="gen-anggota" className="block text-sm font-medium text-[var(--ink)]">
                Anggota *
              </label>
              <select
                id="gen-anggota"
                value={selectedAnggota}
                onChange={(e) => setSelectedAnggota(e.target.value)}
                className="input-editorial h-11"
                required
              >
                <option value="">- Pilih anggota -</option>
                {data.anggota.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nama}{a.nim ? ` (${a.nim})` : ""}
                  </option>
                ))}
              </select>
              {error?.fields?.anggotaId && (
                <p role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
                  {error.fields.anggotaId}
                </p>
              )}
              <p className="text-xs text-[var(--ink-muted)]">
                Hanya anggota tanpa receipt PENDING/APPROVED pada periode berjalan yang ditampilkan.
              </p>
            </div>

            <RupiahInput
              id="gen-nominal"
              label="Nominal Iuran *"
              value={nominal}
              onChange={setNominal}
              error={error?.fields?.nominal}
              hint="Nominal iuran yang dibayar anggota (contoh: 15000)."
            />

            <div className="space-y-1.5">
              <label htmlFor="gen-catatan" className="block text-sm font-medium text-[var(--ink)]">
                Catatan (opsional)
              </label>
              <textarea
                id="gen-catatan"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={2}
                placeholder="Catatan tambahan untuk struk ini..."
                className="input-editorial"
                maxLength={500}
              />
            </div>

            {error && <ErrorBanner message={error.message} requestId={error.requestId} />}

            <button
              type="submit"
              disabled={saving}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--button-primary-bg)] px-6 font-semibold text-white hover:bg-[var(--button-primary-hover)] active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
              {saving ? "Memproses..." : "Generate & Simpan"}
            </button>
          </form>
        </Card>

        {/* Info panel */}
        <Card className="lg:col-span-1">
          <CardHeader title="Informasi" description="Cara kerja struk generator" />
          <div className="space-y-3 p-5 text-sm text-[var(--ink-muted)]">
            <div className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary-soft)] text-xs font-bold text-[var(--accent-primary)]">1</span>
              <p>Pilih anggota yang belum memiliki receipt aktif pada periode berjalan.</p>
            </div>
            <div className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary-soft)] text-xs font-bold text-[var(--accent-primary)]">2</span>
              <p>Masukkan nominal iuran. Nilai wajar seperti <strong className="text-[var(--ink)]">10000</strong> atau <strong className="text-[var(--ink)]">15000</strong> diterima tanpa batasan.</p>
            </div>
            <div className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary-soft)] text-xs font-bold text-[var(--accent-primary)]">3</span>
              <p>Struk langsung berstatus <strong className="text-[var(--status-lunas)]">APPROVED</strong>, transaksi MASUK dibuat atomik, dan status anggota menjadi LUNAS.</p>
            </div>
            <div className="rounded-md bg-[var(--surface-alt)] p-3 text-xs">
              <p className="font-semibold text-[var(--ink-soft)]">Catatan teknis</p>
              <p className="mt-1">Transaksi DB menggunakan isolation level Serializable. Jika terjadi konflik data paralel, pesan spesifik akan ditampilkan dengan ID permintaan untuk penelusuran.</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Daftar anggota tersedia */}
      <Card>
        <CardHeader
          title={`${data.anggota.length} Anggota Tersedia`}
          description="Anggota tanpa receipt aktif pada periode berjalan"
        />
        <div className="p-5">
          {data.anggota.length === 0 ? (
            <EmptyState
              icon={FileImage}
              title="Semua anggota sudah punya receipt"
              description="Tidak ada anggota yang tersedia untuk struk manual pada periode ini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-zebra w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                    <th className="px-3 py-2 font-semibold">Nama</th>
                    <th className="px-3 py-2 font-semibold">NIM</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.anggota.map((a) => (
                    <tr key={a.id} className="border-t border-[var(--border-default)]">
                      <td className="px-3 py-3 font-medium text-[var(--ink)]">{a.nama}</td>
                      <td className="px-3 py-3 text-[var(--ink-muted)]">{a.nim ?? "-"}</td>
                      <td className="px-3 py-3 text-[var(--ink-muted)]">{a.statusBayar}</td>
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

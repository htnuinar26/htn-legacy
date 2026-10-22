"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Loader2, Save, Upload } from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  LoadingState,
  ErrorBanner,
} from "@/components/blocks/ui";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { currentPeriod, formatPeriodLong } from "@/lib/format";

type Settings = {
  nominalIuran: number;
  periodeBerjalan: string;
  deadlineTanggal: number;
  waPengurus: string | null;
  barcodePath: string | null;
  barcodeUrl: string | null;
  namaOrganisasi: string;
};

export function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [nominalIuran, setNominalIuran] = useState<number | null>(null);
  const [periodeBerjalan, setPeriodeBerjalan] = useState(currentPeriod());
  const [deadlineTanggal, setDeadlineTanggal] = useState(10);
  const [waPengurus, setWaPengurus] = useState("");
  const [namaOrganisasi, setNamaOrganisasi] = useState("HTN Legacy");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<{
    message: string;
    fields?: Record<string, string>;
    requestId?: string;
  } | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setSettings(json.data);
          setNominalIuran(json.data.nominalIuran);
          setPeriodeBerjalan(json.data.periodeBerjalan);
          setDeadlineTanggal(json.data.deadlineTanggal);
          setWaPengurus(json.data.waPengurus ?? "");
          setNamaOrganisasi(json.data.namaOrganisasi);
        } else setLoadError(json.error?.message ?? "Gagal memuat settings.");
      })
      .catch(() => setLoadError("Gagal terhubung ke server."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nominalIuran,
          periodeBerjalan,
          deadlineTanggal,
          waPengurus,
          namaOrganisasi,
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
      // Gabungkan dengan state lama supaya `barcodePath` dan `barcodeUrl`
      // tidak hilang dari tampilan. Response PATCH hanya memuat sebagian
      // field settings, jadi `setSettings(json.data)` menimpa seluruh state.
      setSettings({ ...settings, ...json.data });
      setSuccess(true);
    } catch {
      setError({ message: "Gagal terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (loadError || !settings) return <ErrorBanner message={loadError ?? "Gagal memuat data."} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Konfigurasi global organisasi: nominal iuran, periode, deadline, dan kontak."
      />

      <form noValidate onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader title="Iuran & Periode" description="Nominal iuran bulanan dan periode berjalan" />
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
            <RupiahInput
              id="settings-iuran"
              label="Nominal Iuran Bulanan *"
              value={nominalIuran}
              onChange={setNominalIuran}
              error={error?.fields?.nominalIuran}
              hint="Nominal iuran per anggota per bulan (contoh: 10000)."
            />

            <div className="space-y-1.5">
              <label htmlFor="settings-periode" className="block text-sm font-medium text-[var(--ink)]">
                Periode Berjalan *
              </label>
              <input
                id="settings-periode"
                type="text"
                value={periodeBerjalan}
                onChange={(e) => setPeriodeBerjalan(e.target.value)}
                placeholder="YYYY-MM"
                pattern="\d{4}-\d{2}"
                className="input-editorial h-11"
              />
              {error?.fields?.periodeBerjalan && (
                <p role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
                  {error.fields.periodeBerjalan}
                </p>
              )}
              <p className="text-xs text-[var(--ink-muted)]">
                Saat ini: {formatPeriodLong(periodeBerjalan)}
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="settings-deadline" className="block text-sm font-medium text-[var(--ink)]">
                Tanggal Deadline *
              </label>
              <input
                id="settings-deadline"
                type="text"
                inputMode="numeric"
                value={String(deadlineTanggal)}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  setDeadlineTanggal(v ? parseInt(v, 10) : 1);
                }}
                className="input-editorial h-11"
              />
              {error?.fields?.deadlineTanggal && (
                <p role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
                  {error.fields.deadlineTanggal}
                </p>
              )}
              <p className="text-xs text-[var(--ink-muted)]">
                Tanggal dalam sebulan (1-31). Anggota dianggap tertunggak setelah tanggal ini.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="settings-nama" className="block text-sm font-medium text-[var(--ink)]">
                Nama Organisasi
              </label>
              <input
                id="settings-nama"
                type="text"
                value={namaOrganisasi}
                onChange={(e) => setNamaOrganisasi(e.target.value)}
                className="input-editorial h-11"
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Kontak & Barcode" description="WhatsApp pengurus dan barcode pembayaran" />
          <div className="space-y-5 p-5">
            <div className="space-y-1.5">
              <label htmlFor="settings-wa" className="block text-sm font-medium text-[var(--ink)]">
                Nomor WhatsApp Pengurus
              </label>
              <input
                id="settings-wa"
                type="tel"
                value={waPengurus}
                onChange={(e) => setWaPengurus(e.target.value)}
                placeholder="628xxxxxxxxxx"
                className="input-editorial h-11"
              />
              <p className="text-xs text-[var(--ink-muted)]">
                Digunakan untuk link <code className="rounded bg-[var(--surface-alt)] px-1">wa.me</code> manual pada halaman barcode.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--ink)]">
                Barcode Pembayaran
              </label>
              {settings.barcodePath ? (
                <div className="flex items-center gap-4">
                  {settings.barcodeUrl ? (
                    <img
                      src={settings.barcodeUrl}
                      alt="Barcode"
                      className="h-24 w-24 rounded-lg border border-[var(--border-default)] bg-white p-1"
                    />
                  ) : null}
                  <p className="text-sm text-[var(--ink-muted)]">
                    Barcode saat ini sudah diunggah. Ganti dengan upload file baru.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[var(--ink-muted)]">
                  Belum ada barcode. Upload file gambar barcode pembayaran.
                </p>
              )}
              <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-alt)] px-4 py-2.5 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--surface)]">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Mengunggah..." : "Upload Barcode"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  className="hidden"
                  onChange={async (e) => {
                    const input = e.target;
                    const f = input.files?.[0];
                    if (!f) return;
                    setUploading(true);
                    setError(null);
                    try {
                      const formData = new FormData();
                      formData.append("file", f);
                      const res = await fetch("/api/settings/barcode", {
                        method: "POST",
                        body: formData,
                      });
                      const json = await res.json();
                      if (json.success) {
                        setSettings({ ...settings, ...json.data });
                        setSuccess(true);
                      } else {
                        setError({
                          message:
                            json.error?.message ?? "Gagal mengunggah barcode.",
                          fields: json.error?.fields,
                          requestId: json.error?.requestId,
                        });
                      }
                    } catch {
                      setError({ message: "Gagal terhubung ke server." });
                    } finally {
                      // Reset input supaya memilih file yang sama lagi
                      // tetap memicu event onChange.
                      input.value = "";
                      setUploading(false);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </Card>

        {error && <ErrorBanner message={error.message} requestId={error.requestId} />}
        {success && (
          <div className="flex items-center gap-3 rounded-lg border border-[var(--status-lunas)]/30 bg-[var(--status-lunas-bg)] px-4 py-3 text-sm font-medium text-[var(--status-lunas)]">
            <SettingsIcon className="h-5 w-5" />
            Settings berhasil diperbarui.
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex h-11 items-center gap-2 rounded-lg bg-[var(--button-primary-bg)] px-6 font-semibold text-white hover:bg-[var(--button-primary-hover)] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Settings
          </button>
        </div>
      </form>
    </div>
  );
}

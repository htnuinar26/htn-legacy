"use client";

import { useEffect, useState } from "react";
import { UserCircle, Loader2, Save } from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  LoadingState,
  ErrorBanner,
} from "@/components/blocks/ui";
import { formatPeriodLong, formatDateTime, getBayarStatus } from "@/lib/format";

type Profil = {
  id: string;
  nama: string;
  nim: string | null;
  email: string | null;
  telepon: string | null;
  statusBayar: string;
  periodeBerjalan: string;
  catatan: string | null;
  createdAt: string;
};

export function ProfilView({
  member,
}: {
  member: { anggotaId: string; nama: string };
}) {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nim, setNim] = useState("");
  const [email, setEmail] = useState("");
  const [telepon, setTelepon] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [deadlineTanggal, setDeadlineTanggal] = useState(10);
  const [saveError, setSaveError] = useState<{
    message: string;
    fields?: Record<string, string>;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/anggota/${member.anggotaId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setProfil(json.data);
          setNim(json.data.nim ?? "");
          setEmail(json.data.email ?? "");
          setTelepon(json.data.telepon ?? "");
        } else setError(json.error?.message ?? "Gagal memuat profil.");
      })
      .catch(() => setError("Gagal terhubung ke server."))
      .finally(() => setLoading(false));
  }, [member.anggotaId]);

  // Ambil deadline dari settings supaya label status di halaman Profil
  // memakai aturan yang sama dengan Beranda.
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setDeadlineTanggal(json.data.deadlineTanggal);
      })
      .catch(() => {
        // Deadline hanya memengaruhi label status. Bila gagal dimuat,
        // gunakan nilai default tanpa mengganggu halaman.
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const payload: Record<string, unknown> = { nim, email, telepon };
    if (newPassword) {
      payload.password = newPassword;
      payload.currentPassword = currentPassword;
    }

    try {
      const res = await fetch(`/api/anggota/${member.anggotaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setSaveError({
          message: json.error?.message ?? "Gagal menyimpan.",
          fields: json.error?.fields,
        });
        return;
      }
      setProfil(json.data);
      setNewPassword("");
      setCurrentPassword("");
      setSaveSuccess(true);
    } catch {
      setSaveError({ message: "Gagal terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !profil) return <ErrorBanner message={error ?? "Gagal memuat profil."} />;

  // Tampilkan label status yang sama dengan Beranda, bukan kode enum mentah.
  // `statusBayar` hanya menyimpan status periode berjalan, jadi anggota yang
  // lewat deadline sebenarnya "Tertunggak" tetap melihat "BELUM_LUNAS" di
  // halaman ini kalau label diambil apa adanya.
  const statusLabel = getBayarStatus(profil.statusBayar, deadlineTanggal).label;

  return (
    <div className="space-y-6">
      <PageHeader title="Profil Saya" description="Kelola data pribadi dan password Anda." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kartu info */}
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-primary-soft)]">
              <UserCircle className="h-8 w-8 text-[var(--accent-primary)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--ink)]">{profil.nama}</p>
              <p className="text-sm text-[var(--ink-muted)]">
                {profil.nim ?? "Tanpa NIM"}
              </p>
            </div>
            <div className="w-full space-y-2 border-t border-[var(--border-default)] pt-4 text-left text-sm">
              <InfoRow label="Status Bayar" value={statusLabel} />
              <InfoRow label="Periode" value={formatPeriodLong(profil.periodeBerjalan)} />
              <InfoRow label="Bergabung" value={formatDateTime(profil.createdAt)} />
            </div>
          </div>
        </Card>

        {/* Form edit */}
        <Card className="lg:col-span-2">
          <CardHeader title="Edit Profil" description="Perbarui data kontak dan password" />
          <form onSubmit={handleSave} className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="profil-nim" className="block text-sm font-medium text-[var(--ink)]">NIM</label>
                <input
                  id="profil-nim"
                  type="text"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  className="input-editorial h-11"
                />
                {saveError?.fields?.nim && (
                  <p role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
                    {saveError.fields.nim}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="profil-email" className="block text-sm font-medium text-[var(--ink)]">Email</label>
                <input
                  id="profil-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-editorial h-11"
                />
                {saveError?.fields?.email && (
                  <p role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
                    {saveError.fields.email}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profil-telepon" className="block text-sm font-medium text-[var(--ink)]">
                Nomor WhatsApp
              </label>
              <input
                id="profil-telepon"
                type="tel"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                placeholder="628xxxxxxxxxx"
                className="input-editorial h-11"
              />
            </div>

            <div className="border-t border-[var(--border-default)] pt-4">
              <p className="mb-3 text-sm font-semibold text-[var(--ink)]">
                Ganti Password (opsional)
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="profil-password-saat-ini" className="block text-sm font-medium text-[var(--ink)]">
                    Password Saat Ini
                  </label>
                  <input
                    id="profil-password-saat-ini"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Wajib jika ganti password"
                    className="input-editorial h-11"
                    autoComplete="current-password"
                  />
                  {saveError?.fields?.currentPassword && (
                    <p role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
                      {saveError.fields.currentPassword}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="profil-password-baru" className="block text-sm font-medium text-[var(--ink)]">
                    Password Baru
                  </label>
                  <input
                    id="profil-password-baru"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 4 karakter"
                    className="input-editorial h-11"
                    autoComplete="new-password"
                  />
                  {saveError?.fields?.password && (
                    <p role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
                      {saveError.fields.password}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {saveError && <ErrorBanner message={saveError.message} />}
            {saveSuccess && (
              <div className="rounded-lg border border-[var(--status-lunas)]/30 bg-[var(--status-lunas-bg)] px-4 py-3 text-sm font-medium text-[var(--status-lunas)]">
                Profil berhasil diperbarui.
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--button-primary-bg)] px-6 font-semibold text-white hover:bg-[var(--button-primary-hover)] active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Perubahan
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--ink-muted)]">{label}</span>
      <span className="font-medium text-[var(--ink)]">{value}</span>
    </div>
  );
}

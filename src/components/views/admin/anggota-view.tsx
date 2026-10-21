"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  LoadingState,
  ErrorBanner,
  EmptyState,
} from "@/components/blocks/ui";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatPeriodLong, formatDateTime } from "@/lib/format";

type Anggota = {
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

function bayarVariant(s: string): "lunas" | "belum" | "tertunggak" {
  if (s === "LUNAS") return "lunas";
  if (s === "TERTUNGGAK") return "tertunggak";
  return "belum";
}

export function AnggotaView() {
  const [list, setList] = useState<Anggota[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Anggota | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Anggota | null>(null);

  const load = useCallback(async () => {
     
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/anggota");
      const json = await res.json();
      if (json.success) {
        setList(json.data);
      } else setError(json.error?.message ?? "Gagal memuat anggota.");
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!q) return list;
    const lower = q.toLowerCase();
    return list.filter(
      (a) =>
        a.nama.toLowerCase().includes(lower) ||
        (a.nim ?? "").toLowerCase().includes(lower) ||
        (a.email ?? "").toLowerCase().includes(lower)
    );
  }, [q, list]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/anggota/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error?.message ?? "Gagal menghapus anggota.");
        return;
      }
      setDeleteTarget(null);
      load();
    } catch {
      alert("Gagal terhubung ke server.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Anggota"
        description="Kelola data anggota organisasi."
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="flex h-10 items-center gap-2 rounded-lg bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-white hover:bg-[var(--button-primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            Tambah Anggota
          </button>
        }
      />

      <Card>
        <CardHeader
          title={`${filtered.length} Anggota`}
          action={
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama, NIM, email..."
                className="input-editorial h-9 w-56 pl-9 text-sm"
                aria-label="Cari anggota"
              />
            </div>
          }
        />
        <div className="p-5">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorBanner message={error} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Belum ada anggota"
              description="Tambahkan anggota baru atau import data."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-zebra w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                    <th className="px-3 py-2 font-semibold">Nama</th>
                    <th className="px-3 py-2 font-semibold">NIM</th>
                    <th className="px-3 py-2 font-semibold">Kontak</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Bergabung</th>
                    <th className="px-3 py-2 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-t border-[var(--border-default)]">
                      <td className="px-3 py-3 font-medium text-[var(--ink)]">
                        {a.nama}
                      </td>
                      <td className="px-3 py-3 text-[var(--ink-muted)]">
                        {a.nim ?? "-"}
                      </td>
                      <td className="px-3 py-3 text-[var(--ink-muted)]">
                        <p>{a.email ?? "-"}</p>
                        <p className="text-xs">{a.telepon ?? ""}</p>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          variant={bayarVariant(a.statusBayar)}
                          label={
                            a.statusBayar === "LUNAS"
                              ? "Lunas"
                              : a.statusBayar === "TERTUNGGAK"
                              ? "Tertunggak"
                              : "Belum Lunas"
                          }
                        />
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--ink-muted)]">
                        {formatDateTime(a.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            aria-label={`Edit ${a.nama}`}
                            onClick={() => {
                              setEditing(a);
                              setShowForm(true);
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--ink)]"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Hapus ${a.nama}`}
                            onClick={() => setDeleteTarget(a)}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--status-tertunggak-bg)] hover:text-[var(--status-tertunggak)]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
        <AnggotaForm
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          anggota={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function AnggotaForm({
  editing,
  onClose,
  onSaved,
}: {
  editing: Anggota | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nama, setNama] = useState(editing?.nama ?? "");
  const [nim, setNim] = useState(editing?.nim ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [telepon, setTelepon] = useState(editing?.telepon ?? "");
  const [password, setPassword] = useState("");
  const [statusBayar, setStatusBayar] = useState(editing?.statusBayar ?? "BELUM_LUNAS");
  const [catatan, setCatatan] = useState(editing?.catatan ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{
    message: string;
    fields?: Record<string, string>;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const isEdit = !!editing;
    const payload: Record<string, unknown> = {
      nama,
      nim,
      email,
      telepon,
      statusBayar,
      catatan,
    };
    if (password) payload.password = password;

    try {
      const res = await fetch(
        isEdit ? `/api/anggota/${editing!.id}` : "/api/anggota",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!json.success) {
        setError({
          message: json.error?.message ?? "Gagal menyimpan.",
          fields: json.error?.fields,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Edit anggota" : "Tambah anggota"}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto scroll-area-custom rounded-xl bg-[var(--surface)] shadow-[var(--shadow-modal)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-base font-bold text-[var(--ink)]">
            {editing ? "Edit Anggota" : "Tambah Anggota Baru"}
          </h2>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--ink)]">Nama Lengkap *</label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              className="input-editorial h-11"
            />
            {error?.fields?.nama && (
              <p role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
                {error.fields.nama}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--ink)]">NIM</label>
              <input
                type="text"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                className="input-editorial h-11"
              />
              {error?.fields?.nim && (
                <p role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
                  {error.fields.nim}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--ink)]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-editorial h-11"
              />
              {error?.fields?.email && (
                <p role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
                  {error.fields.email}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--ink)]">WhatsApp</label>
              <input
                type="tel"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                placeholder="628xxxxxxxxxx"
                className="input-editorial h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--ink)]">
                Status Bayar
              </label>
              <select
                value={statusBayar}
                onChange={(e) => setStatusBayar(e.target.value)}
                className="input-editorial h-11"
              >
                <option value="BELUM_LUNAS">Belum Lunas</option>
                <option value="LUNAS">Lunas</option>
                <option value="TERTUNGGAK">Tertunggak</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--ink)]">
              Password {editing ? "(kosongkan jika tidak diubah)" : "*"}
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!editing}
              placeholder={editing ? "Kosongkan jika tetap" : "Min. 4 karakter"}
              className="input-editorial h-11"
              autoComplete="off"
            />
            {error?.fields?.password && (
              <p role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
                {error.fields.password}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--ink)]">Catatan</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              className="input-editorial"
            />
          </div>

          {error && <ErrorBanner message={error.message} />}

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
              {editing ? "Simpan" : "Tambah"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDialog({
  anggota,
  onCancel,
  onConfirm,
}: {
  anggota: Anggota;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Konfirmasi hapus anggota"
        className="relative z-10 w-full max-w-md rounded-xl bg-[var(--surface)] p-6 shadow-[var(--shadow-modal)]"
      >
        <h2 className="text-base font-bold text-[var(--ink)]">Hapus Anggota?</h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Anda akan menghapus <strong className="text-[var(--ink)]">{anggota.nama}</strong>.
          Semua struk dan transaksi terkait juga akan dihapus. Aksi ini tidak dapat dibatalkan.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-[var(--border-default)] px-4 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--surface-alt)]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-lg bg-[var(--button-danger-bg)] px-4 text-sm font-semibold text-white hover:brightness-95"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

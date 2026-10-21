"use client";

import { useEffect, useState } from "react";
import {
  ScrollText,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Settings as SettingsIcon,
  Upload,
  UserPlus,
  FilePlus2,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  LoadingState,
  ErrorBanner,
  EmptyState,
} from "@/components/blocks/ui";
import { formatDateTime } from "@/lib/format";

type LogItem = {
  id: string;
  aksi: string;
  actorNama: string | null;
  deskripsi: string;
  refType: string | null;
  refId: string | null;
  detail: string | null;
  createdAt: string;
};

const AKSI_META: Record<
  string,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  APPROVE_STRUK: { icon: CheckCircle2, color: "var(--status-lunas)", label: "Approve Struk" },
  REJECT_STRUK: { icon: XCircle, color: "var(--status-tertunggak)", label: "Reject Struk" },
  CREATE_TRANSAKSI: { icon: Plus, color: "var(--status-lunas)", label: "Catat Transaksi" },
  DELETE_TRANSAKSI: { icon: Trash2, color: "var(--status-tertunggak)", label: "Hapus Transaksi" },
  CREATE_STRUK_MANUAL: { icon: FilePlus2, color: "var(--accent-primary)", label: "Struk Manual" },
  UPDATE_ANGGOTA: { icon: UserPlus, color: "var(--accent-primary)", label: "Update Anggota" },
  DELETE_ANGGOTA: { icon: Trash2, color: "var(--status-tertunggak)", label: "Hapus Anggota" },
  UPDATE_SETTINGS: { icon: SettingsIcon, color: "var(--accent-secondary)", label: "Update Settings" },
  IMPORT_ANGGOTA: { icon: Upload, color: "var(--accent-primary)", label: "Import Anggota" },
};

export function AuditLogView() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [aksiFilter, setAksiFilter] = useState("");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    const param = aksiFilter ? `?aksi=${aksiFilter}` : "";
    fetch(`/api/admin/audit-log${param}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setLogs(json.data.logs);
          setTotal(json.data.total);
        } else setError(json.error);
      })
      .catch(() => setError({ message: "Gagal terhubung ke server." }))
      .finally(() => setLoading(false));
  }, [aksiFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description={`${total} entri aktivitas Admin. Jejak audit permanen.`}
        action={
          <select
            value={aksiFilter}
            onChange={(e) => setAksiFilter(e.target.value)}
            className="input-editorial h-10 w-auto text-sm"
            aria-label="Filter aksi"
          >
            <option value="">Semua Aksi</option>
            <option value="APPROVE_STRUK">Approve Struk</option>
            <option value="REJECT_STRUK">Reject Struk</option>
            <option value="CREATE_TRANSAKSI">Catat Transaksi</option>
            <option value="DELETE_TRANSAKSI">Hapus Transaksi</option>
            <option value="CREATE_STRUK_MANUAL">Struk Manual</option>
            <option value="UPDATE_ANGGOTA">Update Anggota</option>
            <option value="DELETE_ANGGOTA">Hapus Anggota</option>
            <option value="UPDATE_SETTINGS">Update Settings</option>
          </select>
        }
      />

      <Card>
        <CardHeader title={`${logs.length} Entri`} />
        <div className="p-5">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorBanner message={error.message} requestId={error.requestId} />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="Belum ada aktivitas"
              description="Audit log akan terisi saat Admin melakukan aksi."
            />
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => {
                const meta = AKSI_META[l.aksi] ?? {
                  icon: ScrollText,
                  color: "var(--ink-muted)",
                  label: l.aksi,
                };
                const Icon = meta.icon;
                return (
                  <li
                    key={l.id}
                    className="flex items-start gap-3 rounded-lg border border-[var(--border-default)] px-4 py-3"
                  >
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                        color: meta.color,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{
                            background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                            color: meta.color,
                          }}
                        >
                          {meta.label}
                        </span>
                        <span className="text-xs text-[var(--ink-muted)]">
                          {formatDateTime(l.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--ink)]">{l.deskripsi}</p>
                      {l.actorNama && (
                        <p className="text-xs text-[var(--ink-muted)]">
                          Oleh: {l.actorNama}
                        </p>
                      )}
                      {l.detail && (
                        <p className="mt-1 font-mono text-xs text-[var(--ink-muted)]">
                          {l.detail}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

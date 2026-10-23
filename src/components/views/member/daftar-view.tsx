"use client";

import { useEffect, useState, useMemo } from "react";
import { Users, Search } from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  LoadingState,
  ErrorBanner,
  EmptyState,
} from "@/components/blocks/ui";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPeriodLong } from "@/lib/format";

type Anggota = {
  id: string;
  nama: string;
  nim: string | null;
  statusBayar: string;
  periodeBerjalan: string;
};

type StatusFilter = "ALL" | "LUNAS" | "BELUM_LUNAS" | "TERTUNGGAK";

function bayarVariant(s: string): "lunas" | "belum" | "tertunggak" {
  if (s === "LUNAS") return "lunas";
  if (s === "TERTUNGGAK") return "tertunggak";
  return "belum";
}

export function DaftarView() {
  const [list, setList] = useState<Anggota[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/anggota")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setList(Array.isArray(json.data) ? json.data : []);
        } else setError(json.error?.message ?? "Gagal memuat daftar.");
      })
      .catch(() => setError("Gagal terhubung ke server."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const byStatus = statusFilter === "ALL"
      ? list
      : list.filter((a) => a.statusBayar === statusFilter);
    if (!q) return byStatus;
    const lower = q.toLowerCase();
    return byStatus.filter(
      (a) =>
        a.nama.toLowerCase().includes(lower) ||
        (a.nim ?? "").toLowerCase().includes(lower)
    );
  }, [q, list, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Anggota"
        description="Daftar anggota organisasi dan status pembayaran."
      />

      <Card>
        <CardHeader
          title={`${filtered.length} Anggota`}
          action={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-auto" aria-label="Filter status pembayaran">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua status</SelectItem>
                  <SelectItem value="LUNAS">Sudah bayar</SelectItem>
                  <SelectItem value="BELUM_LUNAS">Belum bayar</SelectItem>
                  <SelectItem value="TERTUNGGAK">Tertunggak</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama atau NIM..."
                className="input-editorial h-11 w-full pl-9 text-sm sm:w-56"
                aria-label="Cari anggota"
              />
              </div>
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
              title={q.trim() ? "Tidak ada anggota yang cocok" : "Tidak ada anggota"}
              description={
                q.trim()
                  ? `Tidak ada anggota yang cocok dengan pencarian "${q.trim()}".`
                  : "Belum ada anggota yang terdaftar."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-zebra w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                    <th className="px-3 py-2 font-semibold">Nama</th>
                    <th className="px-3 py-2 font-semibold">NIM</th>
                    <th className="px-3 py-2 font-semibold">Periode</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
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
                        {formatPeriodLong(a.periodeBerjalan)}
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

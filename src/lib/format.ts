// HTN Legacy — Format & Period helpers

export const MAX_RECEIPT_MONTHS = 4;

const rupiahFormatter = new Intl.NumberFormat("id-ID");

/** Format integer ke string ribuan Indonesia, mis. 15000 → "15.000". */
export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return rupiahFormatter.format(value);
}

/** Format dengan prefiks Rp, mis. 15000 → "Rp 15.000". */
export function formatRupiahFull(value: number | null | undefined): string {
  return `Rp ${formatRupiah(value)}`;
}

/** Dapatkan periode berjalan format YYYY-MM (berdasar timezone Asia/Bangkok). */
export function currentPeriod(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * Dapatkan daftar MAX_RECEIPT_MONTHS periode terbaru (termasuk berjalan).
 * Index 0 = periode berjalan, index terakhir = paling lama.
 */
export function recentPeriods(now: Date = new Date()): string[] {
  const periods: string[] = [];
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = 0; i < MAX_RECEIPT_MONTHS; i++) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const y = dd.getFullYear();
    const m = dd.getMonth() + 1;
    periods.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return periods;
}

/** Format periode YYYY-MM ke label yang mudah dibaca, mis. "2026-10" → "Okt 2026". */
export function formatPeriodLabel(periode: string): string {
  const [y, m] = periode.split("-");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const idx = parseInt(m, 10) - 1;
  if (idx < 0 || idx > 11) return periode;
  return `${monthNames[idx]} ${y}`;
}

/** Format periode lengkap, mis. "2026-10" → "Oktober 2026". */
export function formatPeriodLong(periode: string): string {
  const [y, m] = periode.split("-");
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const idx = parseInt(m, 10) - 1;
  if (idx < 0 || idx > 11) return periode;
  return `${monthNames[idx]} ${y}`;
}

/** Format tanggal untuk ditampilkan, mis. "12 Okt 2026, 14:30". */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

/** Format tanggal singkat, mis. "12 Okt 2026". */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

/** Cek apakah anggota tertunggak berdasar status & deadline. */
export function isTertunggak(
  statusBayar: string,
  deadlineTanggal: number,
  now: Date = new Date()
): boolean {
  if (statusBayar === "LUNAS") return false;
  return now.getDate() > deadlineTanggal;
}

/** Hitung label status pembayaran anggota. */
export function getBayarStatus(
  statusBayar: string,
  deadlineTanggal: number,
  now: Date = new Date()
): { label: string; variant: "lunas" | "belum" | "tertunggak" } {
  if (statusBayar === "LUNAS") return { label: "Lunas", variant: "lunas" };
  if (isTertunggak(statusBayar, deadlineTanggal, now)) {
    return { label: "Tertunggak", variant: "tertunggak" };
  }
  return { label: "Belum Lunas", variant: "belum" };
}

/** Membangun link WhatsApp manual sesuai SPEC.md. */
export function buildWaLink(phone: string, message: string): string {
  const clean = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

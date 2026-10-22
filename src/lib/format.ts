// HTN Legacy - Format & Period helpers

export const MAX_RECEIPT_MONTHS = 4;

// Zona waktu organisasi. Seluruh perhitungan periode dan tanggal memakai
// zona ini, bukan zona waktu lokal runtime. Tanpa ini, client (WIB) dan
// server (UTC) bisa menghitung periode yang berbeda di sekitar pergantian
// bulan, sehingga anggota memilih periode yang ditolak server.
export const ORGANIZATION_TIMEZONE = "Asia/Bangkok";

const rupiahFormatter = new Intl.NumberFormat("id-ID");

/** Format integer ke string ribuan Indonesia, mis. 15000 -> "15.000". */
export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return rupiahFormatter.format(value);
}

/** Format dengan prefiks Rp, mis. 15000 -> "Rp 15.000". */
export function formatRupiahFull(value: number | null | undefined): string {
  return `Rp ${formatRupiah(value)}`;
}

/**
 * Dapatkan periode berjalan format YYYY-MM dalam zona waktu organisasi.
 */
export function currentPeriod(now: Date = new Date()): string {
  const parts = periodParts(now);
  return `${parts.year}-${parts.month}`;
}

/**
 * Dapatkan daftar MAX_RECEIPT_MONTHS periode terbaru (termasuk berjalan).
 * Index 0 = periode berjalan, index terakhir = paling lama.
 */
export function recentPeriods(now: Date = new Date()): string[] {
  const periods: string[] = [];
  const { year, month } = periodParts(now);
  for (let i = 0; i < MAX_RECEIPT_MONTHS; i++) {
    const total = year * 12 + (month - 1) - i;
    const y = Math.floor(total / 12);
    const m = (total % 12) + 1;
    periods.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return periods;
}

/**
 * Pisahkan tahun dan bulan pada zona waktu organisasi.
 * Menghitung lewat Intl.DateTimeFormat supaya hasilnya sama di server
 * (UTC) dan di browser anggota (WIB).
 */
function periodParts(now: Date): { year: number; month: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ORGANIZATION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return { year, month };
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
    timeZone: ORGANIZATION_TIMEZONE,
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
    timeZone: ORGANIZATION_TIMEZONE,
  });
}

/**
 * Tanggal hari ini dalam zona waktu organisasi, sebagai angka 1 sampai 31.
 * Dipakai untuk menentukan status tertunggak terhadap deadline.
 */
export function currentDayOfMonth(now: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ORGANIZATION_TIMEZONE,
    day: "2-digit",
  });
  return Number(formatter.format(now));
}

/** Cek apakah anggota tertunggak berdasar status & deadline. */
export function isTertunggak(
  statusBayar: string,
  deadlineTanggal: number,
  now: Date = new Date()
): boolean {
  if (statusBayar === "LUNAS") return false;
  return currentDayOfMonth(now) > deadlineTanggal;
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

/**
 * Bangun link WhatsApp manual sesuai SPEC.md.
 *
 * Nomor WhatsApp harus format internasional tanpa nol di depan. Nomor lokal
 * Indonesia yang lazim diisi Admin di form settings, misalnya "0812-3456-7890",
 * harus dinormalisasi menjadi "628123456789". Tanpa itu, wa.me membuka
 * halaman "nomor tidak valid" dan anggota tidak bisa menghubungi pengurus.
 */
export function buildWaLink(phone: string, message: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  let normalized = digits;
  if (normalized.startsWith("0")) {
    normalized = `62${normalized.slice(1)}`;
  } else if (normalized.startsWith("8")) {
    normalized = `62${normalized}`;
  }
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

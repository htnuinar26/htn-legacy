import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError, apiUnexpected } from "@/lib/api-response";
import { isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

// GET /api/admin/struk-generator/anggota
// Daftar anggota TANPA receipt aktif (PENDING/APPROVED) pada periode berjalan.
export async function GET(_req: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return apiError(
        "AUTH_ERROR",
        "Akses ditolak. Hanya Admin yang dapat mengakses daftar anggota untuk struk generator.",
        { status: 403 }
      );
    }

    const settings = await getSettings();
    const periode = settings.periodeBerjalan;

    // Ambil semua anggota.
    const allAnggota = await db.anggota.findMany({
      orderBy: { nama: "asc" },
      select: {
        id: true,
        nama: true,
        nim: true,
        email: true,
        telepon: true,
        statusBayar: true,
        periodeBerjalan: true,
      },
    });

    // Ambil ID anggota yang sudah punya receipt aktif periode berjalan.
    const activeStruk = await db.struk.findMany({
      where: {
        periodeBulan: periode,
        status: { in: ["PENDING", "APPROVED"] },
      },
      select: { anggotaId: true },
    });
    const activeAnggotaIds = new Set(activeStruk.map((s) => s.anggotaId));

    // Filter: hanya anggota tanpa receipt aktif.
    const available = allAnggota.filter((a) => !activeAnggotaIds.has(a.id));

    return apiSuccess({
      periodeBerjalan: periode,
      nominalIuran: settings.nominalIuran,
      anggota: available.map((a) => ({
        id: a.id,
        nama: a.nama,
        nim: a.nim,
        email: a.email,
        telepon: a.telepon,
        statusBayar: a.statusBayar,
      })),
    });
  } catch (err) {
    return apiUnexpected(err, "/api/admin/struk-generator/anggota");
  }
}

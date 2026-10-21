import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError, apiUnexpected } from "@/lib/api-response";
import { isAdmin } from "@/lib/auth";
import { getSignedUrl } from "@/lib/storage";

// GET /api/struk — daftar struk untuk review Admin.
// Query: ?status=PENDING|APPROVED|REJECTED  (default: semua)
export async function GET(req: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return apiError(
        "AUTH_ERROR",
        "Akses ditolak. Hanya Admin yang dapat melihat daftar struk.",
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where = status ? { status } : {};
    const strukList = await db.struk.findMany({
      where,
      include: { anggota: true },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(
      strukList.map((s) => ({
        id: s.id,
        anggotaId: s.anggotaId,
        anggotaNama: s.anggota.nama,
        periodeBulan: s.periodeBulan,
        status: s.status,
        nominal: s.nominal,
        sumber: s.sumber,
        alasanReject: s.alasanReject,
        catatan: s.catatan,
        url: getSignedUrl(s.filePath),
        createdAt: s.createdAt,
        reviewedAt: s.reviewedAt,
      }))
    );
  } catch (err) {
    return apiUnexpected(err);
  }
}

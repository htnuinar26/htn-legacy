import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError, apiUnexpected } from "@/lib/api-response";
import { getMemberSession, isAdmin } from "@/lib/auth";
import { getSignedUrl } from "@/lib/storage";

// GET /api/anggota/[id]/struk - riwayat receipt milik anggota.
// Anggota hanya bisa melihat riwayatnya sendiri; Admin bisa melihat semua.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [member, admin] = await Promise.all([getMemberSession(), isAdmin()]);

    // Otorisasi: anggota hanya bisa akses miliknya sendiri.
    if (!admin && member?.anggotaId !== id) {
      return apiError(
        "AUTH_ERROR",
        "Anda tidak memiliki izin melihat riwayat struk anggota lain.",
        { status: 403 }
      );
    }

    const strukList = await db.struk.findMany({
      where: { anggotaId: id },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(
      strukList.map((s) => ({
        id: s.id,
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

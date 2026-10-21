import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError, apiUnexpected } from "@/lib/api-response";
import { isAdmin } from "@/lib/auth";

// GET /api/admin/audit-log — daftar audit log (Admin only).
// Query: ?limit=50&offset=0&aksi=APPROVE_STRUK
export async function GET(req: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return apiError(
        "AUTH_ERROR",
        "Akses ditolak. Hanya Admin yang dapat melihat audit log.",
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;
    const aksi = searchParams.get("aksi");

    const where = aksi ? { aksi } : {};
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.auditLog.count({ where }),
    ]);

    return apiSuccess({
      logs: logs.map((l) => ({
        id: l.id,
        aksi: l.aksi,
        actorNama: l.actorNama,
        deskripsi: l.deskripsi,
        refType: l.refType,
        refId: l.refId,
        detail: l.detail,
        createdAt: l.createdAt,
      })),
      total,
      limit,
      offset,
    });
  } catch (err) {
    return apiUnexpected(err);
  }
}

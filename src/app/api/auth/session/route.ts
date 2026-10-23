import { NextRequest } from "next/server";
import { apiSuccess, apiUnexpected } from "@/lib/api-response";
import { getMemberSession, getAdminSession } from "@/lib/auth";

// GET /api/auth/session - ambil sesi saat ini (anggota + admin).
export async function GET(_req: NextRequest) {
  try {
    const [member, admin] = await Promise.all([
      getMemberSession(),
      getAdminSession(),
    ]);
    return apiSuccess({
      member: member
        ? { anggotaId: member.anggotaId, nama: member.nama }
        : null,
      admin: admin?.role === "admin" ? { nama: admin.nama } : null,
      isAdmin: admin?.role === "admin",
    });
  } catch (err) {
    return apiUnexpected(err, "/api/auth/session");
  }
}

import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api-response";
import { getMemberSession, getAdminSession } from "@/lib/auth";

// GET /api/auth/session - ambil sesi saat ini (anggota + admin).
export async function GET(_req: NextRequest) {
  const [member, admin] = await Promise.all([
    getMemberSession(),
    getAdminSession(),
  ]);
  return apiSuccess({
    member: member
      ? { anggotaId: member.anggotaId, nama: member.nama }
      : null,
    isAdmin: admin?.role === "admin",
  });
}

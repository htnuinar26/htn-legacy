import { NextRequest } from "next/server";
import { apiSuccess, apiUnexpected } from "@/lib/api-response";
import { destroyMemberSession, destroyAdminSession } from "@/lib/auth";

// POST /api/auth/logout - hancurkan sesi anggota dan Admin.
export async function POST(_req: NextRequest) {
  try {
    await Promise.all([destroyMemberSession(), destroyAdminSession()]);
    return apiSuccess({ ok: true });
  } catch (err) {
    return apiUnexpected(err, "/api/auth/logout");
  }
}

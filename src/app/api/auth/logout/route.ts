import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api-response";
import { destroyMemberSession, destroyAdminSession } from "@/lib/auth";

// POST /api/auth/logout — hancurkan sesi anggota dan Admin.
export async function POST(_req: NextRequest) {
  await Promise.all([destroyMemberSession(), destroyAdminSession()]);
  return apiSuccess({ ok: true });
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, zodFields, apiUnexpected } from "@/lib/api-response";
import {
  verifyAdminPassword,
  createAdminSession,
  isConfiguredAdminName,
} from "@/lib/auth";

const AdminLoginSchema = z.object({
  nama: z.string().min(1, "Nama Admin wajib dipilih"),
  password: z.string().min(1, "Password Admin wajib diisi"),
});

// POST /api/auth/admin-login - login Admin/Bendahara dengan password bersama.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = AdminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Input login Admin tidak valid.", {
        fields: zodFields(parsed.error.issues),
      });
    }

    const { nama, password } = parsed.data;
    if (!isConfiguredAdminName(nama)) {
      return apiError(
        "AUTH_ERROR",
        "Nama Admin tidak terdaftar. Pilih nama Admin dari daftar yang tersedia.",
        { status: 403, fields: { nama: "Nama Admin tidak terdaftar" } }
      );
    }
    if (!verifyAdminPassword(password)) {
      return apiError(
        "AUTH_ERROR",
        "Password Admin tidak sesuai. Hubungi pengurus jika lupa password.",
        { status: 401 }
      );
    }

    await createAdminSession({ role: "admin", nama });

    return apiSuccess({ nama });
  } catch (err) {
    return apiUnexpected(err, "/api/auth/admin-login");
  }
}

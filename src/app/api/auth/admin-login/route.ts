import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, zodFields, apiUnexpected } from "@/lib/api-response";
import { verifyAdminPassword, createAdminSession } from "@/lib/auth";

const AdminLoginSchema = z.object({
  password: z.string().min(1, "Password Admin wajib diisi"),
});

// POST /api/auth/admin-login — login Admin/Bendahara dengan password bersama.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = AdminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Input login Admin tidak valid.", {
        fields: zodFields(parsed.error.issues),
      });
    }

    const { password } = parsed.data;
    if (!verifyAdminPassword(password)) {
      return apiError(
        "AUTH_ERROR",
        "Password Admin tidak sesuai. Hubungi pengurus jika lupa password.",
        { status: 401 }
      );
    }

    await createAdminSession({ role: "admin", nama: "Bendahara" });

    return apiSuccess({ nama: "Bendahara" });
  } catch (err) {
    return apiUnexpected(err);
  }
}

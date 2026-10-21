import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, apiUnexpected, classifyPrismaError } from "@/lib/api-response";
import { isAdmin } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/settings";

// GET /api/settings — ambil settings global (publik untuk anggota, edit admin).
export async function GET() {
  try {
    const settings = await getSettings();
    return apiSuccess({
      nominalIuran: settings.nominalIuran,
      periodeBerjalan: settings.periodeBerjalan,
      deadlineTanggal: settings.deadlineTanggal,
      waPengurus: settings.waPengurus,
      barcodePath: settings.barcodePath,
      namaOrganisasi: settings.namaOrganisasi,
    });
  } catch (err) {
    return apiUnexpected(err);
  }
}

const UpdateSettingsSchema = z.object({
  nominalIuran: z
    .number({ message: "Nominal iuran wajib diisi" })
    .int("Nominal iuran harus bilangan bulat")
    .positive("Nominal iuran harus lebih dari 0")
    .optional(),
  periodeBerjalan: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Periode harus format YYYY-MM")
    .optional(),
  deadlineTanggal: z
    .number()
    .int("Deadline harus 1-31")
    .min(1, "Deadline minimal 1")
    .max(31, "Deadline maksimal 31")
    .optional(),
  waPengurus: z.string().optional(),
  namaOrganisasi: z.string().min(1).optional(),
});

// PATCH /api/settings — update settings global (Admin only).
// nominalIuran WAJIB lewat RupiahInput di client.
export async function PATCH(req: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return apiError(
        "AUTH_ERROR",
        "Akses ditolak. Hanya Admin yang dapat mengubah settings.",
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = UpdateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Data settings tidak valid.",
        {
          fields: Object.fromEntries(
            parsed.error.issues.map((i) => [String(i.path[0] ?? "_"), i.message])
          ),
        }
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.nominalIuran !== undefined)
      data.nominalIuran = Math.floor(parsed.data.nominalIuran);
    if (parsed.data.periodeBerjalan !== undefined)
      data.periodeBerjalan = parsed.data.periodeBerjalan;
    if (parsed.data.deadlineTanggal !== undefined)
      data.deadlineTanggal = parsed.data.deadlineTanggal;
    if (parsed.data.waPengurus !== undefined)
      data.waPengurus = parsed.data.waPengurus || null;
    if (parsed.data.namaOrganisasi !== undefined)
      data.namaOrganisasi = parsed.data.namaOrganisasi;

    try {
      const updated = await updateSettings(data);
      return apiSuccess({
        nominalIuran: updated.nominalIuran,
        periodeBerjalan: updated.periodeBerjalan,
        deadlineTanggal: updated.deadlineTanggal,
        waPengurus: updated.waPengurus,
        namaOrganisasi: updated.namaOrganisasi,
      });
    } catch (dbErr) {
      const classified = classifyPrismaError(dbErr);
      return apiError(classified.category, classified.message, {
        cause: dbErr,
      });
    }
  } catch (err) {
    return apiUnexpected(err);
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiSuccess, apiError, zodFields, apiUnexpected } from "@/lib/api-response";
import { verifyPassword } from "@/lib/crypto";
import { createMemberSession } from "@/lib/auth";

const LoginSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

// POST /api/auth/login - login anggota berdasar nama + password per aksi.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Input login tidak valid.", {
        fields: zodFields(parsed.error.issues),
      });
    }

    const { nama, password } = parsed.data;

    // Pencocokan nama tahan huruf besar-kecil. Login memakai nama (bukan NIM)
    // supaya anggota dengan NIM kosong atau duplikat tetap bisa masuk.
    const anggota = await db.anggota.findFirst({
      where: { nama: { equals: nama, mode: "insensitive" } },
    });

    if (!anggota) {
      return apiError(
        "AUTH_ERROR",
        "Nama atau password tidak sesuai. Periksa kembali data Anda.",
        { status: 401 }
      );
    }

    const ok = verifyPassword(password, anggota.passwordEnc);
    if (!ok) {
      return apiError(
        "AUTH_ERROR",
        "Nama atau password tidak sesuai. Periksa kembali data Anda.",
        { status: 401 }
      );
    }

    await createMemberSession({
      anggotaId: anggota.id,
      nama: anggota.nama,
      role: "anggota",
    });

    return apiSuccess({
      anggotaId: anggota.id,
      nama: anggota.nama,
    });
  } catch (err) {
    return apiUnexpected(err, "/api/auth/login");
  }
}

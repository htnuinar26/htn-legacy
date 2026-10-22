import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  apiSuccess,
  apiError,
  zodFields,
  apiUnexpected,
  classifyPrismaError,
} from "@/lib/api-response";
import { encryptPassword } from "@/lib/crypto";
import { createMemberSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

const SignupSchema = z.object({
  nama: z.string().min(2, "Nama minimal 2 karakter"),
  nim: z.string().optional(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  telepon: z.string().optional(),
  password: z.string().min(4, "Password minimal 4 karakter"),
});

// POST /api/auth/signup - registrasi anggota baru.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Data registrasi tidak valid.", {
        fields: zodFields(parsed.error.issues),
      });
    }

    const { nama, nim, email, telepon, password } = parsed.data;
    const settings = await getSettings();

    // Cek duplikat nama/nim/email.
    // Nama dicocokkan tanparegarding huruf besar-kecil supaya dua akun dengan
    // nama yang sama tapi beda kapital tidak bisa dibuat. Kalau sampai ada,
    // login berbasis nama jadi ambigu.
    const existing = await db.anggota.findFirst({
      where: {
        OR: [
          { nama: { equals: nama, mode: "insensitive" } },
          ...(nim ? [{ nim: { equals: nim } }] : []),
          ...(email ? [{ email: { equals: email } }] : []),
        ],
      },
    });
    if (existing) {
      const field =
        existing.nama.toLowerCase() === nama.toLowerCase()
          ? "nama"
          : existing.nim === nim
            ? "nim"
            : "email";
      return apiError("CONFLICT", `${field} sudah terdaftar. Gunakan data lain atau login.`, {
        fields: { [field]: `${field} sudah terdaftar` },
      });
    }

    const anggota = await db.anggota.create({
      data: {
        nama,
        nim: nim || null,
        email: email || null,
        telepon: telepon || null,
        passwordEnc: encryptPassword(password),
        periodeBerjalan: settings.periodeBerjalan,
        statusBayar: "BELUM_LUNAS",
      },
    });

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
    const classified = classifyPrismaError(err);
    if (classified.category === "CONFLICT") {
      return apiError("CONFLICT", classified.message);
    }
    return apiUnexpected(err, "/api/auth/signup");
  }
}

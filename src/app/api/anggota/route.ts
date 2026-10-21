import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  apiSuccess,
  apiError,
  apiUnexpected,
  classifyPrismaError,
} from "@/lib/api-response";
import { isAdmin, getMemberSession } from "@/lib/auth";
import { encryptPassword } from "@/lib/crypto";
import { getSettings } from "@/lib/settings";

// GET /api/anggota — daftar anggota (Admin: semua; Anggota: list ringkas publik).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const admin = await isAdmin();

    const where = q
      ? {
          OR: [
            { nama: { contains: q } },
            { nim: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {};

    const anggotaList = await db.anggota.findMany({
      where,
      orderBy: { nama: "asc" },
      select: admin
        ? {
            id: true,
            nama: true,
            nim: true,
            email: true,
            telepon: true,
            statusBayar: true,
            periodeBerjalan: true,
            catatan: true,
            createdAt: true,
          }
        : {
            id: true,
            nama: true,
            nim: true,
            statusBayar: true,
            periodeBerjalan: true,
          },
    });

    return apiSuccess(anggotaList);
  } catch (err) {
    return apiUnexpected(err);
  }
}

const CreateAnggotaSchema = z.object({
  nama: z.string().min(2, "Nama minimal 2 karakter"),
  nim: z.string().optional(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  telepon: z.string().optional(),
  password: z.string().min(4, "Password minimal 4 karakter"),
  statusBayar: z.enum(["LUNAS", "BELUM_LUNAS", "TERTUNGGAK"]).optional(),
});

// POST /api/anggota — buat anggota baru (Admin).
export async function POST(req: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return apiError(
        "AUTH_ERROR",
        "Akses ditolak. Hanya Admin yang dapat menambah anggota.",
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = CreateAnggotaSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Data anggota tidak valid.",
        {
          fields: Object.fromEntries(
            parsed.error.issues.map((i) => [String(i.path[0] ?? "_"), i.message])
          ),
        }
      );
    }

    const { nama, nim, email, telepon, password, statusBayar } = parsed.data;
    const settings = await getSettings();

    // Cek duplikat.
    const existing = await db.anggota.findFirst({
      where: {
        OR: [
          { nama: { equals: nama } },
          ...(nim ? [{ nim: { equals: nim } }] : []),
          ...(email ? [{ email: { equals: email } }] : []),
        ],
      },
    });
    if (existing) {
      const field =
        existing.nama === nama ? "nama" : existing.nim === nim ? "nim" : "email";
      return apiError("CONFLICT", `${field} sudah terdaftar.`, {
        fields: { [field]: `${field} sudah terdaftar` },
      });
    }

    try {
      const anggota = await db.anggota.create({
        data: {
          nama,
          nim: nim || null,
          email: email || null,
          telepon: telepon || null,
          passwordEnc: encryptPassword(password),
          periodeBerjalan: settings.periodeBerjalan,
          statusBayar: statusBayar ?? "BELUM_LUNAS",
        },
      });

      await db.auditLog.create({
        data: {
          aksi: "UPDATE_ANGGOTA",
          actorNama: "Bendahara",
          deskripsi: `Menambah anggota baru: ${anggota.nama}.`,
          refType: "Anggota",
          refId: anggota.id,
        },
      });

      return apiSuccess({
        id: anggota.id,
        nama: anggota.nama,
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

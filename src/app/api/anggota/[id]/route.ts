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
import { encryptPassword, verifyPassword } from "@/lib/crypto";
import { getSettings } from "@/lib/settings";

type Params = { params: Promise<{ id: string }> };

// GET /api/anggota/[id] — detail anggota.
// Anggota hanya bisa melihat dirinya sendiri; Admin bisa melihat semua.
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const [member, admin] = await Promise.all([getMemberSession(), isAdmin()]);

    if (!admin && member?.anggotaId !== id) {
      return apiError(
        "AUTH_ERROR",
        "Anda tidak memiliki izin melihat profil anggota lain.",
        { status: 403 }
      );
    }

    const anggota = await db.anggota.findUnique({
      where: { id },
      select: {
        id: true,
        nama: true,
        nim: true,
        email: true,
        telepon: true,
        statusBayar: true,
        periodeBerjalan: true,
        catatan: true,
        createdAt: true,
      },
    });
    if (!anggota) {
      return apiError("NOT_FOUND", "Anggota tidak ditemukan.", {
        fields: { id: "Anggota tidak ada" },
      });
    }

    return apiSuccess(anggota);
  } catch (err) {
    return apiUnexpected(err);
  }
}

const UpdateSchema = z.object({
  nama: z.string().min(2).optional(),
  nim: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telepon: z.string().optional(),
  statusBayar: z.enum(["LUNAS", "BELUM_LUNAS", "TERTUNGGAK"]).optional(),
  catatan: z.string().optional(),
  password: z.string().min(4).optional(),
  currentPassword: z.string().optional(),
});

// PATCH /api/anggota/[id] — update anggota.
// Admin bisa update semua field. Anggota hanya bisa update profil & password sendiri.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const [member, admin] = await Promise.all([getMemberSession(), isAdmin()]);

    if (!admin && member?.anggotaId !== id) {
      return apiError(
        "AUTH_ERROR",
        "Anda tidak memiliki izin mengubah data anggota lain.",
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Data pembaruan tidak valid.",
        {
          fields: Object.fromEntries(
            parsed.error.issues.map((i) => [String(i.path[0] ?? "_"), i.message])
          ),
        }
      );
    }

    const anggota = await db.anggota.findUnique({ where: { id } });
    if (!anggota) {
      return apiError("NOT_FOUND", "Anggota tidak ditemukan.", {
        fields: { id: "Anggota tidak ada" },
      });
    }

    const { nama, nim, email, telepon, statusBayar, catatan, password, currentPassword } =
      parsed.data;

    // Anggota non-admin yang ganti password wajib verifikasi password saat ini.
    if (!admin && password) {
      if (!currentPassword) {
        return apiError(
          "VALIDATION_ERROR",
          "Password saat ini wajib diisi untuk mengganti password.",
          { fields: { currentPassword: "Wajib diisi" } }
        );
      }
      if (!verifyPassword(currentPassword, anggota.passwordEnc)) {
        return apiError(
          "AUTH_ERROR",
          "Password saat ini tidak sesuai.",
          { status: 401, fields: { currentPassword: "Password salah" } }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (nama !== undefined) data.nama = nama;
    if (nim !== undefined) data.nim = nim || null;
    if (email !== undefined) data.email = email || null;
    if (telepon !== undefined) data.telepon = telepon || null;
    if (catatan !== undefined) data.catatan = catatan || null;
    if (admin && statusBayar !== undefined) data.statusBayar = statusBayar;
    if (password) data.passwordEnc = encryptPassword(password);

    try {
      const updated = await db.anggota.update({
        where: { id },
        data,
        select: {
          id: true,
          nama: true,
          nim: true,
          email: true,
          telepon: true,
          statusBayar: true,
          periodeBerjalan: true,
          catatan: true,
        },
      });

      if (admin) {
        await db.auditLog.create({
          data: {
            aksi: "UPDATE_ANGGOTA",
            actorNama: "Bendahara",
            deskripsi: `Memperbarui data anggota: ${updated.nama}.`,
            refType: "Anggota",
            refId: id,
          },
        });
      }

      return apiSuccess(updated);
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

// DELETE /api/anggota/[id] — hapus anggota (Admin only).
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const admin = await isAdmin();
    if (!admin) {
      return apiError(
        "AUTH_ERROR",
        "Akses ditolak. Hanya Admin yang dapat menghapus anggota.",
        { status: 403 }
      );
    }

    const anggota = await db.anggota.findUnique({ where: { id } });
    if (!anggota) {
      return apiError("NOT_FOUND", "Anggota tidak ditemukan.", {
        fields: { id: "Anggota tidak ada" },
      });
    }

    const nama = anggota.nama;
    await db.anggota.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        aksi: "DELETE_ANGGOTA",
        actorNama: "Bendahara",
        deskripsi: `Menghapus anggota: ${nama}.`,
        refType: "Anggota",
        refId: id,
      },
    });

    return apiSuccess({ deleted: true });
  } catch (err) {
    return apiUnexpected(err);
  }
}

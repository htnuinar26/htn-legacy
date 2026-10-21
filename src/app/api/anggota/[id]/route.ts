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
import { deleteFile } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

// GET /api/anggota/[id] - detail anggota.
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

// PATCH /api/anggota/[id] - update anggota.
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

    // Cek duplikat nama dan NIM/email. Tanpa cek ini, anggota bisa mengubah
    // namanya menjadi nama anggota lain, dan login berbasis nama jadi ambigu.
    if (nama !== undefined || nim !== undefined || email !== undefined) {
      const dup = await db.anggota.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(nama !== undefined
              ? [{ nama: { equals: nama, mode: "insensitive" as const } }]
              : []),
            ...(nim !== undefined && nim ? [{ nim: { equals: nim } }] : []),
            ...(email !== undefined && email ? [{ email: { equals: email } }] : []),
          ],
        },
        select: { nama: true, nim: true, email: true },
      });
      if (dup) {
        const field =
          nama !== undefined && dup.nama.toLowerCase() === nama.toLowerCase()
            ? "nama"
            : nim !== undefined && dup.nim === nim
              ? "nim"
              : "email";
        return apiError(
          "CONFLICT",
          `${field} sudah dipakai anggota lain. Gunakan nilai lain.`,
          { fields: { [field]: `${field} sudah dipakai anggota lain` } }
        );
      }
    }

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
          // `createdAt` wajib ikut dikembalikan. Client memakai
          // `setProfil(json.data)` setelah simpan, jadi bila field ini tidak
          // dikirim, tanggal bergabung anggota berubah jadi kosong.
          createdAt: true,
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

// DELETE /api/anggota/[id] - hapus anggota (Admin only).
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

    // Ambil path file receipt milik anggota ini sebelum dihapus. Record
    // `Struk` terhapus otomatis karena relasi memakai onDelete Cascade,
    // jadi file di storage harus ikut dibersihkan agar tidak menyisakan
    // file yatim yang tidak pernah dibersihkan.
    const strukList = await db.struk.findMany({
      where: { anggotaId: id },
      select: { filePath: true },
    });

    await db.anggota.delete({ where: { id } });

    // Hapus file receipt di luar transaksi database (node M1 pada
    // ARCHITECTURE.md). Kegagalan hapus file tidak boleh memblokir
    // penghapusan anggota, tapi harus dicatat untuk pembersihan manual.
    const storageErrors: string[] = [];
    for (const s of strukList) {
      try {
        await deleteFile(s.filePath);
      } catch (storageErr) {
        storageErrors.push(s.filePath);
        console.error(
          "[STORAGE_ERROR] Gagal menghapus file receipt saat hapus anggota",
          JSON.stringify({
            requestId: `cleanup-anggota-${Date.now()}`,
            category: "STORAGE_ERROR",
            filePath: s.filePath,
            anggotaId: id,
            message: "File yatim perlu dibersihkan manual.",
            cause:
              storageErr instanceof Error ? storageErr.message : String(storageErr),
            timestamp: new Date().toISOString(),
          })
        );
      }
    }

    await db.auditLog.create({
      data: {
        aksi: "DELETE_ANGGOTA",
        actorNama: "Bendahara",
        deskripsi: `Menghapus anggota: ${nama}.${storageErrors.length > 0 ? ` Catatan: ${storageErrors.length} file receipt gagal dihapus dan perlu pembersihan manual.` : ""}`,
        refType: "Anggota",
        refId: id,
        detail: storageErrors.length > 0 ? `storageErrors=${JSON.stringify(storageErrors)}` : null,
      },
    });

    return apiSuccess({ deleted: true, storageCleanupErrors: storageErrors });
  } catch (err) {
    return apiUnexpected(err);
  }
}

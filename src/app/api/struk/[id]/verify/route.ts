import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  apiSuccess,
  apiError,
  apiUnexpected,
  classifyPrismaError,
} from "@/lib/api-response";
import { isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

const VerifySchema = z.object({
  action: z.enum(["approve", "reject"]),
  alasan: z.string().optional(),
  // `null` diperbolehkan karena client mengirim `nominal: null` ketika Admin
  // tidak mengisi nominal secara manual. Null diperlakukan sama seperti
  // tidak dikirim, sehingga fallback ke nominal receipt atau nominal iuran
  // tetap terpakai.
  nominal: z.number().int().positive().nullable().optional(),
});

// POST /api/struk/[id]/verify
// Approval: transaksi DB atomik - Struk APPROVED, simpan nominal,
//   buat Transaksi MASUK, Anggota periode berjalan jadi LUNAS.
// Rejection: simpan alasan, buka kembali akses kirim ulang.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Autentikasi Admin.
    const admin = await isAdmin();
    if (!admin) {
      return apiError(
        "AUTH_ERROR",
        "Akses ditolak. Hanya Admin/Bendahara yang dapat memverifikasi struk.",
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = VerifySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Input verifikasi tidak valid.",
        {
          fields: Object.fromEntries(
            parsed.error.issues.map((i) => [String(i.path[0] ?? "_"), i.message])
          ),
        }
      );
    }

    const { action, alasan, nominal } = parsed.data;

    // Reject wajib alasan.
    if (action === "reject" && (!alasan || alasan.trim().length === 0)) {
      return apiError(
        "VALIDATION_ERROR",
        "Alasan penolakan wajib diisi saat menolak struk.",
        { fields: { alasan: "Alasan reject wajib diisi" } }
      );
    }

    const struk = await db.struk.findUnique({
      where: { id },
      include: { anggota: true },
    });
    if (!struk) {
      return apiError(
        "NOT_FOUND",
        "Struk tidak ditemukan. Mungkin sudah dihapus oleh aksi lain.",
        { fields: { id: "Struk tidak ada" } }
      );
    }

    if (struk.status !== "PENDING") {
      return apiError(
        "CONFLICT",
        `Struk ini sudah berstatus ${struk.status} dan tidak dapat diverifikasi ulang.`,
        { fields: { status: `Struk sudah ${struk.status}` } }
      );
    }

    const settings = await getSettings();

    if (action === "reject") {
      // Rejection: simpan alasan, buka kembali akses kirim ulang.
      // Catatan: anggota boleh mengirim ulang pada periode yang sama setelah
      // ditolak. Karena `Struk` punya unique constraint
      // [anggotaId, periodeBulan, status], setting status menjadi REJECTED
      // kedua kali pada periode yang sama akan menabrak P2002. Error itu
      // harus diklasifikasi sebagai CONFLICT, bukan jatuh ke generic 500.
      try {
        const updated = await db.struk.update({
          where: { id },
          data: {
            status: "REJECTED",
            alasanReject: alasan?.trim(),
            reviewedAt: new Date(),
            reviewedBy: "admin",
          },
        });

        await db.auditLog.create({
          data: {
            aksi: "REJECT_STRUK",
            actorNama: "Bendahara",
            deskripsi: `Menolak struk ${struk.periodeBulan} milik ${struk.anggota.nama}. Alasan: ${alasan?.trim()}`,
            refType: "Struk",
            refId: struk.id,
            detail: alasan?.trim(),
          },
        });

        return apiSuccess({
          strukId: updated.id,
          status: updated.status,
        });
      } catch (rejectErr) {
        const classified = classifyPrismaError(rejectErr);
        if (classified.category === "CONFLICT") {
          return apiError(
            "CONFLICT",
            `Struk ${struk.periodeBulan} milik ${struk.anggota.nama} sudah pernah ditolak pada periode ini. Gunakan periode lain atau hapus receipt lama dari daftar review.`,
            { cause: rejectErr }
          );
        }
        return apiError(
          "DATABASE_ERROR",
          "Gagal menyimpan penolakan struk: transaksi database gagal di tengah jalan, semua perubahan telah dibatalkan (rollback). Detail dicatat di server log. Silakan coba lagi.",
          { cause: rejectErr }
        );
      }
    }

    // Approval: transaksi DB atomik (node W).
    // - Struk → APPROVED, simpan nominal
    // - Buat Transaksi MASUK terhubung ke Struk
    // - Anggota periode berjalan jadi LUNAS (hanya jika periode receipt == periode berjalan)
    const nominalFinal = nominal ?? struk.nominal ?? settings.nominalIuran;

    try {
      const result = await db.$transaction(async (tx) => {
        const updatedStruk = await tx.struk.update({
          where: { id },
          data: {
            status: "APPROVED",
            nominal: nominalFinal,
            reviewedAt: new Date(),
            reviewedBy: "admin",
          },
        });

        await tx.transaksi.create({
          data: {
            tipe: "MASUK",
            nominal: nominalFinal,
            keterangan: `Iuran ${struk.periodeBulan} - ${struk.anggota.nama}`,
            periodeBulan: struk.periodeBulan,
            anggotaId: struk.anggotaId,
            strukId: struk.id,
          },
        });

        // Sinkronisasi status anggota hanya untuk periode berjalan.
        if (struk.periodeBulan === settings.periodeBerjalan) {
          await tx.anggota.update({
            where: { id: struk.anggotaId },
            data: { statusBayar: "LUNAS" },
          });
        }

        return updatedStruk;
      });

      await db.auditLog.create({
        data: {
          aksi: "APPROVE_STRUK",
          actorNama: "Bendahara",
          deskripsi: `Menyetujui struk ${struk.periodeBulan} milik ${struk.anggota.nama}. Nominal: Rp ${nominalFinal.toLocaleString("id-ID")}.`,
          refType: "Struk",
          refId: struk.id,
          detail: `nominal=${nominalFinal}`,
        },
      });

      return apiSuccess({
        strukId: result.id,
        status: result.status,
        nominal: nominalFinal,
      });
    } catch (txErr) {
      const classified = classifyPrismaError(txErr);
      return apiError(
        classified.category === "CONFLICT" ? "CONFLICT" : "DATABASE_ERROR",
        classified.category === "DATABASE_ERROR"
          ? "Gagal menyetujui struk: transaksi database gagal di tengah jalan, semua perubahan telah dibatalkan (rollback). Detail dicatat di server log. Silakan coba lagi."
          : classified.message,
        { cause: txErr }
      );
    }
  } catch (err) {
    return apiUnexpected(err);
  }
}

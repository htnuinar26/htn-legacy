import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  apiSuccess,
  apiError,
  apiUnexpected,
} from "@/lib/api-response";
import { isAdmin } from "@/lib/auth";
import { deleteFile } from "@/lib/storage";
import { getSettings } from "@/lib/settings";

// DELETE /api/transaksi/[id]
// Sesuai ARCHITECTURE.md "Alur Kas dan Penghapusan":
// - Jika transaksi punya strukId: transaksi DB → tandai Struk REJECTED,
//   hapus object storage, sinkronkan status Anggota periode berjalan.
// - Jika storage gagal dihapus: LANJUTKAN hapus record DB, catat STORAGE_ERROR
//   untuk file yatim, JANGAN blokir penghapusan transaksi.
// - AuditLog DELETE_TRANSAKSI tetap dibuat dalam kedua skenario.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const admin = await isAdmin();
    if (!admin) {
      return apiError(
        "AUTH_ERROR",
        "Akses ditolak. Hanya Admin yang dapat menghapus transaksi.",
        { status: 403 }
      );
    }

    const transaksi = await db.transaksi.findUnique({
      where: { id },
      include: { struk: { include: { anggota: true } } },
    });
    if (!transaksi) {
      return apiError(
        "NOT_FOUND",
        "Transaksi tidak ditemukan. Mungkin sudah dihapus sebelumnya.",
        { fields: { id: "Transaksi tidak ada" } }
      );
    }

    const settings = await getSettings();
    const storageErrors: string[] = [];

    if (transaksi.strukId && transaksi.struk) {
      const struk = transaksi.struk;
      // Transaksi DB: tandai Struk REJECTED, sinkronkan Anggota, hapus record.
      await db.$transaction(async (tx) => {
        // Tandai struk REJECTED.
        await tx.struk.update({
          where: { id: struk.id },
          data: {
            status: "REJECTED",
            alasanReject: "Transaksi terkait dihapus oleh Admin.",
          },
        });
        // Sinkronkan status anggota periode berjalan.
        if (struk.periodeBulan === settings.periodeBerjalan) {
          await tx.anggota.update({
            where: { id: struk.anggotaId },
            data: { statusBayar: "BELUM_LUNAS" },
          });
        }
        // Hapus record transaksi.
        await tx.transaksi.delete({ where: { id } });
      });

      // Hapus object storage di luar transaksi DB (node M/M1).
      // Jika gagal, LANJUTKAN — jangan blokir integritas data.
      try {
        await deleteFile(struk.filePath);
      } catch (storageErr) {
        storageErrors.push(struk.filePath);
        // Catat sebagai STORAGE_ERROR untuk pembersihan manual kemudian.
        console.error(
          "[STORAGE_ERROR] Gagal menghapus file storage saat hapus transaksi",
          JSON.stringify({
            requestId: `cleanup-${Date.now()}`,
            category: "STORAGE_ERROR",
            filePath: struk.filePath,
            transaksiId: id,
            strukId: struk.id,
            message: "File yatim perlu dibersihkan manual.",
            cause: storageErr instanceof Error ? storageErr.message : String(storageErr),
            timestamp: new Date().toISOString(),
          })
        );
      }
    } else {
      // Transaksi manual tanpa struk: hapus langsung.
      await db.transaksi.delete({ where: { id } });
    }

    // Audit log tetap dibuat dalam kedua skenario.
    await db.auditLog.create({
      data: {
        aksi: "DELETE_TRANSAKSI",
        actorNama: "Bendahara",
        deskripsi: `Menghapus transaksi ${transaksi.tipe} Rp ${transaksi.nominal.toLocaleString("id-ID")}${transaksi.strukId ? " (terkait struk)" : ""} periode ${transaksi.periodeBulan}.${storageErrors.length > 0 ? ` Catatan: ${storageErrors.length} file storage gagal dihapus dan perlu pembersihan manual.` : ""}`,
        refType: "Transaksi",
        refId: id,
        detail: storageErrors.length > 0 ? `storageErrors=${JSON.stringify(storageErrors)}` : null,
      },
    });

    return apiSuccess({
      deleted: true,
      storageCleanupErrors: storageErrors,
    });
  } catch (err) {
    return apiUnexpected(err);
  }
}

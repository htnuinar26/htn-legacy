import { NextRequest } from "next/server";
import { apiSuccess, apiError, apiUnexpected } from "@/lib/api-response";
import { isAdmin } from "@/lib/auth";
import { uploadFile, generateBarcodePath } from "@/lib/storage";
import { updateSettings, getSettings } from "@/lib/settings";
import { db } from "@/lib/db";

// POST /api/settings/barcode — upload barcode pembayaran (Admin only).
export async function POST(req: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return apiError(
        "AUTH_ERROR",
        "Akses ditolak. Hanya Admin yang dapat mengunggah barcode.",
        { status: 403 }
      );
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return apiError("VALIDATION_ERROR", "Request harus berupa multipart form-data.", {
        fields: { _: "Format request tidak valid" },
      });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return apiError("VALIDATION_ERROR", "File barcode wajib diunggah.", {
        fields: { file: "File tidak ditemukan" },
      });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      return apiError(
        "VALIDATION_ERROR",
        `Tipe file tidak didukung (${file.type}). Gunakan JPG, PNG, WebP, atau SVG.`,
        { fields: { file: "Tipe tidak didukung" } }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split("/")[1] ?? "png";
    const objectPath = generateBarcodePath(ext);

    let uploaded;
    try {
      uploaded = await uploadFile(buffer, objectPath, file.type);
    } catch (storageErr) {
      return apiError(
        "STORAGE_ERROR",
        "Gagal mengunggah barcode ke storage. Detail dicatat di server log.",
        { cause: storageErr }
      );
    }

    // Hapus barcode lama jika ada.
    const oldSettings = await getSettings();
    if (oldSettings.barcodePath) {
      try {
        const { deleteFile } = await import("@/lib/storage");
        await deleteFile(oldSettings.barcodePath);
      } catch {
        // ignore cleanup error
      }
    }

    const updated = await updateSettings({ barcodePath: uploaded.path });

    await db.auditLog.create({
      data: {
        aksi: "UPDATE_SETTINGS",
        actorNama: "Bendahara",
        deskripsi: `Mengunggah barcode pembayaran baru.`,
        refType: "Settings",
        refId: updated.id,
        detail: `path=${uploaded.path}`,
      },
    });

    return apiSuccess({ barcodePath: uploaded.path });
  } catch (err) {
    return apiUnexpected(err);
  }
}

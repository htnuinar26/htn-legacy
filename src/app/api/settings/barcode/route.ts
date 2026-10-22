import { NextRequest } from "next/server";
import { apiSuccess, apiError, apiUnexpected } from "@/lib/api-response";
import { isAdmin } from "@/lib/auth";
import { uploadFile, generateBarcodePath, deleteFile, getSignedUrl } from "@/lib/storage";
import { updateSettings, getSettings } from "@/lib/settings";
import { db } from "@/lib/db";

// Batas ukuran barcode. 2 MB cukup untuk gambar barcode resolusi tinggi
// dan mencegah unggahan file yang tidak masuk akal.
const MAX_BARCODE_SIZE = 2 * 1024 * 1024;

// Tipe file barcode yang diizinkan.
// SVG TIDAK diizinkan: SVG bisa berisi skrip dan disajikan dari origin yang
// sama, sehingga menjadi stored XSS. Barcode cukup dengan PNG atau JPG.
const ALLOWED_BARCODE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// POST /api/settings/barcode - upload barcode pembayaran (Admin only).
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

    if (!ALLOWED_BARCODE_TYPES.includes(file.type)) {
      return apiError(
        "VALIDATION_ERROR",
        `Tipe file tidak didukung (${file.type}). Gunakan JPG, PNG, atau WebP.`,
        { fields: { file: "Tipe tidak didukung" } }
      );
    }

    if (file.size > MAX_BARCODE_SIZE) {
      return apiError(
        "VALIDATION_ERROR",
        `Ukuran file melebihi 2 MB (ukuran: ${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
        { fields: { file: "Ukuran file melebihi 2 MB" } }
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

    return apiSuccess({
      barcodePath: uploaded.path,
      // URL siap pakai untuk ditampilkan dan diunduh oleh UI.
      barcodeUrl: getSignedUrl(uploaded.path),
    });
  } catch (err) {
    return apiUnexpected(err);
  }
}

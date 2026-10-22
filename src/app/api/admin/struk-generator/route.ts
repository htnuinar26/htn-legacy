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
import {
  uploadFile,
  generateStrukPath,
  getSignedUrl,
} from "@/lib/storage";

const GeneratorSchema = z.object({
  anggotaId: z.string().min(1, "anggotaId wajib diisi"),
  nominal: z
    .number({ message: "Nominal wajib diisi" })
    .int("Nominal harus bilangan bulat positif")
    .positive("Nominal harus lebih dari 0")
    .max(2_000_000_000, "Nominal maksimal 2.000.000.000"),
  catatan: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

// POST /api/admin/struk-generator
// Alur sesuai ARCHITECTURE.md "Alur Receipt Generator Admin".
// Setiap titik kegagalan mengembalikan pesan SPESIFIK (bukan 500 polos):
//   - H/K: VALIDATION_ERROR nominal
//   - J1: AUTH_ERROR (bukan admin)
//   - L1: NOT_FOUND anggota
//   - M1: CONFLICT sudah punya receipt aktif
//   - R1/R2: DATABASE_ERROR konflik serialization / constraint
//
// Transaksi DB dengan isolation Serializable: buat Struk APPROVED +
// Transaksi MASUK + update Anggota LUNAS secara atomik.
export async function POST(req: NextRequest) {
  try {
    // --- J: Autentikasi isAdmin ---
    const admin = await isAdmin();
    if (!admin) {
      return apiError(
        "AUTH_ERROR",
        "Akses ditolak. Hanya Admin/Bendahara yang dapat membuat struk manual.",
        { status: 403 }
      );
    }

    // --- K: Validasi Zod body ---
    const body = await req.json().catch(() => null);
    const parsed = GeneratorSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Data struk generator tidak valid.",
        {
          fields: Object.fromEntries(
            parsed.error.issues.map((i) => [String(i.path[0] ?? "_"), i.message])
          ),
        }
      );
    }

    const { anggotaId, nominal, catatan } = parsed.data;
    const settings = await getSettings();
    const periode = settings.periodeBerjalan;
    const nominalFinal = Math.floor(nominal);

    // --- L: Anggota ditemukan? ---
    const anggota = await db.anggota.findUnique({ where: { id: anggotaId } });
    if (!anggota) {
      return apiError(
        "NOT_FOUND",
        `Anggota dengan ID "${anggotaId}" tidak ditemukan. Mungkin telah dihapus sebelum submit. Muat ulang daftar anggota dan coba lagi.`,
        { fields: { anggotaId: "Anggota tidak ditemukan" } }
      );
    }

    // --- M: Anggota sudah punya receipt aktif? ---
    const activeReceipt = await db.struk.findFirst({
      where: {
        anggotaId,
        periodeBulan: periode,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });
    if (activeReceipt) {
      return apiError(
        "CONFLICT",
        `Anggota "${anggota.nama}" sudah memiliki receipt ${activeReceipt.status === "PENDING" ? "PENDING" : "APPROVED"} pada periode ${periode}. Tidak dapat membuat receipt manual kedua untuk periode yang sama.`,
        { fields: { anggotaId: "Sudah punya receipt aktif periode ini" } }
      );
    }

    // --- N-S: Transaksi DB isolation Serializable ---
    // Buat receipt placeholder image sebagai "file" struk manual.
    // (Tidak ada upload gambar dari Admin; generator membuat record struk
    //  APPROVED langsung dengan file placeholder SVG yang merepresentasikan
    //  struk manual.)
    const svgContent = buildManualReceiptSvg(
      anggota.nama,
      periode,
      nominalFinal,
      catatan
    );
    const objectPath = generateStrukPath(periode, "image/svg+xml");
    let uploaded;
    try {
      uploaded = await uploadFile(
        Buffer.from(svgContent, "utf-8"),
        objectPath,
        "image/svg+xml"
      );
    } catch (storageErr) {
      return apiError(
        "STORAGE_ERROR",
        "Gagal menyimpan file struk manual ke storage. Detail dicatat di server log. Silakan coba lagi.",
        { cause: storageErr, endpoint: "/api/admin/struk-generator" }
      );
    }

    try {
      const result = await db.$transaction(
        async (tx) => {
          // O: Buat Struk APPROVED langsung, sumber ADMIN_MANUAL.
          const struk = await tx.struk.create({
            data: {
              anggotaId,
              periodeBulan: periode,
              filePath: uploaded.path,
              status: "APPROVED",
              nominal: nominalFinal,
              catatan: catatan ?? null,
              sumber: "ADMIN_MANUAL",
              reviewedBy: "admin",
              reviewedAt: new Date(),
            },
          });

          // P: Buat Transaksi MASUK terhubung ke Struk.
          await tx.transaksi.create({
            data: {
              tipe: "MASUK",
              nominal: nominalFinal,
              keterangan: `Struk manual ${periode} - ${anggota.nama}${catatan ? ` (${catatan})` : ""}`,
              periodeBulan: periode,
              anggotaId,
              strukId: struk.id,
            },
          });

          // Q: Update status Anggota periode berjalan jadi LUNAS.
          await tx.anggota.update({
            where: { id: anggotaId },
            data: { statusBayar: "LUNAS" },
          });

          await tx.auditLog.create({
            data: {
              aksi: "CREATE_STRUK_MANUAL",
              actorNama: "Bendahara",
              deskripsi: `Membuat struk manual APPROVED untuk ${anggota.nama} periode ${periode}. Nominal: Rp ${nominalFinal.toLocaleString("id-ID")}.`,
              refType: "Struk",
              refId: struk.id,
              detail: `nominal=${nominalFinal}, catatan=${catatan ?? ""}`,
            },
          });

          return struk;
        },
        {
          isolationLevel: "Serializable",
        }
      );

      return apiSuccess({
        strukId: result.id,
        status: result.status,
        nominal: nominalFinal,
        periodeBulan: periode,
        anggotaNama: anggota.nama,
        // URL file struk manual siap pakai. Client tidak boleh menebak
        // path object dari strukId, karena nama file di storage adalah
        // UUID, bukan id database.
        fileUrl: await getSignedUrl(uploaded.path),
        filePath: uploaded.path,
      });
    } catch (txErr) {
      const classified = classifyPrismaError(txErr);
      // R1: serialization conflict → CONFLICT dengan pesan "konflik data, silakan coba lagi"
      // R2: constraint lain → DATABASE_ERROR spesifik
      if (classified.category === "CONFLICT") {
        return apiError(
          "CONFLICT",
          "Konflik data, silakan coba lagi. Anggota ini kemungkinan baru saja menerima receipt aktif dari jalur lain tepat sebelum submit.",
          { cause: txErr, endpoint: "/api/admin/struk-generator" }
        );
      }
      return apiError(
        "DATABASE_ERROR",
        "Gagal membuat struk manual: transaksi database gagal (kemungkinan konflik serialization atau constraint). Semua perubahan telah dibatalkan (rollback). Detail lengkap telah dicatat di server log dengan requestId. Silakan coba lagi.",
        { cause: txErr, endpoint: "/api/admin/struk-generator" }
      );
    }
  } catch (err) {
    return apiUnexpected(err, "/api/admin/struk-generator");
  }
}

// Helper: bangun SVG sederhana sebagai placeholder file struk manual.
// Bukan OCR/AI - hanya dokumen statis yang merepresentasikan receipt manual.
function buildManualReceiptSvg(
  nama: string,
  periode: string,
  nominal: number,
  catatan?: string
): string {
  const nominalStr = `Rp ${nominal.toLocaleString("id-ID")}`;
  const now = new Date().toISOString();
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="280" viewBox="0 0 480 280">
  <rect width="480" height="280" fill="#faf9f6"/>
  <rect x="0" y="0" width="480" height="56" fill="#4a0e16"/>
  <text x="24" y="36" font-family="Plus Jakarta Sans, sans-serif" font-size="20" font-weight="800" fill="#ffffff">HTN Legacy - Struk Manual</text>
  <text x="24" y="96" font-family="Plus Jakarta Sans, sans-serif" font-size="14" fill="#787774">Anggota</text>
  <text x="24" y="118" font-family="Plus Jakarta Sans, sans-serif" font-size="18" font-weight="700" fill="#111111">${escape(nama)}</text>
  <text x="24" y="150" font-family="Plus Jakarta Sans, sans-serif" font-size="14" fill="#787774">Periode</text>
  <text x="24" y="172" font-family="Plus Jakarta Sans, sans-serif" font-size="16" font-weight="600" fill="#111111">${escape(periode)}</text>
  <line x1="24" y1="190" x2="456" y2="190" stroke="#eaeaea" stroke-width="1"/>
  <text x="24" y="218" font-family="Plus Jakarta Sans, sans-serif" font-size="14" fill="#787774">Nominal Iuran</text>
  <text x="24" y="246" font-family="Plus Jakarta Sans, sans-serif" font-size="24" font-weight="800" fill="#4a0e16">${escape(nominalStr)}</text>
  <text x="456" y="36" text-anchor="end" font-family="Plus Jakarta Sans, sans-serif" font-size="11" fill="#c9a24b">${escape(now.slice(0, 10))}</text>
  ${catatan ? `<text x="24" y="268" font-family="Plus Jakarta Sans, sans-serif" font-size="11" fill="#787774">Catatan: ${escape(catatan)}</text>` : ""}
</svg>`;
}

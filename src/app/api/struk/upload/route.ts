import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  apiSuccess,
  apiError,
  apiUnexpected,
  classifyPrismaError,
} from "@/lib/api-response";
import { verifyPassword } from "@/lib/crypto";
import {
  uploadFile,
  deleteFile,
  validateReceiptFile,
  generateStrukPath,
} from "@/lib/storage";
import { recentPeriods, MAX_RECEIPT_MONTHS } from "@/lib/format";

// Rate limit sederhana in-memory.
// Kunci memakai kombinasi IP dan anggotaId. Kalau kuncinya hanya anggotaId,
// siapa pun bisa memblokir upload anggota lain hanya dengan mengirim
// request atas nama anggota itu. Kombinasi ini mencegah lockout yang
// disengaja, sekaligus tetap membatasi percobaan dari satu sumber.
const uploadAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 menit

/** IP client dari header proxy, dipakai sebagai bagian kunci rate limit. */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Tambah dan periksa hitungan rate limit.
 * Mengembalikan sisa detik yang harus ditunggu bila batas terlampaui,
 * atau null bila request boleh diproses.
 */
function checkRateLimit(key: string): number | null {
  const now = Date.now();
  const rec = uploadAttempts.get(key);
  if (rec && now < rec.resetAt) {
    if (rec.count >= RATE_LIMIT_MAX) {
      return Math.ceil((rec.resetAt - now) / 1000);
    }
    rec.count += 1;
  } else {
    uploadAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  }
  return null;
}

// POST /api/struk/upload
// Alur lengkap sesuai ARCHITECTURE.md "Alur Receipt Anggota":
// 1. Validasi field dasar (Zod)
// 2. Validasi file
// 3. Rate limit + verifikasi password
// 4. Cek receipt aktif pada anggota & periode
// 5. Upload ke storage
// 6. Cek ulang receipt aktif (proteksi request paralel)
// 7. Buat Struk(PENDING); hapus file storage jika insert DB gagal.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return apiError(
        "VALIDATION_ERROR",
        "Request harus berupa multipart form-data.",
        { fields: { _: "Format request tidak valid" } }
      );
    }

    const anggotaId = String(formData.get("anggotaId") ?? "");
    const password = String(formData.get("password") ?? "");
    const periodeBulan = String(formData.get("periodeBulan") ?? "");
    const file = formData.get("file");

    // --- 1. Validasi field dasar ---
    const FieldSchema = z.object({
      anggotaId: z.string().min(1, "anggotaId wajib diisi"),
      password: z.string().min(1, "Password wajib diisi"),
      periodeBulan: z
        .string()
        .regex(/^\d{4}-\d{2}$/, "Periode harus format YYYY-MM"),
    });
    const fieldParsed = FieldSchema.safeParse({ anggotaId, password, periodeBulan });
    if (!fieldParsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Data upload struk tidak valid.",
        {
          fields: Object.fromEntries(
            fieldParsed.error.issues.map((i) => [String(i.path[0] ?? "_"), i.message])
          ),
        }
      );
    }

    // Validasi periode: harus salah satu dari 4 periode terbaru.
    const validPeriods = recentPeriods();
    if (!validPeriods.includes(periodeBulan)) {
      return apiError(
        "VALIDATION_ERROR",
        `Periode ${periodeBulan} tidak tersedia. Hanya ${MAX_RECEIPT_MONTHS} periode terbaru yang dapat dipilih.`,
        { fields: { periodeBulan: "Periode di luar jangkauan yang diizinkan" } }
      );
    }

    // --- 2. Validasi file ---
    if (!(file instanceof File)) {
      return apiError(
        "VALIDATION_ERROR",
        "File receipt wajib diunggah.",
        { fields: { file: "File tidak ditemukan pada request" } }
      );
    }
    const fileCheck = validateReceiptFile(file.type, file.size);
    if (!fileCheck.ok) {
      return apiError(
        "VALIDATION_ERROR",
        fileCheck.message ?? "File tidak valid.",
        { fields: { file: fileCheck.message ?? "File tidak valid" } }
      );
    }

    // --- 3. Rate limit check ---
    // Urutan mengikuti ARCHITECTURE.md "Alur Receipt Anggota": rate limit
    // dicek lebih dulu, lalu verifikasi password.
    const clientIp = getClientIp(req);
    const waitSec =
      checkRateLimit(`ip:${clientIp}`) ??
      checkRateLimit(`ip:${clientIp}:anggota:${anggotaId}`);
    if (waitSec !== null) {
      return apiError(
        "VALIDATION_ERROR",
        `Terlalu banyak percobaan upload dari sumber ini. Coba lagi dalam ${waitSec} detik.`,
        {
          status: 429,
          fields: { _: `Rate limit terlampaui, tunggu ${waitSec} detik` },
        }
      );
    }

    // --- 4. Verifikasi password anggota ---
    const anggota = await db.anggota.findUnique({ where: { id: anggotaId } });
    if (!anggota) {
      return apiError(
        "NOT_FOUND",
        "Anggota tidak ditemukan. Refresh halaman dan coba lagi.",
        { fields: { anggotaId: "Anggota tidak terdaftar" } }
      );
    }
    const pwdOk = verifyPassword(password, anggota.passwordEnc);
    if (!pwdOk) {
      return apiError(
        "AUTH_ERROR",
        "Password tidak sesuai. Masukkan password per aksi Anda.",
        { status: 401, fields: { password: "Password salah" } }
      );
    }

    // --- 5. Cek receipt aktif pada anggota & periode ---
    const activeReceipt = await db.struk.findFirst({
      where: {
        anggotaId,
        periodeBulan,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });
    if (activeReceipt) {
      return apiError(
        "CONFLICT",
        `Anda sudah memiliki receipt ${activeReceipt.status === "PENDING" ? "menunggu review" : "disetujui"} pada periode ${periodeBulan}. Pilih periode lain atau tunggu review selesai.`,
        { fields: { periodeBulan: "Periode ini sudah memiliki receipt aktif" } }
      );
    }

    // --- 6. Upload ke storage ---
    const buffer = Buffer.from(await file.arrayBuffer());
    const objectPath = generateStrukPath(periodeBulan, file.type);
    let uploaded;
    try {
      uploaded = await uploadFile(buffer, objectPath, file.type);
    } catch (storageErr) {
      return apiError(
        "STORAGE_ERROR",
        "Gagal mengunggah file receipt ke storage. Silakan coba lagi. Detail kegagalan telah dicatat di server log.",
        { cause: storageErr, endpoint: "/api/struk/upload" }
      );
    }

    // --- 7. Cek ulang receipt aktif (proteksi request paralel) ---
    const activeReceipt2 = await db.struk.findFirst({
      where: {
        anggotaId,
        periodeBulan,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });
    if (activeReceipt2) {
      // Kompensasi: hapus file yang baru diupload agar tidak ada file yatim.
      try {
        await deleteFile(uploaded.path);
      } catch {
        // gagal cleanup dicatat sebagai storage error tapi tetap return conflict
        console.error("[STORAGE_CLEANUP] gagal hapus file yatim", uploaded.path);
      }
      return apiError(
        "CONFLICT",
        `Receipt aktif untuk periode ${periodeBulan} baru saja dibuat oleh request lain. Pilih periode lain.`,
        { fields: { periodeBulan: "Receipt aktif dibuat oleh request paralel" } }
      );
    }

    // --- 8. Buat Struk(PENDING) ---
    try {
      const struk = await db.struk.create({
        data: {
          anggotaId,
          periodeBulan,
          filePath: uploaded.path,
          status: "PENDING",
          sumber: "ANGGOTA_UPLOAD",
        },
      });
      return apiSuccess({
        strukId: struk.id,
        status: struk.status,
        periodeBulan: struk.periodeBulan,
      });
    } catch (dbErr) {
      // Kompensasi: hapus file storage yang sudah diupload.
      try {
        await deleteFile(uploaded.path);
      } catch (cleanupErr) {
        console.error(
          "[STORAGE_CLEANUP] gagal hapus file setelah DB insert gagal",
          uploaded.path,
          cleanupErr
        );
      }
      const classified = classifyPrismaError(dbErr);
      return apiError(
        classified.category === "CONFLICT" ? "CONFLICT" : "DATABASE_ERROR",
        classified.message,
        { cause: dbErr, endpoint: "/api/struk/upload" }
      );
    }
  } catch (err) {
    return apiUnexpected(err, "/api/struk/upload");
  }
}

// HTN Legacy — Storage Adapter
// Sesuai ARCHITECTURE.md: Supabase Storage menyimpan gambar receipt dan barcode.
// Database hanya menyimpan path object. UI menerima signed URL.
//
// Adaptasi sandbox: tidak ada kredensial Supabase, jadi adapter ini menulis
// file ke direktori lokal `public/storage` dan menyajikan via path langsung.
// Kontrak interface (upload, hapus, getPublicUrl) tetap sama sehingga
// penggantian ke Supabase asli di production hanya mengganti implementasi.

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const STORAGE_DIR = path.join(process.cwd(), "public", "storage");
const PUBLIC_PREFIX = "/storage";

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export type UploadedFile = {
  path: string; // path object relatif: struk/2026-10/abc.jpg
  url: string; // URL yang bisa diakses UI
  size: number;
  contentType: string;
};

/**
 * Upload buffer file ke storage.
 * @param data buffer file
 * @param objectPath path relatif tanpa leading slash, mis. "struk/2026-10/receipt.jpg"
 * @param contentType mime type
 */
export async function uploadFile(
  data: Buffer,
  objectPath: string,
  contentType: string
): Promise<UploadedFile> {
  const cleanPath = objectPath.replace(/^\/+/, "");
  const fullPath = path.join(STORAGE_DIR, cleanPath);
  await ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, data);
  return {
    path: cleanPath,
    url: `${PUBLIC_PREFIX}/${cleanPath}`,
    size: data.length,
    contentType,
  };
}

/**
 * Hapus file dari storage. Mengembalikan true jika berhasil dihapus,
 * false jika file tidak ditemukan. Throw jika error lain.
 */
export async function deleteFile(objectPath: string): Promise<boolean> {
  const cleanPath = objectPath.replace(/^\/+/, "");
  const fullPath = path.join(STORAGE_DIR, cleanPath);
  try {
    await fs.unlink(fullPath);
    return true;
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") return false; // file tidak ada, anggap sukses
    throw err;
  }
}

/**
 * Menghasilkan URL akses untuk path object.
 * Di sandbox: path langsung. Di production: signed URL berlaku terbatas.
 */
export function getSignedUrl(objectPath: string): string {
  const cleanPath = objectPath.replace(/^\/+/, "");
  return `${PUBLIC_PREFIX}/${cleanPath}`;
}

/**
 * Validasi tipe file receipt yang diizinkan.
 */
export const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const MAX_RECEIPT_SIZE = 5 * 1024 * 1024; // 5 MB

export function validateReceiptFile(
  contentType: string,
  size: number
): { ok: boolean; message?: string } {
  if (!ALLOWED_RECEIPT_TYPES.includes(contentType)) {
    return {
      ok: false,
      message: `Tipe file tidak didukung (${contentType}). Hanya JPG, PNG, atau WebP yang diizinkan.`,
    };
  }
  if (size > MAX_RECEIPT_SIZE) {
    return {
      ok: false,
      message: `Ukuran file melebihi 5 MB (ukuran: ${(
        size /
        (1024 * 1024)
      ).toFixed(2)} MB).`,
    };
  }
  return { ok: true };
}

/**
 * Generate nama file unik untuk receipt.
 * Format: struk/{YYYY-MM}/{uuid}.{ext}
 */
export function generateStrukPath(
  periodeBulan: string,
  contentType: string
): string {
  const ext = contentType.split("/")[1] ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  return `struk/${periodeBulan}/${filename}`;
}

/**
 * Generate nama file unik untuk barcode.
 * Format: assets/barcode-{timestamp}.{ext}
 */
export function generateBarcodePath(ext: string): string {
  const ts = Date.now();
  return `assets/barcode-${ts}.${ext}`;
}

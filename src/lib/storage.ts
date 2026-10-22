// HTN Legacy - Supabase Storage adapter.
// Database hanya menyimpan object path; client menerima signed URL.

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const LOCAL_STORAGE_DIR = path.join(process.cwd(), "public", "storage");
const LOCAL_PUBLIC_PREFIX = "/storage";
const SIGNED_URL_SECONDS = 60 * 10;

function normalizeObjectPath(objectPath: string): string {
  const cleanPath = objectPath.replace(/^\/+/, "");
  const normalized = path.posix.normalize(cleanPath);
  if (!cleanPath || normalized !== cleanPath || normalized.startsWith("../")) {
    throw new Error("Path storage tidak valid.");
  }
  return normalized;
}

function getSupabaseConfig() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!baseUrl || !serviceKey || !bucket) return null;
  return { baseUrl, serviceKey, bucket };
}

function requireProductionStorage() {
  if (process.env.NODE_ENV === "production" && !getSupabaseConfig()) {
    throw new Error(
      "Konfigurasi Supabase Storage wajib tersedia di production: SUPABASE_URL, SUPABASE_SECRET_KEY, dan SUPABASE_STORAGE_BUCKET."
    );
  }
}

async function localEnsureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function supabaseRequest(
  input: string,
  init: RequestInit,
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>
) {
  const response = await fetch(input, {
    ...init,
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Supabase Storage ${response.status}: ${detail || response.statusText}`
    );
  }
  return response;
}

export type UploadedFile = {
  path: string;
  url: string;
  size: number;
  contentType: string;
};

export async function uploadFile(
  data: Buffer,
  objectPath: string,
  contentType: string
): Promise<UploadedFile> {
  const cleanPath = normalizeObjectPath(objectPath);
  const config = getSupabaseConfig();
  requireProductionStorage();

  if (config) {
    const encodedPath = cleanPath.split("/").map(encodeURIComponent).join("/");
    await supabaseRequest(
      `${config.baseUrl}/storage/v1/object/${encodeURIComponent(config.bucket)}/${encodedPath}`,
      {
        method: "POST",
        headers: { "Content-Type": contentType, "x-upsert": "false" },
        body: new Blob([new Uint8Array(data)]),
      },
      config
    );
    return {
      path: cleanPath,
      url: await getSignedUrl(cleanPath),
      size: data.length,
      contentType,
    };
  }

  const fullPath = path.join(LOCAL_STORAGE_DIR, cleanPath);
  await localEnsureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, data);
  return {
    path: cleanPath,
    url: `${LOCAL_PUBLIC_PREFIX}/${cleanPath}`,
    size: data.length,
    contentType,
  };
}

export async function deleteFile(objectPath: string): Promise<boolean> {
  const cleanPath = normalizeObjectPath(objectPath);
  const config = getSupabaseConfig();
  requireProductionStorage();

  if (config) {
    const response = await supabaseRequest(
      `${config.baseUrl}/storage/v1/object/remove/${encodeURIComponent(config.bucket)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [cleanPath] }),
      },
      config
    );
    const removed = (await response.json().catch(() => [])) as unknown;
    return Array.isArray(removed) ? removed.length > 0 : true;
  }

  const fullPath = path.join(LOCAL_STORAGE_DIR, cleanPath);
  try {
    await fs.unlink(fullPath);
    return true;
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ENOENT") return false;
    throw err;
  }
}

export async function getSignedUrl(objectPath: string): Promise<string> {
  const cleanPath = normalizeObjectPath(objectPath);
  const config = getSupabaseConfig();
  requireProductionStorage();
  if (!config) return `${LOCAL_PUBLIC_PREFIX}/${cleanPath}`;

  const encodedPath = cleanPath.split("/").map(encodeURIComponent).join("/");
  const response = await supabaseRequest(
    `${config.baseUrl}/storage/v1/object/sign/${encodeURIComponent(config.bucket)}/${encodedPath}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: SIGNED_URL_SECONDS }),
    },
    config
  );
  const payload = (await response.json()) as { signedURL?: string };
  if (!payload.signedURL) {
    throw new Error("Supabase Storage tidak mengembalikan signed URL.");
  }
  return payload.signedURL.startsWith("http")
    ? payload.signedURL
    : `${config.baseUrl}/storage/v1${payload.signedURL}`;
}

export const ALLOWED_RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export function validateReceiptFile(contentType: string, size: number) {
  if (!ALLOWED_RECEIPT_TYPES.includes(contentType)) {
    return {
      ok: false,
      message: `Tipe file tidak didukung (${contentType}). Hanya JPG, PNG, atau WebP yang diizinkan.`,
    };
  }
  if (size > MAX_RECEIPT_SIZE) {
    return {
      ok: false,
      message: `Ukuran file melebihi 5 MB (ukuran: ${(size / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }
  return { ok: true };
}

export function generateStrukPath(periodeBulan: string, contentType: string): string {
  const ext = MIME_EXTENSIONS[contentType] ?? contentType.split("/")[1] ?? "jpg";
  const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "bin";
  return `struk/${periodeBulan}/${randomUUID()}.${safeExt}`;
}

export function generateBarcodePath(ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "bin";
  return `assets/barcode-${Date.now()}.${safeExt}`;
}

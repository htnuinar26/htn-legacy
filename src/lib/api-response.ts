// HTN Legacy — API Response Helper
// Kontrak error handling terklasifikasi sesuai ARCHITECTURE.md
// bagian "Standar Error Handling API (Wajib)".
//
// Setiap Route Handler di src/app/api/** WAJIB memakai helper ini.
// Dilarang membuat bentuk response error sendiri.

export type ApiErrorCategory =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "STORAGE_ERROR"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

const STATUS_BY_CATEGORY: Record<ApiErrorCategory, number> = {
  VALIDATION_ERROR: 400,
  AUTH_ERROR: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  STORAGE_ERROR: 502,
  DATABASE_ERROR: 500,
  INTERNAL_ERROR: 500,
};

// Kategori yang WAJIB dicatat di server log (dengan requestId).
const LOGGED_CATEGORIES: ApiErrorCategory[] = [
  "STORAGE_ERROR",
  "DATABASE_ERROR",
  "INTERNAL_ERROR",
];

export type ApiSuccess<T> = { success: true; data: T };

export type ApiErrorResponse = {
  success: false;
  error: {
    category: ApiErrorCategory;
    message: string;
    fields?: Record<string, string>;
    requestId: string;
  };
};

/**
 * Menghasilkan response sukses dengan bentuk konsisten:
 * { success: true, data: T }
 */
export function apiSuccess<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ success: true, data } satisfies ApiSuccess<T>, {
    status: 200,
    ...init,
  });
}

/**
 * Menghasilkan response error terklasifikasi.
 * - Menetapkan status HTTP default per kategori (bisa di-override).
 * - Menghasilkan requestId unik untuk korelasi client ↔ server log.
 * - Mencatat log server untuk STORAGE_ERROR, DATABASE_ERROR, INTERNAL_ERROR.
 *
 * Pesan ke client HARUS spesifik dan dalam Bahasa Indonesia.
 */
export function apiError(
  category: ApiErrorCategory,
  message: string,
  options?: { fields?: Record<string, string>; status?: number; cause?: unknown }
): Response {
  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const status = options?.status ?? STATUS_BY_CATEGORY[category];

  // Logging wajib untuk kategori yang mengindikasikan kegagalan infrastruktur.
  if (LOGGED_CATEGORIES.includes(category)) {
    const logLine = {
      requestId,
      category,
      message,
      timestamp: new Date().toISOString(),
      cause:
        options?.cause instanceof Error
          ? {
              name: options.cause.name,
              message: options.cause.message,
              stack: options.cause.stack,
            }
          : options?.cause ?? undefined,
    };
    // console.error agar muncul di Vercel Function Logs / dev.log.
    console.error("[API_ERROR]", JSON.stringify(logLine));
  }

  const body: ApiErrorResponse = {
    success: false,
    error: {
      category,
      message,
      ...(options?.fields ? { fields: options.fields } : {}),
      requestId,
    },
  };

  return Response.json(body, { status });
}

/**
 * Mengubah ZodError menjadi fields map untuk VALIDATION_ERROR.
 */
export function zodFields(
  issues: Array<{ path: PropertyKey[]; message: string }>
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.length > 0 ? String(issue.path.join(".")) : "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/**
 * Handler generik untuk error tak terduga di dalam try/catch Route Handler.
 * Mencegah error jatuh ke generic Next.js 500 tanpa detail.
 */
export function apiUnexpected(error: unknown): Response {
  return apiError(
    "INTERNAL_ERROR",
    "Terjadi kesalahan tak terduga di server. Silakan coba beberapa saat lagi. " +
      "Jika masalah berlanjut, hubungi pengurus dan sebutkan ID permintaan.",
    { cause: error }
  );
}

/**
 * Mengevaluasi Prisma error dan mengembalikan kategori yang sesuai.
 * Membantu menangkap race condition (P2002 unique constraint) sebagai
 * CONFLICT, bukan DATABASE_ERROR generik.
 */
export function classifyPrismaError(
  error: unknown
): { category: ApiErrorCategory; message: string } {
  const err = error as { code?: string; message?: string };
  if (err?.code === "P2002") {
    return {
      category: "CONFLICT",
      message:
        "Konflik data: entri dengan data yang sama sudah ada (kemungkinan request paralel). Silakan coba lagi.",
    };
  }
  if (err?.code === "P2034") {
    return {
      category: "DATABASE_ERROR",
      message:
        "Konflik transaksi database (serialization), silakan coba lagi beberapa saat.",
    };
  }
  return {
    category: "DATABASE_ERROR",
    message:
      "Gagal menyimpan data ke database. Detail telah dicatat di server log; silakan coba lagi atau hubungi pengurus.",
  };
}

// HTN Legacy - Session & Auth helpers
// JWT httpOnly cookie untuk sesi anggota dan Admin.
// Sesuai ARCHITECTURE.md: JWT httpOnly cookie, password anggota AES-256-GCM.

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-response";

const JWT_SECRET = process.env.JWT_SECRET;
const encoder = new TextEncoder();

function getJwtKey() {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error(
      "JWT_SECRET wajib dikonfigurasi dan memiliki panjang minimal 32 karakter."
    );
  }
  return encoder.encode(JWT_SECRET);
}

const SESSION_COOKIE = "htn-session";
const ADMIN_COOKIE = "htn-admin";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

export type SessionPayload = {
  anggotaId: string;
  nama: string;
  role: "anggota";
};

export type AdminPayload = {
  role: "admin";
  nama: string;
};

async function signToken(
  payload: SessionPayload | AdminPayload
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getJwtKey());
}

async function verifyToken<T = unknown>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtKey());
    return payload as unknown as T;
  } catch {
    return null;
  }
}

/** Membuat sesi anggota dan menyimpan di httpOnly cookie. */
export async function createMemberSession(payload: SessionPayload): Promise<void> {
  const token = await signToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** Membuat sesi Admin dan menyimpan di httpOnly cookie. */
export async function createAdminSession(payload: AdminPayload): Promise<void> {
  const token = await signToken(payload);
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** Mengambil sesi anggota aktif (atau null). */
export async function getMemberSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifyToken<SessionPayload>(token);
}

/** Mengambil sesi Admin aktif (atau null). */
export async function getAdminSession(): Promise<AdminPayload | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return await verifyToken<AdminPayload>(token);
}

/** Menghancurkan sesi anggota. */
export async function destroyMemberSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Menghancurkan sesi Admin. */
export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

/** Verifikasi password Admin bersama. */
export function verifyAdminPassword(password: string): boolean {
  const adminPwd = process.env.ADMIN_PASSWORD;
  if (!adminPwd) return false;
  return password === adminPwd;
}

/**
 * Mengecek apakah request saat ini berasal dari Admin.
 * Dipakai di Route Handler untuk proteksi endpoint admin.
 */
export async function isAdmin(): Promise<boolean> {
  const admin = await getAdminSession();
  return admin?.role === "admin";
}

/**
 * Mengecek apakah request saat ini berasal dari anggota atau admin.
 * Mengembalikan sesi anggota jika ada.
 */
export async function getMemberOrAdmin(): Promise<{
  member: SessionPayload | null;
  isAdmin: boolean;
}> {
  const [member, admin] = await Promise.all([getMemberSession(), getAdminSession()]);
  return { member, isAdmin: admin?.role === "admin" };
}

/**
 * Helper untuk mengambil entitas Anggota dari sesi aktif.
 */
export async function getCurrentAnggota() {
  const session = await getMemberSession();
  if (!session) return null;
  return db.anggota.findUnique({ where: { id: session.anggotaId } });
}

export type MemberOrAdminSession = {
  member: SessionPayload | null;
  isAdmin: boolean;
};

/**
 * Guard untuk Route Handler yang boleh diakses anggota maupun Admin.
 * Mengembalikan session bila request sah, atau Response error AUTH_ERROR
 * yang langsung boleh dikembalikan oleh pemanggil.
 *
 * Aturan otorisasi Admin dan anggota tetap terpisah: pemanggil wajib
 * mengecek `isAdmin()` sendiri untuk data yang hanya boleh dilihat Admin.
 */
export async function requireMemberOrAdmin(): Promise<
  { ok: true } & MemberOrAdminSession | { ok: false; response: Response }
> {
  const { member, isAdmin } = await getMemberOrAdmin();
  if (!member && !isAdmin) {
    return {
      ok: false,
      response: apiError(
        "AUTH_ERROR",
        "Sesi tidak ditemukan atau sudah berakhir. Silakan login kembali.",
        { status: 401 }
      ),
    };
  }
  return { ok: true, member, isAdmin };
}

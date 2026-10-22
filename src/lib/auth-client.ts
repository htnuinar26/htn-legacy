"use client";

// HTN Legacy - Client-side auth helpers
// Versi client yang memanggil endpoint /api/auth/session.
// (lib/auth.ts memakai next/headers → server-only.)

export type ClientSession = {
  member: { anggotaId: string; nama: string } | null;
  isAdmin: boolean;
};

let cachedSession: ClientSession | null = null;

/** Ambil sesi saat ini dari API. Hasil di-cache per mount session. */
export async function getMemberSession(): Promise<ClientSession["member"]> {
  const s = await fetchSession();
  return s.member;
}

export async function getAdminSession(): Promise<boolean> {
  const s = await fetchSession();
  return s.isAdmin;
}

export async function fetchSession(force = false): Promise<ClientSession> {
  if (cachedSession && !force) return cachedSession;
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) {
      cachedSession = { member: null, isAdmin: false };
      return cachedSession;
    }
    const json = await res.json();
    cachedSession = {
      member: json.data?.member ?? null,
      isAdmin: json.data?.isAdmin ?? false,
    };
    return cachedSession;
  } catch {
    cachedSession = { member: null, isAdmin: false };
    return cachedSession;
  }
}

export function clearSessionCache(): void {
  cachedSession = null;
}

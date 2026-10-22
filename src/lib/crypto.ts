// HTN Legacy - Crypto helpers
// Enkripsi password anggota dengan AES-256-GCM sesuai ARCHITECTURE.md.
// Kunci dari ENCRYPTION_KEY (64 hex chars = 32 bytes).

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY_HEX = process.env.ENCRYPTION_KEY;
if (!KEY_HEX || KEY_HEX.length !== 64) {
  // Jangan throw saat build/edge; validasi saat dipakai.
  console.warn(
    "[crypto] ENCRYPTION_KEY tidak valid atau belum diset (harus 64 hex chars)."
  );
}

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY!;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY tidak dikonfigurasi dengan benar.");
  }
  return Buffer.from(hex, "hex");
}

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

/**
 * Enkripsi plaintext password anggota.
 * Output format: base64(iv || tag || ciphertext).
 */
export function encryptPassword(plain: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

/**
 * Verifikasi password plaintext terhadap ciphertext tersimpan.
 * Mengembalikan true jika cocok.
 */
export function verifyPassword(plain: string, encrypted: string): boolean {
  try {
    const key = getKey();
    const buf = Buffer.from(encrypted, "base64");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + 16);
    const ct = buf.subarray(IV_LEN + 16);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString("utf8") === plain;
  } catch {
    return false;
  }
}

// HTN Legacy - Salin aset statis ke output standalone Next.js.
//
// Build `output: "standalone"` tidak ikut menyalin `public/` dan
// `.next/static` ke folder standalone, jadi keduanya harus disalin manual
// sebelum server standalone dijalankan. Script ini menggantikan perintah
// `cp -r` Unix yang tidak jalan di Windows.
//
// Pemakaian: node scripts/copy-standalone.mjs

import { cp, mkdir, access } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

/** Pastikan folder tujuan ada, lalu salin isi sumber. */
async function copyDir(from, to) {
  try {
    await access(from);
  } catch {
    console.log(`[skip] ${path.relative(root, from)} tidak ada`);
    return;
  }
  await mkdir(to, { recursive: true });
  await cp(from, to, { recursive: true });
  console.log(`[ok]   ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}

try {
  await access(standalone);
} catch {
  console.error(
    "Folder .next/standalone tidak ditemukan. Jalankan `bun run build` terlebih dahulu."
  );
  process.exit(1);
}

await copyDir(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));
await copyDir(path.join(root, "public"), path.join(standalone, "public"));

console.log("Aset standalone siap dijalankan.");

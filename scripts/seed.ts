// HTN Legacy — Seed script
// Mengisi data awal untuk demonstrasi: settings + beberapa anggota.
// Jalankan: bun run seed

import { db } from "../src/lib/db";
import { encryptPassword } from "../src/lib/crypto";
import { currentPeriod } from "../src/lib/format";

async function main() {
  // Settings
  const settings = await db.settings.upsert({
    where: { key: "global" },
    update: {},
    create: {
      key: "global",
      nominalIuran: 10000,
      periodeBerjalan: currentPeriod(),
      deadlineTanggal: 10,
      waPengurus: "6281234567890",
      namaOrganisasi: "HTN Legacy",
    },
  });
  console.log("Settings:", settings.id);

  // Anggota demo
  const members = [
    { nama: "Budi Santoso", nim: "12345001", email: "budi@htn.org", telepon: "628111222333", password: "budi123" },
    { nama: "Siti Rahayu", nim: "12345002", email: "siti@htn.org", telepon: "628222333444", password: "siti123" },
    { nama: "Ahmad Yani", nim: "12345003", email: "ahmad@htn.org", telepon: "628333444555", password: "ahmad123" },
    { nama: "Dewi Lestari", nim: "12345004", email: "dewi@htn.org", telepon: "628444555666", password: "dewi123" },
    { nama: "Rizki Pratama", nim: "12345005", email: "rizki@htn.org", telepon: "628555666777", password: "rizki123" },
  ];

  for (const m of members) {
    const existing = await db.anggota.findFirst({ where: { nama: m.nama } });
    if (existing) {
      console.log("Skip (exists):", m.nama);
      continue;
    }
    const anggota = await db.anggota.create({
      data: {
        nama: m.nama,
        nim: m.nim,
        email: m.email,
        telepon: m.telepon,
        passwordEnc: encryptPassword(m.password),
        periodeBerjalan: settings.periodeBerjalan,
        statusBayar: m.nama === "Budi Santoso" ? "LUNAS" : "BELUM_LUNAS",
      },
    });
    console.log("Created:", anggota.nama, "(password:", m.password + ")");
  }

  console.log("\n--- Login demo ---");
  console.log("Admin password: admin-htn-legacy-2026");
  console.log("Anggota: Budi Santoso / budi123 (LUNAS)");
  console.log("Anggota: Siti Rahayu / siti123 (BELUM_LUNAS)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

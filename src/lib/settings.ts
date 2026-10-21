// HTN Legacy — Settings helper
// Mengambil/membuat settings global tunggal.

import { db } from "@/lib/db";
import { currentPeriod } from "@/lib/format";

/** Ambil settings global; buat jika belum ada. */
export async function getSettings() {
  let settings = await db.settings.findUnique({ where: { key: "global" } });
  if (!settings) {
    settings = await db.settings.create({
      data: {
        key: "global",
        nominalIuran: 10000,
        periodeBerjalan: currentPeriod(),
        deadlineTanggal: 10,
        waPengurus: "6281234567890",
        namaOrganisasi: "HTN Legacy",
      },
    });
  }
  return settings;
}

/** Update settings global. */
export async function updateSettings(data: {
  nominalIuran?: number;
  periodeBerjalan?: string;
  deadlineTanggal?: number;
  waPengurus?: string;
  barcodePath?: string;
  namaOrganisasi?: string;
}) {
  const existing = await getSettings();
  return db.settings.update({
    where: { id: existing.id },
    data,
  });
}

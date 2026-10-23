-- Receipt REJECTED adalah histori dan boleh berulang pada anggota/periode yang sama.
-- Validasi server tetap mencegah lebih dari satu PENDING/APPROVED aktif.
DROP INDEX IF EXISTS "Struk_anggotaId_periodeBulan_status_key";
CREATE INDEX IF NOT EXISTS "Struk_anggotaId_periodeBulan_status_idx"
  ON "Struk"("anggotaId", "periodeBulan", "status");

-- HTN Legacy - Migrasi awal ke PostgreSQL Neon.
--
-- Latar belakang: database Neon dibuat oleh versi lama aplikasi (schema
-- pre-rebuild) memakai `prisma db push`, sehingga tidak ada history migrasi
-- Prisma dan nama kolomnya berbeda dari schema di `prisma/schema.prisma`.
--
-- Strategi: JANGAN drop lalu buat ulang. Data anggota, receipt, settings, dan
-- audit log yang sudah ada harus tetap utuh, jadi kolom legacy dipetakan
-- memakai RENAME COLUMN. Kolom legacy yang tidak punya padanan dipindahkan
-- isinya lebih dulu, baru dihapus.
--
-- Periode berjalan diambil dari zona waktu Asia/Bangkok agar sama dengan
-- `currentPeriod()` di `src/lib/format.ts`.

-- ============================== Anggota ==============================
DROP INDEX "Anggota_gender_idx";
DROP INDEX "Anggota_namaLengkap_gender_key";
ALTER INDEX "Anggota_status_idx" RENAME TO "Anggota_statusBayar_idx";

ALTER TABLE "Anggota" RENAME COLUMN "namaLengkap" TO "nama";
ALTER TABLE "Anggota" RENAME COLUMN "noHpWa" TO "telepon";
ALTER TABLE "Anggota" RENAME COLUMN "status" TO "statusBayar";
ALTER TABLE "Anggota" DROP COLUMN "gender";

ALTER TABLE "Anggota" ADD COLUMN "nim" TEXT;
ALTER TABLE "Anggota" ADD COLUMN "email" TEXT;
ALTER TABLE "Anggota" ADD COLUMN "catatan" TEXT;
ALTER TABLE "Anggota" ADD COLUMN "periodeBerjalan" TEXT NOT NULL DEFAULT '2026-10';

UPDATE "Anggota"
SET "periodeBerjalan" = to_char(now() AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM');

CREATE UNIQUE INDEX "Anggota_nim_key" ON "Anggota"("nim");
CREATE UNIQUE INDEX "Anggota_email_key" ON "Anggota"("email");
CREATE INDEX "Anggota_periodeBerjalan_idx" ON "Anggota"("periodeBerjalan");

-- =============================== Struk ===============================
ALTER INDEX "Struk_statusStruk_idx" RENAME TO "Struk_status_idx";

ALTER TABLE "Struk" RENAME COLUMN "imageUrl" TO "filePath";
ALTER TABLE "Struk" RENAME COLUMN "statusStruk" TO "status";
ALTER TABLE "Struk" RENAME COLUMN "ditolakAlasan" TO "alasanReject";
ALTER TABLE "Struk" RENAME COLUMN "verifiedAt" TO "reviewedAt";

ALTER TABLE "Struk" ADD COLUMN "nominal" INTEGER;
ALTER TABLE "Struk" ADD COLUMN "catatan" TEXT;
ALTER TABLE "Struk" ADD COLUMN "sumber" TEXT NOT NULL DEFAULT 'ANGGOTA_UPLOAD';
ALTER TABLE "Struk" ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "Struk" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Struk" SET "updatedAt" = "createdAt";

CREATE UNIQUE INDEX "Struk_anggotaId_periodeBulan_status_key"
  ON "Struk"("anggotaId", "periodeBulan", "status");

-- Catatan: foreign key "Struk_anggotaId_fkey" sudah ada di Neon sejak schema
-- legacy dibuat, dengan definisi ON DELETE CASCADE ON UPDATE CASCADE yang
-- sama dengan target, jadi tidak perlu dibuat ulang di sini.

-- ============================ Transaksi ==============================
DROP INDEX "Transaksi_strukId_idx";

ALTER TABLE "Transaksi" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Transaksi" ALTER COLUMN "keterangan" DROP NOT NULL;

UPDATE "Transaksi" SET "updatedAt" = "createdAt";

CREATE UNIQUE INDEX "Transaksi_strukId_key" ON "Transaksi"("strukId");
CREATE INDEX "Transaksi_anggotaId_idx" ON "Transaksi"("anggotaId");

ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_anggotaId_fkey"
  FOREIGN KEY ("anggotaId") REFERENCES "Anggota"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_strukId_fkey"
  FOREIGN KEY ("strukId") REFERENCES "Struk"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================== Settings =============================
ALTER TABLE "Settings" RENAME COLUMN "barcodeImageUrl" TO "barcodePath";

ALTER TABLE "Settings" ADD COLUMN "key" TEXT NOT NULL DEFAULT 'global';
ALTER TABLE "Settings" ADD COLUMN "periodeBerjalan" TEXT NOT NULL DEFAULT '2026-10';
ALTER TABLE "Settings" ADD COLUMN "waPengurus" TEXT;
ALTER TABLE "Settings" ADD COLUMN "namaOrganisasi" TEXT NOT NULL DEFAULT 'HTN Legacy';

UPDATE "Settings"
SET "waPengurus" = "kontakBendahara"
WHERE "kontakBendahara" IS NOT NULL;

UPDATE "Settings"
SET "periodeBerjalan" = to_char(now() AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM');

ALTER TABLE "Settings" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Settings" ALTER COLUMN "nominalIuran" SET DEFAULT 10000;

ALTER TABLE "Settings" DROP COLUMN "namaBank";
ALTER TABLE "Settings" DROP COLUMN "nomorRekening";
ALTER TABLE "Settings" DROP COLUMN "kontakBendahara";
ALTER TABLE "Settings" DROP COLUMN "kontakSekretaris";
ALTER TABLE "Settings" DROP COLUMN "kontakKompting";

CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- ============================== AuditLog =============================
ALTER TABLE "AuditLog" RENAME COLUMN "actor" TO "actorNama";
ALTER TABLE "AuditLog" RENAME COLUMN "targetId" TO "refId";
ALTER TABLE "AuditLog" RENAME COLUMN "targetLabel" TO "deskripsi";

ALTER TABLE "AuditLog" ADD COLUMN "actorId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "refType" TEXT;

CREATE INDEX "AuditLog_refType_refId_idx" ON "AuditLog"("refType", "refId");

-- HTN Legacy - Migrasi koreksi nullability dan default kolom.
--
-- Migration sebelumnya (20261021130000_init_neon_legacy_transform) memetakan
-- kolom legacy ke schema baru memakai RENAME COLUMN. Karena RENAME COLUMN
-- ikut membawa aturan NOT NULL dan DEFAULT dari kolom asalnya, beberapa kolom
-- masih berbeda aturan dengan `prisma/schema.prisma`. Migration ini meluruskan
-- sisanya supaya `prisma migrate diff` tidak melaporkan drift.
--
-- Aturan yang diluruskan:
-- - `Anggota.telepon` dan `AuditLog.actorNama` legacy NOT NULL, di schema baru
--   keduanya opsional.
-- - `AuditLog.deskripsi` legacy nullable, di schema baru wajib diisi.
-- - Kolom `periodeBerjalan` dan `updatedAt` tidak punya default di schema baru
--   karena selalu diisi eksplisit oleh Prisma Client.

-- ============================== Anggota ==============================
ALTER TABLE "Anggota" ALTER COLUMN "telepon" DROP NOT NULL;
ALTER TABLE "Anggota" ALTER COLUMN "periodeBerjalan" DROP DEFAULT;

-- =============================== Struk ===============================
ALTER TABLE "Struk" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- ============================ Transaksi ==============================
ALTER TABLE "Transaksi" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- ============================== Settings =============================
ALTER TABLE "Settings" ALTER COLUMN "periodeBerjalan" DROP DEFAULT;

-- ============================== AuditLog =============================
UPDATE "AuditLog"
SET "deskripsi" = coalesce("deskripsi", 'Aksi admin tanpa label')
WHERE "deskripsi" IS NULL;

ALTER TABLE "AuditLog" ALTER COLUMN "actorNama" DROP NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "deskripsi" SET NOT NULL;

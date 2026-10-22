-- HTN Legacy - Baseline schema legacy (SUDAH DITERAPKAN).
--
-- Database Neon dibuat oleh versi lama aplikasi memakai `prisma db push`, jadi
-- tabelnya sudah ada tanpa history migrasi Prisma. Migration ini hanya
-- merekam bentuk schema legacy itu sebagai titik awal history, dan sengaja
-- TIDAK dijalankan ulang. Bentuknya hasil `prisma migrate diff --from-empty
-- --to-url $DATABASE_URL` terhadap database Neon sebelum transformasi.
--
-- Transformasi ke schema baru ada di migration berikutnya
-- `20261021130000_init_neon_legacy_transform`.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Anggota" (
    "id" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "noHpWa" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BELUM_LUNAS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anggota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "aksi" TEXT NOT NULL,
    "targetId" TEXT,
    "targetLabel" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "nominalIuran" INTEGER NOT NULL DEFAULT 15000,
    "deadlineTanggal" INTEGER NOT NULL DEFAULT 10,
    "namaBank" TEXT,
    "nomorRekening" TEXT,
    "barcodeImageUrl" TEXT,
    "kontakBendahara" TEXT,
    "kontakSekretaris" TEXT,
    "kontakKompting" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Struk" (
    "id" TEXT NOT NULL,
    "anggotaId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "statusStruk" TEXT NOT NULL DEFAULT 'PENDING',
    "ditolakAlasan" TEXT,
    "periodeBulan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "Struk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaksi" (
    "id" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "nominal" INTEGER NOT NULL,
    "keterangan" TEXT NOT NULL,
    "strukId" TEXT,
    "anggotaId" TEXT,
    "periodeBulan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaksi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Anggota_gender_idx" ON "public"."Anggota"("gender" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Anggota_namaLengkap_gender_key" ON "public"."Anggota"("namaLengkap" ASC, "gender" ASC);

-- CreateIndex
CREATE INDEX "Anggota_status_idx" ON "public"."Anggota"("status" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_aksi_idx" ON "public"."AuditLog"("aksi" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Struk_anggotaId_idx" ON "public"."Struk"("anggotaId" ASC);

-- CreateIndex
CREATE INDEX "Struk_periodeBulan_idx" ON "public"."Struk"("periodeBulan" ASC);

-- CreateIndex
CREATE INDEX "Struk_statusStruk_idx" ON "public"."Struk"("statusStruk" ASC);

-- CreateIndex
CREATE INDEX "Transaksi_periodeBulan_idx" ON "public"."Transaksi"("periodeBulan" ASC);

-- CreateIndex
CREATE INDEX "Transaksi_strukId_idx" ON "public"."Transaksi"("strukId" ASC);

-- CreateIndex
CREATE INDEX "Transaksi_tipe_idx" ON "public"."Transaksi"("tipe" ASC);

-- AddForeignKey
ALTER TABLE "public"."Struk" ADD CONSTRAINT "Struk_anggotaId_fkey" FOREIGN KEY ("anggotaId") REFERENCES "public"."Anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;


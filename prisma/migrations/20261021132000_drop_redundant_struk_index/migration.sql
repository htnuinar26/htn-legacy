-- HTN Legacy - Buang index Struk yang redundan.
--
-- Index unik komposit "Struk_anggotaId_periodeBulan_status_key" sudah menutupi
-- pencarian berdasarkan anggotaId karena anggotaId adalah kolom pertama. Index
-- lama "Struk_anggotaId_idx" dari schema legacy menjadi duplikat, sedangkan
-- `prisma/schema.prisma` tidak mendeklarasikannya.

DROP INDEX "Struk_anggotaId_idx";

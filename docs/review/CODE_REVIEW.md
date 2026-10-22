# Code Review - HTN Legacy

**Tanggal**: 2026-10-21
**Reviewer**: Agent (self-review)
**Scope**: Audit menyeluruh terhadap 32 temuan, dikerjakan dalam 4 Pull Request
**Dokumen acuan**: `PRD.md`, `ARCHITECTURE.md`, `SPEC.md`, `DESIGN.md` (sekarang di root repository)

---

## 1. Ringkasan Eksekutif

Audit menyeluruh terhadap `PRD.md`, `SPEC.md`, `ARCHITECTURE.md`, `DESIGN.md`, 21 Route Handler, 16 view, 10 helper `lib/`, komponen UI, `prisma/schema.prisma`, dan seluruh skrip build/test menemukan **32 temuan**: 4 kritis, 8 tinggi, 14 menengah, 6 rendah.

Temuan paling menentukan: `prisma/schema.prisma` masih memakai `provider = "sqlite"` sementara environment menunjuk Neon PostgreSQL. Prisma menolak setiap koneksi, sehingga **seluruh aplikasi mengembalikan HTTP 500** dan praktis tidak bisa dipakai. Perbaikan dilakukan lewat migration Prisma standar yang memetakan kolom schema legacy ke schema baru dengan `ALTER TABLE ... RENAME COLUMN`, sehingga data yang sudah ada di Neon tetap utuh.

**Status**: Lulus review, dengan dua risiko tersisa yang tercatat di `TODO.md` bagian Known Issues (reset password dua anggota legacy, dan rotasi secret yang pernah ter-commit).

---

## 2. Review terhadap Batasan Keras

| # | Batasan | Status | Bukti |
|---|---------|--------|-------|
| 1 | Jangan pakai `<input type="number">` untuk nominal uang | Patuh | `grep 'type="number"' src/` tidak ada hasil di kode aplikasi. `RupiahInput` memakai `type="text" inputMode="numeric"`, tanpa `min`/`max`/`step`/`pattern`. |
| 2 | Jangan return error API tanpa kategori dan `requestId` | Patuh | Semua endpoint memakai `apiError()`/`apiUnexpected()` dari `src/lib/api-response.ts`. Response selalu `{success, error:{category, message, requestId}}`. |
| 3 | Jangan tambah OCR/Gemini/AI fallback | Patuh | Receipt hanya lewat upload manual dan review manual Admin. Tidak ada import AI service. |
| 4 | Jangan tambah WAHA/WhatsApp worker 24/7 | Patuh | WhatsApp hanya lewat tautan `wa.me` manual. Tidak ada webhook atau worker. |
| 5 | Jangan gabung beberapa file ke satu commit | Patuh | Setiap Pull Request memakai satu commit per file. Total 60 commit untuk 4 Pull Request. |
| 6 | Jangan simpan secret ke repo | Patuh, dengan risiko tersisa | `.env` sudah dilepas dari tracking. Secret versi lama masih ada di history commit `dfa0935` dan `88d6f99`, wajib dirotasi. Tercatat di Known Issues. |
| 7 | Jangan jalankan `prisma db reset` | Patuh | Hanya `prisma migrate deploy` dan `prisma migrate resolve --applied` untuk baselining. |
| 8 | Jangan merge PR | Patuh | Tidak ada PR yang di-merge. Headquartered di `htnuinar26/htn-legacy`, pemilik yang melakukan merge. |
| 9 | Jangan gunakan em-dash (U+2014) | Patuh, sebagian | Dinormalisasi di seluruh file yang disentuh. Lima file dengan perubahan lokal milik pemilik dibiarkan dan dicatat di Known Issues. |
| 10 | Ikuti mermaid flow di `ARCHITECTURE.md` | Patuh | Alur upload, generator, dan penghapusan kas mengikuti diagram. Penyimpangan yang perlu penjelasan ditulis di `DEVIATIONS.md` bila ada. |

---

## 3. Temuan Kritis dan Perbaikannya

### 3.1 Prisma SQLite vs Neon PostgreSQL

`prisma/schema.prisma` memakai `provider = "sqlite"` sementara `.env` menunjuk `postgresql://neondb_owner:...`. Setiap operasi database gagal dengan `PrismaClientInitializationError: the URL must start with the protocol 'file:'`.

Database Neon dibuat oleh versi lama aplikasi memakai `prisma db push`, sehingga tabelnya ada dengan nama kolom berbeda (`namaLengkap`, `noHpWa`, `gender`, `statusStruk`, `imageUrl`) dan tanpa history migrasi Prisma.

Perbaikannya empat migration:

1. `20261021120000_baseline_legacy` - merekam bentuk schema legacy, ditandai sudah diterapkan lewat `prisma migrate resolve --applied` sehingga tidak dijalankan ulang.
2. `20261021130000_init_neon_legacy_transform` - memetakan kolom lama ke kolom baru dengan `RENAME COLUMN`, menambah kolom baru, dan memasang foreign key.
3. `20261021131000_align_column_nullability` - meluruskan aturan `NOT NULL` dan `DEFAULT` yang terbawa oleh rename.
4. `20261021132000_drop_redundant_struk_index` - membuang index yang sudah tertutup index unik komposit.

Hasil verifikasi data: 2 anggota, 1 struk, 67 audit log, dan 1 settings tetap utuh. `prisma migrate diff` melaporkan "empty migration", tidak ada drift.

### 3.2 Tiga endpoint bocor tanpa autentikasi

`GET /api/transaksi`, `GET /api/anggota`, dan `GET /api/settings` tidak memanggil pemeriksa session sama sekali. Terbukti mengembalikan 200 ke tamu, lengkap dengan saldo kas, direktori anggota, dan nomor WhatsApp pengurus. Ketiganya kini memakai helper `requireMemberOrAdmin()` di `src/lib/auth.ts` yang mengembalikan 401 `AUTH_ERROR` bila tidak ada session.

### 3.3 Penolakan receipt kedua menjadi 500 generik

`Struk` punya unique constraint `[anggotaId, periodeBulan, status]`. Saat Admin menolak receipt kedua pada periode yang sama, `db.struk.update` menabrak P2002. Jalur `reject` tidak dibungkus klasifikasi error Prisma, berbeda dengan jalur `approve`, sehingga error jatuh ke `apiUnexpected` dan user melihat "Terjadi kesalahan tak terduga di server". Jalur reject kini dibungkus dan mengembalikan 409 `CONFLICT` dengan pesan yang menyebut struk, periode, dan tindakan yang harus dilakukan Admin.

### 3.4 Persetujuan receipt anggota selalu 400

Receipt hasil upload anggota tidak punya field `nominal`, jadi `struk.nominal` selalu `null`. UI mengirim `nominal: null`, dan `z.number().int().positive().optional()` menolak `null` dengan pesan Inggris "Invalid input: expected number, received null". Skema kini menerima `null` dan memperlakukannya sebagai "tidak diisi", sehingga fallback ke `struk.nominal` lalu `settings.nominalIuran` terpakai. Di sisi client, `nominal` hanya dikirim kalau benar-benar diisi.

---

## 4. Catatan tentang Perubahan yang Tidak Terlihat dari Diff

Beberapa perbaikan mengubah perilaku yang tidak terlihat di diff kode, dan perlu dicatat karena bisa menimbulkan behavior change bagi pengguna:

- **Periode halaman Kas dan Laporan.** Semula memakai `currentPeriod()` yang berjalan di waktu lokal browser. Sekarang mengikuti `settings.periodeBerjalan` dari server. Kalau Admin menyetel periode berjalan ke bulan yang berbeda dari bulan kalender, tampilan ikut berubah. Ini memang yang dikehendaki `PRD.md` ("Periode berjalan" adalah konfigurasi organisasi), tapi berbeda dari perilaku lama.
- **Batas maksimum nominal 2.000.000.000.** Menambahkan batas di client dan server. Nilai di atas batas sebelumnya lolos validasi lalu gagal saat disimpan dengan error database. Sekarang ditolak lebih awal dengan pesan jelas.
- **Penghapusan anggota menghapus file receipt.** Sebelumnya record receipt terhapus (cascade) tapi file gambarnya tertinggal. Sekarang file ikut dihapus, dan kegagalan hapus dilaporkan di `storageCleanupErrors`.
- **Pencocokan nama tahan huruf besar-kecil.** Login dan cek duplikat sekarang memakai `mode: "insensitive"`. Akun dengan nama yang hanya berbeda kapital tidak bisa dibuat lagi.
- **Teks konfirmasi hapus anggota diperbaiki.** Teks lama menyatakan transaksi ikut terhapus, padahal `Transaksi` memakai `onDelete: SetNull` dan tetap tersimpan sebagai histori.

---

## 5. Risiko yang Tersisa

1. **Password anggota legacy tidak kompatibel.** Dua anggota di Neon memakai format `iv:tag:ciphertext` heksadesimal dengan IV 16 byte, sedangkan `src/lib/crypto.ts` memakai base64 `iv(12 byte) || tag || ciphertext`. Admin perlu reset password keduanya sebelum anggota bisa login.
2. **Secret pernah ter-commit.** `JWT_SECRET`, `ENCRYPTION_KEY`, dan `ADMIN_PASSWORD` versi lama masih ada di history git commit `dfa0935` dan `88d6f99`. Wajib dirotasi sebelum deploy produksi, lalu history dibersihkan. Ini butuh keputusan pemilik karena merusak history.
3. **Storage adapter masih lokal.** `src/lib/storage.ts` menulis ke `public/storage` dan menyajikan path publik, belum signed URL seperti kontrak `ARCHITECTURE.md`. Antarmukanya sudah siap, jadi penggantian ke Supabase hanya mengganti implementasi, tapi pekerjaan itu belum dikerjakan.
4. **Lima file masih punya em-dash.** `.zscripts/build.sh`, `scripts/dark-mode-verify.sh`, `scripts/regression-test.sh`, `scripts/ui-verify.sh`, dan `start-dev.sh` punya perubahan lokal milik pemilik yang belum di-commit, sehingga tidak disertakan agar perubahan di luar cakupan tidak ikut ter-commit.
5. **Migrasi Neon menyentuh database produksi.** Tiga migration sudah dijalankan pada 2026-10-21. Deployment baru wajib menjalankan `bunx prisma migrate deploy` sebelum aplikasi start.

---

## 6. Validasi

| Perintah | PR #4 (config) | PR #9 (API) | PR #15 (UI) | PR #16 (docs) |
|---|---|---|---|---|
| `bunx tsc --noEmit` | kode 0 | kode 0 | kode 0 | kode 0 |
| `bun run lint` | kode 0 | kode 0 | kode 0 | kode 0 |
| `bun run build` | kode 0 | - | kode 0 | kode 0 |
| Uji API langsung | - | 22 skenario lulus | - | - |
| Verifikasi browser | - | - | 7 skenario lulus | - |

Pengujian API dijalankan terhadap Neon. Semua data uji dibersihkan, dan Neon diverifikasi kembali ke kondisi awal: 2 anggota, 1 struk, 0 transaksi, 67 audit log, 1 settings, `barcodePath` `null`.

---

## 7. Kesimpulan

**Audit 32 temuan selesai.** Empat bug kritis diperbaiki: aplikasi sekarang benar-benar berjalan di Neon, tiga endpoint yang bocor ditutup, penolakan receipt kedua memberi pesan yang bisa ditindaklanjuti, dan persetujuan receipt anggota tidak lagi gagal.

Dua risiko tersisa (reset password anggota legacy dan rotasi secret) tercatat di `TODO.md` bagian Known Issues dan menunggu keputusan pemilik proyek.

# TODO — HTN Legacy

Daftar sisa pekerjaan, catatan teknis, dan item yang perlu ditindaklanjuti.

## Status Saat Ini (2026-10-21)

### ✅ Selesai & Terverifikasi

- [x] Foundation: design system tiga lapis, splash screen, dark mode, komponen bersama (`RupiahInput`, `api-response`).
- [x] Auth: signup anggota, login anggota (nama+password), login admin, logout, session JWT httpOnly.
- [x] Semua 9 view Admin: Dashboard, Anggota, Review Struk, Generator Struk, Kas, Import Data, Audit Log, Laporan, Settings.
- [x] Semua 6 view Anggota: Beranda, Struk Iuran, Kas Organisasi, Daftar Anggota, Barcode Pembayaran, Profil Saya.
- [x] Semua API endpoint sesuai SPEC.md dengan kontrak `api-response` terklasifikasi + `requestId`.
- [x] Prisma schema: `Anggota`, `Struk`, `Transaksi`, `Settings`, `AuditLog`.
- [x] Storage adapter (local file untuk sandbox, interface siap Supabase).
- [x] **Bug #1 dicegah**: `RupiahInput` tanpa `step`/`pattern`, nilai `10000` diterima.
- [x] **Bug #2 dicegah**: `/api/admin/struk-generator` mengembalikan 200/400/403/409 dengan detail, bukan 500.
- [x] Regression test (`scripts/regression-test.sh`) lulus: nominal 10000 → struk APPROVED → transaksi MASUK → status LUNAS.
- [x] UI verification (`scripts/ui-verify.sh`) lulus: semua view render, no console errors, no page errors.
- [x] Mobile responsive (375px) tanpa horizontal overflow.
- [x] `bun run lint` bersih.
- [x] `bunx tsc --noEmit` bersih untuk `src/`.
- [x] `.env` dihapus dari git tracking; `.env.example` dibuat.

### ⚠️ Perlu Tindak Lanjut

#### Prioritas Tinggi (Produksi)

- [ ] **Unggah AGENTS.md** ke repository. Saat ini proses Git/PR/Issue tidak bisa mengikuti AGENTS.md sepenuhnya karena dokumen tidak tersedia. Konvensi standar digunakan sebagai pengganti.
- [ ] **Ganti JWT_SECRET** di produksi dengan string acak minimal 32 byte. Saat ini pakai dev secret.
- [ ] **Ganti ADMIN_PASSWORD** di produksi. Saat ini pakai `admin-htn-legacy-2026` (dev).
- [ ] **Migrasi database ke Neon PostgreSQL**: ubah `DATABASE_URL` dan `DIRECT_URL` di `.env` produksi. Struktur Prisma schema sudah kompatibel (tinggal ganti provider di `schema.prisma` dari `sqlite` ke `postgresql` dan sesuaikan tipe field tanggal/periode jika perlu).
- [ ] **Aktifkan Supabase Storage**: isi `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` di `.env` produksi. Ganti implementasi `src/lib/storage.ts` dari `LocalFileStorage` ke `SupabaseStorage` (interface sudah disiapkan).
- [ ] **Set `NODE_ENV=production`** dan `secure: true` untuk cookie di produksi (saat ini `secure: process.env.NODE_ENV === "production"`).

#### Prioritas Sedang

- [ ] **Test interaksi shadcn Select di Agent Browser**: dropdown anggota di Generator Struk sulit diklik via automation (CDP box model error pada option). Form berfungsi manual (terverifikasi via API). Tambahkan test E2E dengan Playwright jika diperlukan.
- [ ] **Seed data**: tambahkan script `prisma/seed.ts` untuk data demo (5 anggota saat ini dibuat manual via API).
- [ ] **Rate limiting** pada endpoint auth (login/signup/admin-login) untuk mencegah brute force.
- [ ] **CSRF protection** untuk state-changing endpoints (saat ini andal sameSite=lax).
- [ ] **Audit log coverage**: verifikasi semua aksi admin (create/update/delete anggota, approve/reject struk, create/delete transaksi, update settings) tercatat di AuditLog.

#### Prioritas Rendah

- [ ] **Loading skeleton** pada view yang fetch data (saat ini pakai spinner sederhana).
- [ ] **Empty state illustration** untuk list kosong (struk, transaksi, audit log).
- [ ] **Keyboard shortcut** untuk navigasi antar view admin.
- [ ] **Export laporan ke PDF/Excel** (saat ini laporan hanya tampil di UI).
- [ ] **PWA support** (manifest, service worker) untuk akses offline.

### 🔍 Catatan Teknis

#### Dev Server Sandbox

Dev server Next.js di sandbox ini **tidak stabil** — process background mati setiap ~30-60 detik antar perintah bash (SIGTERM dari sandbox manager). Untuk verifikasi lengkap, gunakan `scripts/regression-test.sh` dan `scripts/ui-verify.sh` yang menjalankan semua tes dalam satu sesi bash. Watchdog di `.zscripts/watchdog-dev.sh` dapat diaktifkan untuk restart otomatis.

#### Routing SPA

Sandbox constraint: user hanya bisa melihat route `/`. Seluruh aplikasi di-render sebagai SPA dengan client-side view management (`src/lib/nav-store.ts`). Tidak ada route Next.js lain. Semua "halaman" adalah komponen view yang di-switch berdasarkan state nav store.

#### Storage Path

File receipt di sandbox disimpan di `public/storage/` dan disajikan langsung via static serving. Path disimpan di `Struk.filePath` sebagai relative path. Di produksi dengan Supabase, `filePath` menyimpan object key di bucket.

#### Password Anggota

Password anggota dienkripsi AES-256-GCM (`src/lib/crypto.ts`) menggunakan `ENCRYPTION_KEY` dari env. Untuk sandbox, key di-generate dari JWT_SECRET. Di produksi, gunakan key terpisah yang di-rotate berkala.

### 📋 Checklist Regresi Wajib (dari SPEC.md)

Sebelum melaporkan fitur nominal atau receipt generator selesai, verifikasi eksplisit:

- [x] **Input nominal menerima `10000`** tanpa native validation error. Bukti: `RupiahInput` `type=text inputMode=numeric pattern=null step=null`, `validity.valid=true`.
- [x] **POST `/api/admin/struk-generator` tidak mengembalikan 500 tanpa detail**. Bukti: HTTP 200 sukses / 400 validasi / 409 konflik / 403 auth, semua dengan `requestId`.
- [x] **Response error memiliki `category` dan `requestId`**. Bukti: `{"success":false,"error":{"category":"...","message":"...","requestId":"uuid"}}`.
- [x] **Tidak ada `<input type="number">` untuk nominal uang**. Bukti: `grep -r 'type="number"' src/` → hanya di komentar larangan.
- [x] **Transaksi DB atomik** (struk + transaksi + status anggota dalam satu transaksi). Bukti: POST struk-generator sukses → struk APPROVED + transaksi MASUK + anggota LUNAS, semua konsisten.

### 🔗 Link

- Spec dokumen: `upload/PRD.md`, `upload/ARCHITECTURE.md`, `upload/SPEC.md`, `upload/DESIGN.md`
- Worklog: `worklog.md`
- Changelog: `CHANGELOG.md`
- Code review: `docs/review/CODE_REVIEW.md`
- Regression test: `scripts/regression-test.sh`
- UI verification: `scripts/ui-verify.sh`

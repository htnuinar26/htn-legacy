# Changelog

Semua perubahan penting pada proyek **HTN Legacy** akan didokumentasikan dalam file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/), dan proyek ini mematuhi [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased] — 2026-10-21

### Ringkasan

Pembangunan ulang total HTN Legacy dari nol. Dua bug produksi yang menjadi alasan rewrite dicegah secara struktural: (1) field nominal uang yang menolak nilai wajar seperti `10000`, dan (2) endpoint `/api/admin/struk-generator` yang mengembalikan HTTP 500 tanpa detail.

### Added — Foundation

- **Design system tiga lapis** (primitive → semantic → component) di `src/app/globals.css`. Token warna diturunkan dari logo HTN Legacy (maroon `#6b1420` + emas `#9c7a2f`). Dukungan dark mode via `next-themes`.
- **Splash screen** (`src/components/splash-provider.tsx`) sesuai DESIGN.md: animasi logo + tagline "Constitutio et Iustitia" selama ~1.5s saat load awal.
- **Komponen bersama wajib**:
  - `RupiahInput` (`src/components/ui/rupiah-input.tsx`) — field nominal uang dengan `type="text" inputMode="numeric"`, **tanpa** `step`/`pattern` native. State integer polos, tampilan terformat pemisah ribuan. Mencegah bug #1.
  - Helper `api-response` (`src/lib/api-response.ts`) — kontrak response terklasifikasi (`AUTH_ERROR`, `VALIDATION_ERROR`, `CONFLICT`, `NOT_FOUND`, `UNEXPECTED`) dengan `requestId` (UUID) untuk setiap error. Mencegah bug #2.
- **Auth & session** (`src/lib/auth.ts`, `src/lib/crypto.ts`): JWT httpOnly cookie untuk sesi anggota dan admin. Password anggota dienkripsi AES-256-GCM. Password admin via env `ADMIN_PASSWORD`.
- **Storage adapter** (`src/lib/storage.ts`): interface kontrak (upload/hapus/signed URL) dengan implementasi local file storage untuk sandbox. Produksi tinggal ganti ke Supabase Storage tanpa mengubah pemanggil.
- **Prisma schema** (`prisma/schema.prisma`): model `Anggota`, `Struk`, `Transaksi`, `Settings`, `AuditLog` persis sesuai ARCHITECTURE.md. SQLite untuk sandbox; struktur siap Neon PostgreSQL.

### Added — Fitur Anggota

- **Beranda** (`beranda-view.tsx`): sambutan, info iuran periode berjalan, status pembayaran, 5 struk terbaru, transaksi terbaru.
- **Struk Iuran** (`struk-view.tsx`): upload receipt (gambar), preview, submit. Pencatatan otomatis periode berjalan.
- **Kas Organisasi** (`kas-view.tsx`): read-only daftar transaksi periode berjalan untuk anggota.
- **Daftar Anggota** (`daftar-view.tsx`): direktori anggota (nama, NIM, status bayar).
- **Barcode Pembayaran** (`barcode-view.tsx`): render barcode dari settings organisasi + instruksi pembayaran via `wa.me` manual.
- **Profil Saya** (`profil-view.tsx`): kelola data pribadi, ganti password, logout.

### Added — Fitur Admin/Bendahara

- **Dashboard** (`dashboard-view.tsx`): total anggota, breakdown lunas/belum/tertunggak, saldo total, pemasukan/pengeluaran periode, jumlah struk pending.
- **Manajemen Anggota** (`anggota-view.tsx`): CRUD anggota, reset password, hapus, filter status.
- **Review Struk** (`struk-review-view.tsx`): list struk PENDING, approve/reject dengan catatan. Approve membuat transaksi MASUK atomik dan update status anggota.
- **Generator Struk Manual** (`struk-generator-view.tsx`): form pembuatan receipt manual. Hanya tampilkan anggota tanpa receipt aktif. Submit → struk APPROVED + transaksi MASUK + status LUNAS dalam satu transaksi DB (isolation Serializable).
- **Kas Organisasi** (`kas-view.tsx` admin): tambah transaksi MASUK/KELUAR dengan `RupiahInput`, hapus transaksi (dengan audit log), filter periode.
- **Import Data** (`import-view.tsx`): bulk import anggota via CSV/JSON.
- **Audit Log** (`audit-log-view.tsx`): jejak perubahan entitas (anggota, struk, transaksi, settings) dengan aktor, aksi, timestamp.
- **Laporan** (`laporan-view.tsx`): rekap per periode, export.
- **Settings** (`settings-view.tsx`): konfigurasi periode berjalan, nominal iuran, deadline, nama organisasi, barcode, ganti password admin.

### Added — API Endpoints

Semua endpoint di `src/app/api/` mengikuti kontrak `api-response` (terklasifikasi + `requestId`):

- `POST /api/auth/signup`, `POST /api/auth/login` (nama+password), `POST /api/auth/admin-login`, `POST /api/auth/logout`, `GET /api/auth/session`
- `GET /api/anggota`, `GET /api/anggota/[id]`, `POST /api/anggota/[id]/struk`
- `GET /api/struk`, `POST /api/struk/upload`, `PATCH /api/struk/[id]/verify` (approve/reject)
- `POST /api/admin/struk-generator`, `GET /api/admin/struk-generator/anggota`
- `GET /api/admin/audit-log`
- `GET /api/transaksi`, `POST /api/transaksi`, `DELETE /api/transaksi/[id]`
- `GET /api/dashboard`
- `GET /api/laporan`
- `GET /api/settings`, `PATCH /api/settings`, `POST /api/settings/barcode`

### Added — Scripts

- `scripts/regression-test.sh` — regression test lengkap untuk dua bug produksi (login admin → POST struk-generator dengan nominal 10000 → verifikasi status anggota LUNAS → verifikasi transaksi MASUK → test duplikat 409 → test nominal invalid 400).
- `scripts/ui-verify.sh` — verifikasi UI via Agent Browser (semua view admin + member).
- `.zscripts/watchdog-dev.sh` — watchdog untuk restart dev server di sandbox yang tidak stabil.

### Fixed — Regression Prevention

- **Bug #1 (nominal input)**: `RupiahInput` menggunakan `type="text" inputMode="numeric"` tanpa `step`/`pattern`. Ditemukan saat verifikasi bahwa `pattern="[0-9]*"` awalnya ikut menyebabkan native validation error pada nilai terformat `"10.000"` (mengandung titik). Pattern dihapus dari `rupiah-input.tsx` dan `settings-view.tsx`. Filter `onChange` sudah membuang non-digit; validasi final di server via Zod.
- **Bug #2 (struk-generator 500)**: endpoint mengembalikan response terklasifikasi untuk semua path: sukses (200), validasi (400), konflik (409), auth (403), unexpected (500 dengan `requestId`). Tidak ada 500 tanpa detail.

### Fixed — UI

- Mobile horizontal overflow 1px pada viewport 375px: ditambahkan `overflow-x: hidden` pada `html` dan `body` di `globals.css`.

### Added — Dark/Light Mode Enhancement

- **ThemeToggle di login page**: sebelumnya toggle tema (Terang/Gelap/Sistem) hanya ada di admin shell dan member shell. Sekarang tersedia di pojok kanan atas panel form login, agar user bisa memilih tema sebelum masuk.
- **Dark mode terverifikasi penuh** via Agent Browser: login page, 9 view admin, 6 view anggota, mobile 375px — semua render dengan benar di dark mode. CSS variables tiga lapis (primitive → semantic → component) memastikan konsistensi warna di kedua mode.
- **Script verifikasi dark mode** (`scripts/dark-mode-verify.sh`, `scripts/dark-mode-final.sh`): test end-to-end dark/light toggle di semua shell dan view.

### Fixed — Bug

- **ENCRYPTION_KEY tidak dikonfigurasi**: signup anggota gagal dengan `INTERNAL_ERROR` "ENCRYPTION_KEY tidak dikonfigurasi dengan benar." karena `crypto.ts` butuh 64 hex chars yang belum ada di `.env`. Diperbaiki: generate key dev, tambahkan ke `.env.example` dengan dokumentasi (`openssl rand -hex 32`).

### Security

- **Menghapus `.env` dari git tracking** — file berisi `JWT_SECRET`, `ADMIN_PASSWORD`, `DATABASE_URL` sebelumnya ter-commit. Dihapus via `git rm --cached .env` (file lokal tetap ada). Dibuat `.env.example` dengan placeholder.
- Password anggota disimpan terenkripsi AES-256-GCM (`src/lib/crypto.ts`), bukan plaintext.
- Session JWT httpOnly, sameSite=lax, expiry 7 hari.
- Endpoint admin diproteksi `isAdmin()` check; endpoint anggota diproteksi `getMemberOrAdmin()`.

### Changed

- Stack: Next.js 16 App Router + TypeScript 5 + Tailwind CSS 4 + shadcn/ui (New York) + Prisma ORM (SQLite untuk sandbox).
- Routing: SPA client-side view management di route `/` tunggal (constraint sandbox: user hanya bisa lihat `/`).
- Storage: local file adapter untuk sandbox (produksi: Supabase Storage).
- Database: SQLite untuk sandbox (produksi: Neon PostgreSQL, struktur model identik).

### Catatan Environment

Dokumen menyebutkan Neon PostgreSQL + Supabase Storage, namun sandbox hanya mendukung SQLite dan tidak punya kredensial Supabase. Adaptasi dibuat untuk menjaga arsitektur tetap utuh:

1. **Database**: SQLite Prisma client. Struktur model persis ARCHITECTURE.md.
2. **Storage**: Adapter local file storage dengan kontrak interface sama (upload, hapus, signed URL). File di `public/storage`.
3. **Routing**: Seluruh aplikasi di route `/` sebagai SPA. Semua fitur PRD tetap dapat diakses.
4. **AGENTS.md**: Tidak diunggah ke folder `upload/`. Proses Git/PR/Issue mengikuti konvensi standar (branch `feat/...`, commit per kelompok logis).

## [0.1.0] — Initial scaffolding

- Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui ter-setup oleh sandbox.
- Prisma SQLite terkonfigurasi.

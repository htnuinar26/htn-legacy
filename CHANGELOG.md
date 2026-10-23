# Changelog

Semua perubahan penting pada proyek **HTN Legacy** akan didokumentasikan dalam file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/), dan proyek ini mematuhi [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased] - 2026-10-21

<!-- ENTRI-BARU-SISIPKAN-DI-SINI -->

### Fixed - Auth, Receipt, Dashboard, dan Admin (2026-10-22)

- Memisahkan route login Admin, mendukung deteksi akun anggota yang belum terdaftar, dan menyimpan identitas Admin pada session.
- Memperbaiki alur receipt review, generator PNG, delete transaksi, input field, mapping anggota, logout, filter status, dan grafik dashboard.
- Menambahkan nomor rekening pembayaran serta mempertahankan barcode dari settings tanpa mengirim asset kosong ke repository.
- Menambahkan migrasi agar histori receipt REJECTED dapat berulang tanpa mengganggu batas receipt aktif.

### Fixed - Guard Payload Array dan Aset Above-the-fold (2026-10-22)

- Menormalisasi payload array dari endpoint sebelum dipakai oleh view anggota dan Admin agar respons tidak berbentuk object tidak lagi memicu crash `.map`.
- Memprioritaskan pemuatan logo yang tampil pada awal halaman untuk menghindari intervensi lazy-image browser.
- Tidak mengubah status `401` login karena status tersebut tetap merupakan respons autentikasi yang benar untuk kredensial tidak valid.

### Fixed - Top Bar Auth dan Scrollbar Global (2026-10-22)

- Menyatukan top bar autentikasi dengan panel form menggunakan `--bg-base`, sehingga tidak lagi muncul sebagai strip putih terpisah pada dark mode.
- Menggabungkan logo mobile dan toggle tema dalam satu header row dengan jarak vertikal yang lebih proporsional.
- Memperluas styling scrollbar tokenized dari area tertentu menjadi global, dengan thumb tipis yang konsisten pada tema terang dan gelap.
- Mempertahankan pemisah hero/form berupa border vertikal tipis berbasis token pada desktop dan behavior scroll native pada mobile.

### Fixed - UI/UX Autentikasi Dark Mode dan Aksesibilitas (2026-10-22)

- Memperbaiki panel hero autentikasi pada dark mode agar memakai latar netral gelap, dengan emas hanya sebagai aksen border dan kontrol aktif.
- Memindahkan toggle tema ke top bar autentikasi yang konsisten dengan shell utama, tetap menyediakan tiga pilihan tema dan target sentuh minimal 44px.
- Menambahkan focus-visible ring pada tab autentikasi, tombol submit, dan kontrol tema.
- Memperkuat kontras placeholder serta teks sekunder melalui token semantic/component, tanpa menambah hex baru.
- Menyamakan radius tombol submit autentikasi dengan aturan desain 6px dan mempertahankan layout mobile-first pada breakpoint sempit.

### Fixed - Console Log Autentikasi dan Preview Receipt (2026-10-22)

- Menghapus `loading="lazy"` dari thumbnail receipt Admin agar browser tidak menunda gambar setelah preview dimuat.
- Memperjelas kegagalan login akibat konfigurasi `JWT_SECRET` dan error Prisma dengan kategori, endpoint, request ID, serta pesan Bahasa Indonesia yang dapat ditindaklanjuti.
- Client login sekarang tetap membaca response JSON pada status HTTP non-2xx sehingga detail kategori, field, dan request ID tampil di form.
- Konflik registrasi tetap dipertahankan sebagai `409 CONFLICT` sesuai kontrak API dan ditampilkan sebagai error form, bukan dianggap sukses.

### Chore - Lacak Dokumentasi Proyek (2026-10-22)

- Menambahkan `AGENTS.md` serta dokumentasi kanonik `PRD`, `SPEC`, `ARCHITECTURE`, dan `DESIGN` ke pelacakan git.
- Menormalkan tanda baca em-dash pada dokumentasi arsitektur agar seluruh file baru mematuhi aturan encoding repository.
- Artifact lokal skill agent, cache/output Graphify, dan metadata desktop tetap tidak dimasukkan ke repository.

### Fixed - Responsif Mobile dan Aset Icon (2026-10-22)

- Memperbaiki padding, truncation, header, drawer navigasi, dan area konten pada shell Anggota serta Admin agar tetap terbaca pada layar kecil.
- Menyesuaikan header kartu, pencarian, filter, pemilih file, aksi laporan, dan formulir barcode agar dapat membungkus secara aman pada breakpoint mobile.
- Menambahkan aturan ukuran ringkasan dan nilai nominal untuk mencegah teks meluber pada lebar layar sempit.
- Menyertakan `public/icon.svg` dalam pelacakan git untuk menghilangkan 404 aset icon pada deployment.

### Unreleased Update

### Fixed - Audit 2026-10-21 (32 temuan)

Audit menyeluruh terhadap `PRD.md`, `SPEC.md`, `ARCHITECTURE.md`, `DESIGN.md`, seluruh Route Handler, view, dan komponen. Berikut perbaikan yang masuk ke branch `fix/production-config`, `fix/api-authorization`, `fix/ui-input-and-views`, dan `docs/sync-and-debt`.

**Kritis**

- **Prisma dipindahkan dari SQLite ke PostgreSQL Neon.** `prisma/schema.prisma` masih memakai `provider = "sqlite"` sementara environment menunjuk Neon, sehingga setiap operasi database gagal dengan `PrismaClientInitializationError` dan seluruh endpoint mengembalikan HTTP 500. Tiga migration baru memetakan kolom schema legacy ke schema baru memakai `ALTER TABLE ... RENAME COLUMN`, jadi data anggota, receipt, settings, dan audit log yang sudah ada di Neon tetap utuh.
- **`GET /api/transaksi` sekarang wajib session.** Sebelumnya mengembalikan seluruh transaksi kas, saldo, dan nama anggota ke siapa pun tanpa login.
- **`GET /api/anggota` sekarang wajib session.** Previously direktori anggota lengkap terbuka untuk tamu.
- **`GET /api/settings` sekarang wajib session.** Nomor WhatsApp pengurus, nominal iuran, dan deadline tidak lagi bocor.

**Tinggi**

- **Penolakan receipt kedua pada periode yang sama mengembalikan 409 `CONFLICT`**, bukan HTTP 500 generik. Unique constraint `[anggotaId, periodeBulan, status]` membuat jalur `reject` menabrak P2002 dan jatuh ke generic error handler. Alur kirim-ulang anggota kini bisa dipakai berulang kali.
- **Persetujuan receipt anggota tidak lagi gagal dengan 400.** Client mengirim `nominal: null` yang ditolak Zod dengan pesan Inggris. Sekarang `null` diperlakukan sebagai "tidak diisi" dan server memakai fallback ke nominal receipt lalu nominal iuran.
- **Halaman barcode anggota dan Admin tidak lagi rusak.** `barcodePath` adalah path objek storage, bukan URL. Sekarang dikirim `barcodeUrl` siap pakai. Diverifikasi: `GET /storage/assets/barcode-*.png` mengembalikan 200 `image/png`, sedangkan path mentah menghasilkan URL tidak valid.
- **Receipt manual bisa di-preview.** Response generator menyertakan `fileUrl`, dan tombol "Lihat" memakai URL itu tanpa `preventDefault`.
- **Gate validasi dipulihkan.** `next.config.ts` tidak lagi memakai `ignoreBuildErrors: true`, `tsc --noEmit` kembali hijau setelah scaffold `examples/websocket` dihapus, dan script `build` memakai `scripts/copy-standalone.mjs` sehingga tidak gagal di Windows.
- **File receipt yang berisi data anggota nyata dikeluarkan dari pelacakan git**, dan `public/storage` masuk `.gitignore`.

**Menengah**

- Pesan validasi Zod sekarang berbahasa Indonesia lewat `z.config(z.locales.id())`.
- `RupiahInput` memulihkan posisi caret ke digit yang sama, sehingga nominal bisa diedit di tengah nilai terformat, bukan selalu melompat ke ujung. Batas maksimum 2.000.000.000 ditambahkan di client dan server, mengikuti kapasitas kolom `Int` di PostgreSQL.
- Dropdown periode di halaman Kas Admin dan Anggota tidak lagi tampil kosong, dan mengikuti `settings.periodeBerjalan` dari server.
- `catatan` anggota akhirnya disimpan saat menambah anggota. Sebelumnya Zod membuangnya diam-diam.
- `createdAt` ikut dikembalikan pada `PATCH /api/anggota/[id]`, jadi tanggal bergabung tidak hilang setelah anggota menyimpan profil.
- Nama anggota yang duplikat ditolak, dan pencarian nama tahan huruf besar-kecil.
- Menghapus anggota juga menghapus file receipt-nya di storage.
- `PATCH /api/settings` menulis audit log `UPDATE_SETTINGS` dan tidak lagi menghapus barcode dari tampilan.
- Upload barcode dibatasi 2 MB, menolak SVG, dan punya state pending.
- Halaman Audit Log punya paginasi dan tombol hapus transaksi sesuai `ARCHITECTURE.md`.
- Export CSV laporan menyertakan receipt approved, meng-escape tanda kutip, dan unduhannya andal di semua browser.
- Parser CSV import menangani tanda kutip, dan alasan kegagalan per baris ditampilkan.
- Periode dan tanggal dihitung pada zona waktu organisasi (`Asia/Bangkok`), bukan waktu lokal browser.
- Nomor WhatsApp lokal dinormalisasi ke format internasional sebelum link `wa.me` dibuat.
- Ikon tren pemasukan dan pengeluaran di Beranda anggota dikembalikan ke arah yang benar.
- Label input terasosiasi dengan `id` dan `htmlFor`, pesan error terhubung lewat `aria-describedby`, dan semua target sentuh diperbesar ke minimal 44x44px.
- Drawer navigasi memindahkan fokus ke dalam drawer, menahan Tab, menutup dengan `Escape`, mengunci scroll, dan mengembalikan fokus ke tombol pemicu.
- Tombol keluar di top bar sekarang punya `aria-label` dan tidak lagi mengirim request logout ganda.

**Perbaikan teknis**

- `.env.example` memakai path database sandbox yang benar dan mencantumkan seluruh environment variable yang dipakai aplikasi.
- `reactStrictMode` diaktifkan.
- Em-dash (U+2014) dihapus dari seluruh file yang disentuh, sesuai aturan `AGENTS.md`.

---

### Ringkasan

Pembangunan ulang total HTN Legacy dari nol. Dua bug produksi yang menjadi alasan rewrite dicegah secara struktural: (1) field nominal uang yang menolak nilai wajar seperti `10000`, dan (2) endpoint `/api/admin/struk-generator` yang mengembalikan HTTP 500 tanpa detail.

### Added - Foundation

- **Design system tiga lapis** (primitive → semantic → component) di `src/app/globals.css`. Token warna diturunkan dari logo HTN Legacy (maroon `#6b1420` + emas `#9c7a2f`). Dukungan dark mode via `next-themes`.
- **Splash screen** (`src/components/splash-provider.tsx`) sesuai DESIGN.md: animasi logo + tagline "Constitutio et Iustitia" selama ~1.5s saat load awal.
- **Komponen bersama wajib**:
  - `RupiahInput` (`src/components/ui/rupiah-input.tsx`) - field nominal uang dengan `type="text" inputMode="numeric"`, **tanpa** `step`/`pattern` native. State integer polos, tampilan terformat pemisah ribuan. Mencegah bug #1.
  - Helper `api-response` (`src/lib/api-response.ts`) - kontrak response terklasifikasi (`AUTH_ERROR`, `VALIDATION_ERROR`, `CONFLICT`, `NOT_FOUND`, `UNEXPECTED`) dengan `requestId` (UUID) untuk setiap error. Mencegah bug #2.
- **Auth & session** (`src/lib/auth.ts`, `src/lib/crypto.ts`): JWT httpOnly cookie untuk sesi anggota dan admin. Password anggota dienkripsi AES-256-GCM. Password admin via env `ADMIN_PASSWORD`.
- **Storage adapter** (`src/lib/storage.ts`): interface kontrak (upload/hapus/signed URL) dengan implementasi local file storage untuk sandbox. Produksi tinggal ganti ke Supabase Storage tanpa mengubah pemanggil.
- **Prisma schema** (`prisma/schema.prisma`): model `Anggota`, `Struk`, `Transaksi`, `Settings`, `AuditLog` persis sesuai ARCHITECTURE.md. SQLite untuk sandbox; struktur siap Neon PostgreSQL.

### Added - Fitur Anggota

- **Beranda** (`beranda-view.tsx`): sambutan, info iuran periode berjalan, status pembayaran, 5 struk terbaru, transaksi terbaru.
- **Struk Iuran** (`struk-view.tsx`): upload receipt (gambar), preview, submit. Pencatatan otomatis periode berjalan.
- **Kas Organisasi** (`kas-view.tsx`): read-only daftar transaksi periode berjalan untuk anggota.
- **Daftar Anggota** (`daftar-view.tsx`): direktori anggota (nama, NIM, status bayar).
- **Barcode Pembayaran** (`barcode-view.tsx`): render barcode dari settings organisasi + instruksi pembayaran via `wa.me` manual.
- **Profil Saya** (`profil-view.tsx`): kelola data pribadi, ganti password, logout.

### Added - Fitur Admin/Bendahara

- **Dashboard** (`dashboard-view.tsx`): total anggota, breakdown lunas/belum/tertunggak, saldo total, pemasukan/pengeluaran periode, jumlah struk pending.
- **Manajemen Anggota** (`anggota-view.tsx`): CRUD anggota, reset password, hapus, filter status.
- **Review Struk** (`struk-review-view.tsx`): list struk PENDING, approve/reject dengan catatan. Approve membuat transaksi MASUK atomik dan update status anggota.
- **Generator Struk Manual** (`struk-generator-view.tsx`): form pembuatan receipt manual. Hanya tampilkan anggota tanpa receipt aktif. Submit → struk APPROVED + transaksi MASUK + status LUNAS dalam satu transaksi DB (isolation Serializable).
- **Kas Organisasi** (`kas-view.tsx` admin): tambah transaksi MASUK/KELUAR dengan `RupiahInput`, hapus transaksi (dengan audit log), filter periode.
- **Import Data** (`import-view.tsx`): bulk import anggota via CSV/JSON.
- **Audit Log** (`audit-log-view.tsx`): jejak perubahan entitas (anggota, struk, transaksi, settings) dengan aktor, aksi, timestamp.
- **Laporan** (`laporan-view.tsx`): rekap per periode, export.
- **Settings** (`settings-view.tsx`): konfigurasi periode berjalan, nominal iuran, deadline, nama organisasi, barcode, ganti password admin.

### Added - API Endpoints

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

### Added - Scripts

- `scripts/regression-test.sh` - regression test lengkap untuk dua bug produksi (login admin → POST struk-generator dengan nominal 10000 → verifikasi status anggota LUNAS → verifikasi transaksi MASUK → test duplikat 409 → test nominal invalid 400).
- `scripts/ui-verify.sh` - verifikasi UI via Agent Browser (semua view admin + member).
- `.zscripts/watchdog-dev.sh` - watchdog untuk restart dev server di sandbox yang tidak stabil.

### Fixed - Regression Prevention

- **Bug #1 (nominal input)**: `RupiahInput` menggunakan `type="text" inputMode="numeric"` tanpa `step`/`pattern`. Ditemukan saat verifikasi bahwa `pattern="[0-9]*"` awalnya ikut menyebabkan native validation error pada nilai terformat `"10.000"` (mengandung titik). Pattern dihapus dari `rupiah-input.tsx` dan `settings-view.tsx`. Filter `onChange` sudah membuang non-digit; validasi final di server via Zod.
- **Bug #2 (struk-generator 500)**: endpoint mengembalikan response terklasifikasi untuk semua path: sukses (200), validasi (400), konflik (409), auth (403), unexpected (500 dengan `requestId`). Tidak ada 500 tanpa detail.

### Fixed - UI

- Mobile horizontal overflow 1px pada viewport 375px: ditambahkan `overflow-x: hidden` pada `html` dan `body` di `globals.css`.

### Added - Dark/Light Mode Enhancement

- **ThemeToggle di login page**: sebelumnya toggle tema (Terang/Gelap/Sistem) hanya ada di admin shell dan member shell. Sekarang tersedia di pojok kanan atas panel form login, agar user bisa memilih tema sebelum masuk.
- **Dark mode terverifikasi penuh** via Agent Browser: login page, 9 view admin, 6 view anggota, mobile 375px - semua render dengan benar di dark mode. CSS variables tiga lapis (primitive → semantic → component) memastikan konsistensi warna di kedua mode.
- **Script verifikasi dark mode** (`scripts/dark-mode-verify.sh`, `scripts/dark-mode-final.sh`): test end-to-end dark/light toggle di semua shell dan view.

### Fixed - Bug

- **ENCRYPTION_KEY tidak dikonfigurasi**: signup anggota gagal dengan `INTERNAL_ERROR` "ENCRYPTION_KEY tidak dikonfigurasi dengan benar." karena `crypto.ts` butuh 64 hex chars yang belum ada di `.env`. Diperbaiki: generate key dev, tambahkan ke `.env.example` dengan dokumentasi (`openssl rand -hex 32`).

### Security

- **Menghapus `.env` dari git tracking** - file berisi `JWT_SECRET`, `ADMIN_PASSWORD`, `DATABASE_URL` sebelumnya ter-commit. Dihapus via `git rm --cached .env` (file lokal tetap ada). Dibuat `.env.example` dengan placeholder.
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

## [0.1.0] - Initial scaffolding

- Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui ter-setup oleh sandbox.
- Prisma SQLite terkonfigurasi.

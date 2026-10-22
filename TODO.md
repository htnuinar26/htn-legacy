# TODO - HTN Legacy

Ruang kerja tunggal untuk pekerjaan yang direncanakan. Struktur file ini punya tiga
bagian tetap, berurutan: **Active plans**, **Deferred work**, **Known Issues**.

Status terakhir: 2026-10-21 (hasil audit menyeluruh terhadap `docs/`, seluruh
`src/`, `prisma/schema.prisma`, dan skrip build/test).

---

## Active plans

### Revisi 2026-10-22 - `fix/mobile-responsive-and-log-assets`

Sumber: `logs/console.log` dan `logs/vercel.log`, serta audit responsive pada
shell, drawer, view, modal, tabel, dan aset publik.

- [ ] Pastikan aset `/icon.svg` ikut ter-track dan tidak lagi menghasilkan 404.
- [ ] Perbaiki layout mobile pada shell Anggota/Admin, top bar, drawer, dan konten utama.
- [ ] Perbaiki overflow tabel, card, form, modal, chart, dan tombol pada breakpoint 360px.
- [ ] Verifikasi ulang dengan typecheck, lint, build, regression scan aset, dan pemeriksaan responsive statis.

### Audit 2026-10-22 - `fix/full-codebase-regression-audit`

Sumber: audit `graphify-out/`, `docs/`, `logs/`, dan seluruh codebase. Cakupan
meliputi branding, storage, auth, kontrak API, input nominal, dokumentasi, dan
verifikasi build.

- [x] Ganti seluruh referensi logo yang sudah dihapus dengan aset logo aktif di `public/`.
- [x] Migrasikan adapter storage ke Supabase Storage dengan signed URL dan hapus fallback lokal production.
- [x] Tolak konfigurasi JWT production yang memakai secret fallback.
- [x] Pastikan seluruh Route Handler memakai kontrak `apiSuccess()`/`apiError()` dan logging memiliki endpoint serta requestId.
- [x] Sinkronkan `RupiahInput` dengan kontrak nominal dan tambahkan regresi untuk nominal wajar.
- [x] Sinkronkan dokumentasi aktif dan hapus kontradiksi dokumentasi yang ditemukan.
- [x] Jalankan verifikasi typecheck, lint, build, pencarian regresi, dan `git diff --check`.

### PR #1 - `fix/production-config` - Konfigurasi produksi dan gate validasi

Sumber: audit 2026-10-21, temuan CRITICAL #1, HIGH #9, #10, #11, #12, dan utang
teknis konfigurasi.

- [x] Ubah `prisma/schema.prisma` dari `provider = "sqlite"` ke `provider = "postgresql"`
      (lingkungan `.env` sudah menunjuk Neon PostgreSQL, sehingga seluruh endpoint DB
      kini gagal dengan `PrismaClientInitializationError`).
- [x] Tambahkan migration Prisma untuk PostgreSQL: baseline schema legacy Neon
      (ditandai sudah diterapkan tanpa dijalankan ulang) plus migration transformasi
      yang memetakan kolom lama dengan rename sehingga data tetap utuh.
- [x] Hapus `typescript.ignoreBuildErrors: true` dari `next.config.ts` supaya build
      benar-benar gagal bila ada error tipe.
- [x] Aktifkan `reactStrictMode: true` di `next.config.ts`.
- [x] Exclude `examples` di `tsconfig.json` supaya `bunx tsc --noEmit` kembali hijau.
- [x] Hapus sisa scaffold `examples/websocket/frontend.tsx` dan `examples/websocket/server.ts`.
- [x] Ganti script `build` di `package.json` agar lintas platform (hapus `cp -r`).
- [x] Tambah `scripts/copy-standalone.mjs` sesuai rujukan `ARCHITECTURE.md`.
- [x] Tambahkan `public/storage` ke `.gitignore` dan keluarkan file receipt yang
      sudah telekomit dari index git.
- [x] Perbaiki `.env.example`: `DATABASE_URL` sandbox yang salah path, plus env var
      yang belum tercantum (`NEXT_PUBLIC_INSTANCE_NAME`, `SUPABASE_SECRET_KEY`,
      `SUPABASE_STORAGE_BUCKET`, `DEBUG_MW`).

### PR #2 - `fix/api-authorization` - Otorisasi endpoint dan klasifikasi error API

Sumber: audit 2026-10-21, temuan CRITICAL #2, #3, #4, HIGH #5, #6, dan MEDIUM
#20, #22, #23, #24, dan beberapa gugusan API.

- [x] `GET /api/transaksi`: wajib session anggota atau Admin (kini 200 tanpa login).
- [x] `GET /api/anggota`: wajib session anggota atau Admin (kini 200 tanpa login).
- [x] `GET /api/settings`: wajib session anggota atau Admin (kini 200 tanpa login).
- [x] `POST /api/struk/[id]/verify` jalur reject: bungkus klasifikasi error Prisma
      agar P2002 jadi `CONFLICT` dengan pesan spesifik, bukan 500 generik.
- [x] `POST /api/struk/[id]/verify`: terima `nominal` null secara eksplisit agar
      fallback `struk.nominal ?? settings.nominalIuran` terpakai.
- [x] `POST /api/struk/[id]/verify`: ikutkan `alasanReject` pada audit log reject.
- [x] `GET /api/laporan`: hitung status lunas/belum/tertunggak sesuai periode terpilih.
- [x] `GET /api/admin/audit-log`: validasi `limit` dan `offset` agar tidak negatif.
- [x] `POST /api/struk/upload`: kunci rate limit diubah dari `anggotaId` ke
      kombinasi IP dan anggota supaya tidak bisa dipakai memblokir anggota lain.
- [x] `POST /api/auth/login`: pencocokan nama tahan huruf besar-kecil.
- [x] `POST /api/auth/signup`: cek duplikat nama tahan huruf besar-kecil.
- [x] `POST /api/settings/barcode`: batas ukuran file, tolak SVG, kembalikan URL.
- [x] `PATCH /api/settings`: tambahkan audit log `UPDATE_SETTINGS`.
- [x] `PATCH /api/anggota/[id]`: cek duplikat nama dan kembalikan `createdAt`.
- [x] `POST /api/anggota`: simpan field `catatan`.
- [x] `POST /api/admin/struk-generator`: kembalikan URL file struk manual.
- [x] `DELETE /api/anggota/[id]`: bersihkan file receipt yang terlantar di storage.
- [x] `GET /api/settings` dan `POST /api/settings/barcode`: kembalikan `barcodeUrl`
      hasil `getSignedUrl`, bukan path objek mentah.
- [x] `src/lib/api-response.ts`: aktifkan locale Indonesia untuk pesan Zod.
- [x] `src/lib/auth.ts`: tambah guard `requireMemberOrAdmin` untuk route bersama.
- [x] `src/lib/storage.ts`: perbaiki ekstensi file dari MIME type (`svg+xml` jadi `svg`).

### PR #3 - `fix/ui-input-and-views` - Input nominal, periode, dan tampilan rusak

Sumber: audit 2026-10-21, temuan HIGH #7, #8, MEDIUM #13 sampai #32, dan LOW
terkait em-dash, target sentuh, dan fokus drawer.

- [x] `src/components/ui/rupiah-input.tsx`: pulihkan posisi caret supaya nominal bisa
      diedit di tengah nilai terformat, dan batasi nilai maksimum sesuai kolom database.
- [x] `src/components/views/admin/kas-view.tsx`: dropdown periode tidak pernah kosong,
      tampilkan error per-field `periodeBulan`, cegah double submit, perbesar target sentuh.
- [x] `src/components/views/member/kas-view.tsx`: dropdown periode tidak pernah kosong,
      reset state error setiap reload.
- [x] `src/components/views/admin/struk-review-view.tsx`: kirim `nominal` hanya bila diisi.
- [x] `src/components/views/admin/struk-generator-view.tsx`: pakai URL file dari server,
      validasi client memakai Zod, buang em-dash.
- [x] `src/components/views/admin/settings-view.tsx`: pakai `barcodeUrl`, pertahankan
      `barcodePath` setelah simpan, tambahkan state pending upload, buang em-dash.
- [x] `src/components/views/admin/anggota-view.tsx`: asosiasi label, cegah double
      submit, perbaiki teks konfirmasi hapus.
- [x] `src/components/views/admin/import-view.tsx`: parser CSV handle tanda kutip,
      tampilkan pesan error per baris, perbaiki komentar urutan kolom.
- [x] `src/components/views/admin/laporan-view.tsx`: export CSV sertakan receipt
      approved, escape tanda kutip, unduhan andal.
- [x] `src/components/views/admin/audit-log-view.tsx`: tambah paginasi dan aksi
      hapus transaksi sesuai `ARCHITECTURE.md`.
- [x] `src/components/views/admin/dashboard-view.tsx`: buang em-dash.
- [x] `src/components/views/member/barcode-view.tsx`: pakai `barcodeUrl`, normalisasi
      nomor WhatsApp ke format internasional.
- [x] `src/components/views/member/profil-view.tsx`: asosiasi label, tampilkan error
      per-field password, pertahankan `createdAt`, gunakan label status.
- [x] `src/components/views/member/beranda-view.tsx`: Tukar ikon tren pemasukan/pengeluaran.
- [x] `src/components/views/member/struk-view.tsx`: tampilkan error per-field periode.
- [x] `src/components/views/member/daftar-view.tsx`: bedakan state kosong dan hasil pencarian kosong.
- [x] `src/components/views/login-view.tsx`: asosiasi label, reset error saat ganti mode,
      kembalikan state loading pada jalur sukses.
- [x] `src/components/shells/admin-shell.tsx` dan `src/components/shells/member-shell.tsx`:
      target sentuh 44px, focus trap dan Escape pada drawer, cek hasil logout.
- [x] `src/components/theme-toggle.tsx`: target sentuh 44px.
- [x] `src/lib/format.ts`: samakan perhitungan periode dengan `Asia/Bangkok`, perbaiki
      `buildWaLink` agar nomor lokal dinormalisasi.
- [x] `src/hooks/use-modal-focus.ts`: trap fokus, tombol Escape, dan kunci scroll
      untuk drawer dan dialog.
- [x] `src/components/blocks/ui.tsx`: pertahankan baris baru pada pesan error multi-baris.
- [x] Batas maksimum nominal ditambahkan di server pada `POST /api/transaksi`,
      `PATCH /api/settings`, `POST /api/admin/struk-generator`, dan `POST /api/struk/[id]/verify`.
- [x] Kategori `RATE_LIMIT_ERROR` tidak dipakai. `ARCHITECTURE.md` menetapkan tujuh
      kategori yang eksklusif, sehingga rate limit memakai `VALIDATION_ERROR` dengan
      status HTTP 429 yang eksplisit.

### PR #4 - `docs/sync-and-debt` - Sinkronisasi dokumentasi dan utang teknis

Sumber: audit 2026-10-21, LOW dan temuan dokumentasi.

- [x] Pindahkan `PRD.md`, `SPEC.md`, `ARCHITECTURE.md`, `DESIGN.md` ke root repository
      sesuai `AGENTS.md` bagian Documentation Rules, dan hapus duplikat di `upload/`.
- [x] Perbarui seluruh rujukan dokumen di `TODO.md`, `CHANGELOG.md`,
      `docs/review/CODE_REVIEW.md`, dan `worklog.md`.
- [x] Sinkronkan `SPEC.md` soal atribut `pattern` pada `RupiahInput`, batas maksimum
      nominal, kontrak URL storage, dan pemetaan kategori rate limit.
- [x] Perbarui `CHANGELOG.md` dengan entri versi baru.
- [x] Perbarui `worklog.md` dan `docs/review/CODE_REVIEW.md`.
- [x] Normalisasi em-dash di seluruh file yang disentuh.
- [x] Catat rotasi secret dan pembersihan git history sebagai Known Issue.

---

## Deferred work

Pekerjaan yang sudah dibahas dan disepakati tetapi **belum** boleh mulai pada
rentang PR di atas.

- [x] Implementasi adapter Supabase Storage di `src/lib/storage.ts`, termasuk signed URL,
  penghapusan object, dan penolakan fallback lokal pada production.
- [ ] Pembersihan git history untuk secret lama (`JWT_SECRET`, `ENCRYPTION_KEY`,
  `ADMIN_PASSWORD`) di commit `dfa0935` dan `88d6f99`, lalu rotasi nilainya di Neon
  dan Supabase. Butuh keputusan pemilik proyek karena merusak history.
- [ ] Rate limiting pada endpoint auth (`/api/auth/login`, `/api/auth/signup`,
  `/api/auth/admin-login`). Wajib untuk produksi, belum ada di audit ini.
- [ ] Proteksi CSRF untuk endpoint yang mengubah state. Saat ini mengandalkan
  `sameSite=lax`.
- [ ] Script seed data anggota di `prisma/seed.ts`. Script ada di `scripts/seed.ts`
  tetapi belum dipakai sebagai seed Prisma.
- [ ] Ekspor laporan ke PDF dan Excel.
- [ ] PWA support (manifest dan service worker).
- [ ] Loading skeleton dan empty state illustration pada view yang mengambil data.
- [ ] Pintasan keyboard untuk navigasi antar view Admin.

---

## Known Issues

- Data receipt yang terlanjur tidak konsisten di database (misal anggota yang punya
  receipt `REJECTED` ganda pada periode sama, atau anggota tanpa receipt aktif
  periode berjalan) belum diperbaiki. Keputusan pemilik proyek: perbaiki kode dulu,
  data menyusul lewat script terpisah dengan backup penuh.
- **Password anggota versi lama tidak bisa dipakai di kode baru.** Dua anggota yang
  ada di Neon memakai format `iv:tag:ciphertext` heksadesimal dengan IV 16 byte,
  sedangkan `src/lib/crypto.ts` memakai base64 `iv(12 byte) || tag || ciphertext`.
  Keduanya tidak kompatibel. Admin perlu reset password kedua anggota tersebut.
- Roti secret: `JWT_SECRET`, `ENCRYPTION_KEY`, dan `ADMIN_PASSWORD` versi lama masih
  ada di history git commit `dfa0935` dan `88d6f99`. Wajib dirotasi sebelum deploy
  produksi, lalu history dibersihkan.
- Aplikasi masih memakai routing SPA di route `/` (`src/lib/nav-store.ts`). URL view
  tidak bisa dibagikan dan tidak ada route `App Router` per halaman seperti daftar
  di `ARCHITECTURE.md`.
- Adapter storage lokal menulis ke `public/storage`, yang ikut terbawa ke build
  standalone. Pada produksi dengan Supabase, berkas receipt tidak boleh diletakkan
  di direktori publik.
- `next.config.ts` masih memakai `output: "standalone"` tanpa konfigurasi rewrite
  untuk route API, jadi deployment standalone perlu diverifikasi ulang.
- Tidak ada unit test framework. Yang ada hanya skrip shell `scripts/regression-test.sh`
  dan `scripts/ui-verify.sh` yang bergantung pada Agent Browser.
- Lima file masih mengandung em-dash (U+2014) karena punya perubahan lokal yang
  belum di-commit dan di luar cakupan 32 temuan: `.zscripts/build.sh`,
  `scripts/dark-mode-verify.sh`, `scripts/regression-test.sh`, `scripts/ui-verify.sh`,
  dan `start-dev.sh`. File tersebut perlu dibersihkan manual atau di-commit lebih dulu.
- Folder `.opencode/.skills/` juga masih mengandung em-dash, tetapi isinya adalah
  definisi skill dari luar repository dan tidak di-commit ke git.

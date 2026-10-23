# Code Review - HTN Legacy

**Tanggal**: 2026-10-22
**Reviewer**: Agent (self-review)
**Scope**: PR #22 - commit aset ikon, tambahkan animasi smooth, dan perbaiki aksesibilitas
**Dokumen acuan**: `PRD.md`, `ARCHITECTURE.md`, `SPEC.md`, `DESIGN.md` (root repository)

---

## PR #22

**PR:** 22
**Repo:** htnuinar26/htn-legacy
**Status:** [x] sudah dicopas

```
Ringkasan perubahan PR #22:

1. Aset ikon
   - `public/favicon.ico` dan `public/assets/logo.png` kini ter-track di git.
   - Sebelumnya untracked, sehingga tidak ikut ter-deploy ke Railway dan browser
     fallback ke ikon bawaan platform (chat.z.ai).
   - `src/app/layout.tsx` metadata.icons sekarang memakai `/favicon.ico` (utama)
     dan `/assets/logo.png` (apple-touch-icon).

2. Animasi smooth
   - `src/app/globals.css`: aturan transisi global pada `button`, `[role="button"]`,
     `input`, `select`, `textarea` (150ms), `.card-editorial` (200ms),
     `.input-editorial` (150ms). Sebelumnya hanya `.sidebar-item` yang punya transisi.
   - Drawer Admin dan Anggota: backdrop `animate-in fade-in-0 duration-200`,
     panel `animate-in slide-in-from-left duration-300`.
   - Modal dialog (anggota, kas, review struk): backdrop `animate-in fade-in-0
     duration-200`, konten `animate-in fade-in-0 zoom-in-95 duration-200`.

3. Aksesibilitas
   - Label di `login-view.tsx`, `profil-view.tsx`, dan `anggota-view.tsx` sekarang
     terasosiasi dengan `id` dan `htmlFor`. `aria-describedby` menunjuk ke pesan
     error per-field.
   - Semua target sentuh diperbesar ke minimal 44x44px.
   - Drawer memindahkan fokus, menahan Tab, menutup dengan Escape, mengunci scroll.
   - Tombol keluar di top bar punya `aria-label`.

Potensi isu yang perlu diperhatikan:

- `public/favicon.ico` berukuran 432 KB dan `public/assets/logo.png` 2 MB. Ukuran
  ini besar untuk aset statis dan akan memperbesar bundle deployment. Pertimbangkan
  kompresi di masa depan, tapi tidak menghalangi merge.
- Aturan transisi global pada `button` memakai `transition: ... 150ms ease` untuk
  semua properti. Ini bisa menimbulkan transisi tidak diinginkan pada elemen yang
  memang tidak perlu (misalnya tombol dengan `transform: scale(0.98)` pada active
  state). Pantau apakah ada flicker pada tombol submit.
- `animate-in` dari `tailwindcss-animate` (di-import di globals.css) bergantung pada
  `@keyframes` yang didefinisikan oleh library. Pastikan `tw-animate-css` tetap
  di-import di `globals.css` baris 2. Jika library dihapus, semua animasi modal
  dan drawer akan hilang tanpa error.
- Drawer memakai `animate-in slide-in-from-left` tapi tidak punya `animate-out`.
  Saat `drawerOpen` menjadi `false`, komponen langsung unmount, sehingga tidak ada
  animasi keluar. Ini konsisten dengan pola yang sudah ada (conditional rendering),
  tapi UX-nya bisa ditingkatkan dengan state "closing" di masa depan.
- `useModalFocus` memakai `useEffect` tanpa dependency array untuk memperbarui
  `onCloseRef`. Ini berjalan setiap render, yang sedikit tidak efisien tapi aman.
- `login-view.tsx` `Field` component sekarang menerima `id` sebagai prop wajib.
  Pastikan semua pemanggilan `Field` sudah menyertakan `id`. Sudah diverifikasi
  tsc lulus, jadi aman.
- `src/components/views/admin/struk-review-view.tsx` menambahkan `useEffect` baru
  untuk fetch nominal iuran. Ini menambah satu request tambahan saat dialog
  dibuka. Dampaknya kecil tapi perlu dicatat.
- `src/components/views/member/kas-view.tsx` dan `admin/kas-view.tsx` sekarang
  memanggil `fetch` ulang ketika periode berubah. Sebelumnya hanya sekali. Ini
  bisa menyebabkan dua request pada load pertama (periode client lalu periode server).
  Dampaknya kecil tapi perlu dipantau.

Catatan untuk `src/app/globals.css`:
- Aturan transisi global pada `button` bisa menimpa transisi spesifik yang sudah
  ada di komponen (misalnya `.sidebar-item` yang punya `transition: background-color
  150ms ease`). Karena spesifisitas CSS, aturan `@layer base` memiliki prioritas
  lebih rendah dari `@layer components`, jadi `.sidebar-item` tetap menang. Ini
  sudah diverifikasi dengan `bun run build` lulus.
- `@media (prefers-reduced-motion: reduce)` di akhir file men-set
  `transition-duration: 0.01ms !important` untuk semua elemen, yang akan
  menonaktifkan transisi global juga. Ini konsisten dengan `DESIGN.md`.

Catatan untuk `docs/review/CODE_REVIEW.md`:
- File ini sendiri dimodifikasi oleh pemilik proyek setelah PR #20 (menandai
  "[x] sudah di copas"). Isi review sebelumnya diganti dengan review PR #22.
- Review ini mencakup semua file yang berubah di PR #22, termasuk aset binary
  (`favicon.ico`, `logo.png`) dan dokumen (tidak ada dokumen yang berubah di PR ini).
```

---

---

## PR #25

**PR:** 25
**Repo:** htnuinar26/htn-legacy
**Status:** [x] sudah dicopas

```
Ringkasan review PR #25:

- `src/lib/storage.ts` sekarang memakai Supabase Storage dan signed URL pada production. Pastikan deployment mengisi `SUPABASE_URL`, secret server-only, dan bucket yang benar; fallback lokal hanya aman untuk development.
- `src/lib/auth.ts` menolak JWT secret kosong atau terlalu pendek. Ini aman untuk production, tetapi environment deployment lama akan gagal login sampai secret diperbarui.
- Referensi logo lama sudah diganti ke `/icon.svg`; aset tersebut harus tetap tersedia di `public/` saat deployment.
- `apiUnexpected()` kini menerima endpoint dan helper log menyimpan endpoint, requestId, serta payload opsional. Pemanggil baru harus terus menghindari payload sensitif seperti password.
- `RupiahInput` memakai `pattern="[0-9]*"` dan form nominal memakai `noValidate`, sehingga separator ribuan tidak ditolak browser sementara validasi server tetap menjadi sumber kebenaran.
- Approval, rejection, dan receipt generator mencatat audit dalam transaksi database yang sama, sehingga kegagalan audit tidak meninggalkan state receipt parsial.
- Validasi typecheck, lint, build, regression scan, dan `git diff --check` telah lulus.
```

**Status**: [ ] belum dicopas

---

## PR baru - Responsif Mobile dan Aset Icon

**PR:** 27
**Repo:** htnuinar26/htn-legacy
**Status:** [ ] belum dicopas

```text
Ringkasan review perubahan responsif mobile dan aset icon:

- `public/icon.svg` kini ikut ter-track sehingga referensi `/icon.svg` tidak lagi menghasilkan 404. Ukuran aset relatif besar, jadi deployment perlu tetap mengikutsertakan folder `public/` dalam proses build standalone.
- `src/components/shells/admin-shell.tsx` dan `src/components/shells/member-shell.tsx` menambahkan batas lebar minimum, truncation, padding bertingkat, dan pencegahan overflow horizontal. Perlu regresi visual pada nama instance yang sangat panjang.
- `src/components/blocks/ui.tsx`, `src/app/globals.css`, dan view Admin/Anggota menyesuaikan wrapping serta ukuran ringkasan untuk mobile. Tabel tetap menggunakan scroll lokal, sehingga perilaku sentuh perlu diperiksa pada perangkat nyata.
- `CHANGELOG.md`, `TODO.md`, dan `worklog.md` sudah mencatat cakupan dan hasil validasi; status TODO ditandai selesai setelah typecheck, lint, build, scan aset, dan pemeriksaan responsive statis lulus.
- Tidak ditemukan isu blocker pada review statis. Risiko residual adalah perbedaan rendering breakpoint dan overflow yang hanya muncul pada data sangat panjang atau perangkat tertentu.
```

---

## PR baru - Pelacakan Dokumentasi Proyek

**PR:** 29
**Repo:** htnuinar26/htn-legacy
**Status:** [ ] belum dicopas

```text
Ringkasan review perubahan pelacakan dokumentasi proyek:

- `AGENTS.md` dan empat dokumen kanonik di `docs/` kini menjadi bagian dari repository sehingga instruksi operasional dan spesifikasi dapat direview bersama codebase.
- `docs/ARCHITECTURE.md` dinormalisasi dari em-dash ke tanda hubung biasa untuk mematuhi aturan encoding repository.
- `TODO.md`, `CHANGELOG.md`, dan `worklog.md` mencatat rencana, dampak, dan validasi perubahan.
- Artifact lokal `.agents/`, `.opencode/`, `graphify-out/`, dan `desktop.ini` sengaja tidak dimasukkan karena bukan sumber proyek yang layak dilacak.
- Typecheck, lint, build, scan encoding, dan `git diff --check` telah lulus. Tidak ada migration database atau perubahan environment variable.
```

---

## PR baru - Perbaikan Console Log Autentikasi

**PR:** 31
**Repo:** htnuinar26/htn-legacy
**Status:** [ ] belum dicopas

```text
Ringkasan review perubahan console log autentikasi:

- `src/app/api/auth/login/route.ts` sekarang mengklasifikasikan error konfigurasi JWT sebagai `INTERNAL_ERROR` dan error Prisma sebagai `DATABASE_ERROR`/`CONFLICT`, dengan endpoint dan cause untuk server log.
- `src/components/views/login-view.tsx` tetap memproses response JSON pada status non-2xx, sehingga pesan kategori, field, dan request ID dapat ditampilkan kepada pengguna.
- `src/components/views/admin/struk-review-view.tsx` tidak lagi menunda thumbnail receipt dengan `loading="lazy"`, sehingga intervensi lazy-image pada log browser dihilangkan dari sumbernya.
- `CHANGELOG.md`, `TODO.md`, dan `worklog.md` mencatat cakupan serta hasil validasi. Konflik signup 409 tetap dipertahankan sesuai kontrak API.
- Typecheck, lint, build, scan tidak adanya lazy loading, dan `git diff --check` telah lulus. Tidak ada migration database atau perubahan environment variable.
```

---

## PR baru - UI/UX Autentikasi Dark Mode

**PR:** 33
**Repo:** htnuinar26/htn-legacy
**Status:** [ ] belum dicopas

```text
Ringkasan review perubahan UI/UX autentikasi:

- `src/components/views/login-view.tsx` tetap menjadi sumber shared untuk Masuk, Daftar, dan Admin. Hero light tetap maroon, sedangkan dark memakai token netral `--auth-hero-bg`.
- `src/app/globals.css` menambah token component `auth-hero-*` dan `input-placeholder` tanpa primitive hex baru. Kontras hero, deskripsi, motto, copyright, placeholder, dan teks sekunder diperkuat melalui token semantic.
- `src/components/theme-toggle.tsx` tetap menjaga pola mounted check, menambahkan `suppressHydrationWarning`, target sentuh 44px, dan focus-visible ring; komponen ini juga dipakai oleh shell Admin dan Anggota sehingga perubahan berlaku konsisten.
- Tab auth dan tombol submit memiliki focus-visible ring, radius tombol submit 6px, label input tetap terasosiasi, dan tidak ada perubahan logic submit atau validasi.
- `src/components/views/login-view.tsx` sekarang menempatkan header di dalam panel form. Header memakai `--bg-base`, sehingga tidak menjadi strip putih terpisah dan pada mobile menggabungkan logo kiri dengan toggle tema kanan.
- `src/app/globals.css` memperluas aturan scrollbar yang sebelumnya hanya berlaku pada `.scroll-area-custom` menjadi global. Ukuran tetap tipis, warna memakai token semantic, dan behavior scroll tidak diubah.
- Border vertikal hero/form tetap memakai `--auth-hero-border` pada desktop; hero tetap disembunyikan pada mobile sehingga tidak ada garis panel yang mengganggu.
- Typecheck, lint, build, scan shared component/token/hex/lazy-loading, dan `git diff --check` telah lulus. Risiko residual visual hanya memerlukan pengecekan manual pada device nyata di breakpoint 360px, 640px, 768px, dan 1024px.
```

---

## PR baru - Penyatuan Top Bar Auth dan Scrollbar Global

**PR:** 35
**Repo:** htnuinar26/htn-legacy
**Status:** [ ] belum dicopas

```text
Ringkasan review perubahan follow-up UI autentikasi:

- `src/components/views/login-view.tsx` memindahkan top bar ke dalam shell panel form, memakai `--bg-base`, dan menyatukan logo mobile dengan toggle tema dalam satu baris.
- `src/app/globals.css` menerapkan scrollbar tipis secara global untuk browser berbasis WebKit dan Firefox dengan token semantic, tanpa mengubah perilaku scroll.
- Divider hero/form desktop tetap memakai token `--auth-hero-border`, sedangkan hero tetap tersembunyi pada mobile. Token hero dark tetap netral dan tidak dikembalikan menjadi gold solid.
- `CHANGELOG.md`, `TODO.md`, dan `worklog.md` mencatat perubahan follow-up serta hasil validasi.
- Typecheck, lint, build, dan `git diff --check` telah lulus. Tidak ada perubahan database, environment variable, storage, dependency, atau logic autentikasi.
```

---

## PR baru - Guard Payload Array dan Aset Above-the-fold

**PR:** 37
**Repo:** htnuinar26/htn-legacy
**Status:** [ ] belum dicopas

```text
Ringkasan review perubahan tindak lanjut console log:

- View anggota dan Admin menormalisasi payload array dari API sebelum memakai `.map` atau `.length`, termasuk array nested pada dashboard, kas, laporan, dan generator struk.
- Logo yang tampil pada awal auth dan shell memakai `priority`, sehingga tidak ikut lazy loading dan tidak memicu intervensi placeholder untuk aset above-the-fold.
- Status `401` login tetap dipertahankan sebagai `AUTH_ERROR`; perubahan tidak melemahkan kontrak autentikasi.
- `CHANGELOG.md`, `TODO.md`, dan `worklog.md` mencatat cakupan serta validasi perubahan.
- Typecheck, lint, build, dan `git diff --check` telah lulus. Tidak ada migration database, perubahan environment variable, storage, dependency, atau perubahan logic autentikasi.
```

---

## PR #39

**PR:** 39
**Repo:** htnuinar26/htn-legacy
**Status:** [ ] belum dicopas

```
Review terpadu revisi auth, receipt, dashboard, transaksi, dan Admin:

- Route `/login`, `/signup`, `/admin/login`, dan `/admin` sudah dipisah. Guard pada `app-shell.tsx` tetap memprioritaskan session Admin tanpa mencampur otorisasi Anggota.
- Login anggota membedakan nama yang tidak ditemukan dari password salah. Risiko residual: redirect ke `/signup` bergantung pada kategori `NOT_FOUND`, sehingga perubahan kontrak response perlu mempertahankan kategori tersebut.
- `GET /api/struk` sekarang menunggu `Promise.all` sebelum `apiSuccess`, memperbaiki payload yang sebelumnya tidak dapat dipakai oleh review Admin.
- Receipt generator dikonversi ke PNG melalui `sharp`; file hasil dan preview memakai `image/png`. Dependency `sharp` sudah tersedia, tidak ditambahkan baru.
- Migrasi receipt mengganti unique constraint status menjadi index biasa agar histori `REJECTED` berulang tidak memicu konflik. Data lama tidak diubah; duplikasi aktif tetap dibatasi oleh logic aplikasi.
- Dashboard memakai `recharts` yang sudah ada, dan filter Anggota/Admin menggunakan nilai status yang sama dengan summary.
- `ADMIN_NAMES` wajib ditambahkan pada deployment. Fallback `Bendahara` dipertahankan untuk kompatibilitas environment lama, sehingga deployment baru perlu memverifikasi konfigurasi empat nama.
- Barcode lokal `public/assets/barcode.webp` tidak dimasukkan karena file di working tree berukuran 0 byte. Komponen aman menampilkan empty state bila settings belum memiliki URL/path barcode yang valid.
- `CHANGELOG.md`, `TODO.md`, dan `worklog.md` mencatat cakupan serta validasi. Typecheck, lint, build, dan `git diff --check` lulus.
```

---

## PR #41

**PR:** 41
**Repo:** htnuinar26/htn-legacy
**Status:** [ ] belum dicopas

```
Review terpadu audit keamanan statis dan dokumentasi kebijakan merge:

- `docs/SECURITY_AUDIT_2026-10-23.md` memisahkan temuan dari batasan verifikasi dan tidak menyalin nilai secret. Temuan secret historis diberi tingkat kritis bersyarat karena status rotasi memang belum dapat dibuktikan dari source code.
- Risiko autentikasi Admin memakai password bersama, penyimpanan password anggota yang dapat dipulihkan, rate limit upload dalam memori, dan atribusi audit statis dijelaskan beserta dampak dan langkah tindak lanjutnya.
- Laporan membandingkan commit lokal dengan `main` dan menyatakan bahwa perubahan lanjutan sesi Admin 30 menit serta dropdown custom belum ada pada `main` yang diperiksa. Karena status merge/deployment bisa berubah, pemilik tetap perlu memeriksa ulang branch sebelum menganggap perubahan tersebut sudah production.
- `TODO.md` menandai pekerjaan session Admin dan dropdown custom selesai, sementara laporan audit menyebut perubahan itu belum termasuk di `main`. Status TODO perlu dibaca sebagai status implementasi branch audit, bukan bukti bahwa perubahan sudah tergabung atau ter-deploy.
- `AGENTS.md` menetapkan pemilik sebagai pihak yang melakukan merge dan `main` sebagai target PR. Tidak ada source code, migrasi database, perubahan environment, atau storage dalam PR ini.
- `CHANGELOG.md` dan `worklog.md` mencatat lingkup audit dan batas validasinya. Audit bersifat statis, jadi hasil ini bukan bukti bahwa temuan sudah diperbaiki atau lolos pengujian dinamis.
```

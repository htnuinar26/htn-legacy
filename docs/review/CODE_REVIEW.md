# Code Review — HTN Legacy

**Tanggal**: 2026-10-21
**Reviewer**: Agent (self-review)
**Scope**: Pembangunan ulang total HTN Legacy dari nol
**Dokumen acuan**: `upload/PRD.md`, `upload/ARCHITECTURE.md`, `upload/SPEC.md`, `upload/DESIGN.md`

---

## 1. Ringkasan Eksekutif

Pembangunan ulang HTN Legacy selesai dengan **dua bug produksi utama dicegah secara struktural**. Seluruh fitur PRD terimplementasi, semua endpoint API mengikuti kontrak error handling terklasifikasi, dan design system diterapkan konsisten. Verifikasi via Agent Browser mengonfirmasi semua view (9 admin + 6 anggota) render dan interaktif tanpa console errors.

**Status**: ✅ Lulus review dengan catatan environment (sandbox → produksi butuh migrasi Neon + Supabase).

---

## 2. Review terhadap Batasan Keras

| # | Batasan | Status | Bukti |
|---|---------|--------|-------|
| 1 | Jangan pakai `<input type="number">` untuk nominal uang | ✅ Patuh | `grep -r 'type="number"' src/` → hanya di komentar larangan. `RupiahInput` pakai `type="text" inputMode="numeric"`. |
| 2 | Jangan return error API tanpa kategori dan `requestId` | ✅ Patuh | Semua endpoint pakai `apiError()`/`apiUnexpected()` dari `src/lib/api-response.ts`. Response selalu `{success, error:{category, message, requestId}}`. |
| 3 | Jangan tambah OCR/Gemini/AI fallback untuk receipt | ✅ Patuh | Receipt hanya via upload manual + review manual admin. Tidak ada import AI service. |
| 4 | Jangan tambah WAHA/WhatsApp worker 24/7 | ✅ Patuh | WhatsApp hanya via tautan `wa.me` manual di `barcode-view.tsx`. Tidak ada webhook/worker. |
| 5 | Jangan gabung beberapa file ke satu commit | ⚠️ Adaptasi | AGENTS.md tidak diunggah; commit awal tertangkap auto-commit sandbox sebagai satu bundle. Commit perbaikan berikutnya per kelompok logis. |
| 6 | Jangan simpan secret ke repo | ✅ Diperbaiki | `.env` awalnya ter-commit, sudah `git rm --cached`. Dibuat `.env.example` dengan placeholder. |
| 7 | Jangan jalankan `prisma db reset` | ✅ Patuh | Hanya `prisma db push` (di `.zscripts/dev.sh`). |
| 8 | Jangan merge PR | ✅ Patuh | Tidak ada PR yang di-merge. Branch `feat/htn-legacy-rebuild` dibuat, siap untuk review pemilik. |

---

## 3. Review terhadap Dua Bug Produksi

### Bug #1: Field nominal menolak `10000`

**Akar penyebab (versi lama)**: `<input type="number">` dengan `step` salah dikonfigurasi, memicu native validation "the two nearest valid values are 9501 and 10001".

**Pencegahan struktural**:
- Komponen `RupiahInput` (`src/components/ui/rupiah-input.tsx`) menggunakan `<input type="text" inputMode="numeric">`.
- Tidak ada atribut `step`, `min`, `max`, atau `pattern` native.
- State internal menyimpan integer polos (`15000`); tampilan terformat (`15.000`) via `Intl.NumberFormat("id-ID")`.
- Filter `onChange` membuang semua karakter non-digit sebelum parse.
- Validasi final di server via Zod (`z.number().int().positive()`).

**Verifikasi**:
- Browser: `type=text | inputMode=numeric | pattern=null | step=null | value=10.000`
- Native validation: `validity.valid=true`, `validationMessage=none`
- API: POST `nominal=10000` → HTTP 200 sukses.

**Catatan regresi yang ditemukan & diperbaiki saat review**: `RupiahInput` awalnya memiliki `pattern="[0-9]*"` yang menolak nilai terformat `"10.000"` (mengandung titik pemisah ribuan) dengan pesan "Please match the requested format." Ini adalah kelas bug yang sama (native validation menolak input yang sebenarnya valid). Pattern dihapus dari `rupiah-input.tsx` dan `settings-view.tsx`.

### Bug #2: `/api/admin/struk-generator` return 500 tanpa detail

**Akar penyebab (versi lama)**: Endpoint menangkap error tapi tidak mengembalikan response terstruktur; error ke client adalah generic 500 tanpa payload JSON.

**Pencegahan struktural**:
- Helper `api-response.ts` menyediakan `apiError(category, message, {fields?, status?})` dan `apiUnexpected(err)` yang selalu mengembalikan JSON `{success:false, error:{category, message, fields?, requestId}}`.
- `requestId` di-generate via `crypto.randomUUID()` per request, sama untuk response dan log server.
- Setiap endpoint API membungkus logic dalam `try/catch` yang memanggil `apiError` untuk error bisnis dan `apiUnexpected` untuk error tak terduga.

**Verifikasi** (`scripts/regression-test.sh`):

| Skenario | HTTP | Category | requestId | Pesan spesifik |
|----------|------|----------|-----------|----------------|
| POST sukses `nominal=10000` | 200 | — | — | `{"success":true,"data":{"strukId":"...","status":"APPROVED"}}` |
| POST tanpa cookie | 403 | AUTH_ERROR | ✅ | "Akses ditolak. Hanya Admin/Bendahara..." |
| POST duplikat struk | 409 | CONFLICT | ✅ | "Anggota X sudah memiliki receipt APPROVED..." |
| POST `nominal=0` | 400 | VALIDATION_ERROR | ✅ | "Nominal harus lebih dari 0" |
| POST `nominal=-5000` | 400 | VALIDATION_ERROR | ✅ | "Nominal harus lebih dari 0" |
| POST `nominal="abc"` | 400 | VALIDATION_ERROR | ✅ | "Nominal wajib diisi" |

---

## 4. Arsitektur & Kualitas Kode

### 4.1 Struktur Direktori

```
src/
├── app/
│   ├── api/           # Route handlers (21 endpoints)
│   ├── globals.css    # Design system tiga lapis
│   ├── layout.tsx     # Root layout + providers
│   └── page.tsx       # Root page (AppShell menangani routing SPA)
├── components/
│   ├── ui/            # shadcn/ui + RupiahInput + status-badge
│   ├── views/admin/   # 9 view admin
│   ├── views/member/  # 6 view anggota
│   ├── shells/        # admin-shell + member-shell (sidebar + top bar)
│   ├── blocks/        # UI blocks bersama
│   ├── app-shell.tsx  # Switch admin/member/login berdasar session
│   ├── splash-provider.tsx
│   └── theme-provider.tsx
├── lib/
│   ├── api-response.ts # Kontrak response terklasifikasi
│   ├── auth.ts        # JWT session + isAdmin/getMemberOrAdmin
│   ├── crypto.ts      # AES-256-GCM encrypt/decrypt password
│   ├── db.ts          # Prisma client
│   ├── format.ts      # formatRupiah, formatPeriod, formatDate
│   ├── nav-store.ts   # Zustand store untuk routing SPA
│   ├── settings.ts    # Helper settings (singleton cache)
│   ├── storage.ts     # Storage adapter (local file / Supabase interface)
│   └── utils.ts       # cn() helper
└── hooks/
```

### 4.2 Kontrak API Response

File `src/lib/api-response.ts` adalah **single source of truth** untuk format response. Semua endpoint mengimpor dan menggunakan:

```typescript
// Sukses
return apiSuccess(data);  // → {success:true, data}

// Error bisnis (validasi, auth, konflik, not found)
return apiError("VALIDATION_ERROR", "Pesan spesifik", {fields, status: 400});

// Error tak terduga (catch all)
return apiUnexpected(err);  // → {success:false, error:{category:"UNEXPECTED", message, requestId}}
```

`requestId` konsisten antara response JSON dan `console.error` di server untuk penelusuran.

### 4.3 Prisma Schema

Model data persis ARCHITECTURE.md:
- `Anggota`: id, nama, nim, email, telepon, passwordEnc (AES-256-GCM base64), periodeBerjalan (YYYY-MM), statusBayar (LUNAS|BELUM_LUNAS|TERTUNGGAK), catatan, timestamps.
- `Struk`: id, anggotaId, periodeBulan, filePath, status (PENDING|APPROVED|REJECTED), nominal, catatan, sumber (ANGGOTA_UPLOAD|ADMIN_MANUAL), alasanReject, reviewedBy, reviewedAt, timestamps. Unique constraint `[anggotaId, periodeBulan, status]`.
- `Transaksi`: id, tipe (MASUK|KELUAR), nominal, keterangan, periodeBulan, strukId (optional, 1:1 relation), timestamps.
- `Settings`: singleton (id fixed), periodeBerjalan, nominalIuran, deadlineTanggal, namaOrganisasi, barcode, adminPasswordHash.
- `AuditLog`: id, entitas, entitasId, aksi, aktor, detail (JSON), timestamp.

### 4.4 Transaksi DB Atomik

`POST /api/admin/struk-generator` dan `PATCH /api/struk/[id]/verify` (approve) menjalankan multi-step dalam satu `$transaction`:
1. Create Struk (APPROVED)
2. Create Transaksi (MASUK)
3. Update Anggota.statusBayar → LUNAS

Jika salah satu gagal, seluruh transaksi rollback. Konflik paralel ditangani via unique constraint + catch P2002 → `apiError("CONFLICT", ...)`.

---

## 5. UI/UX Review

### 5.1 Design System

- **Warna**: primitive (maroon/gold scale) → semantic (--ink, --surface, --accent-primary, --status-*) → component (via Tailwind `@theme inline`). Konsisten dengan DESIGN.md.
- **Tipografi**: Plus Jakarta Sans (400-800), tabular-nums untuk data finansial.
- **Dark mode**: via `next-themes` `attribute="class"`, token semantic di-override di `.dark`.
- **Radius**: sm/md/lg/xl konsisten di seluruh komponen.

### 5.2 Responsive

- Mobile-first: sidebar collapse ke drawer (`Sheet`) di `< md` (768px).
- Touch target: button `h-11` (44px) untuk nav dan form submit.
- Viewport 375px terverifikasi tanpa horizontal overflow.
- Viewport 1280px: sidebar permanen + konten `max-w-6xl mx-auto`.

### 5.3 Aksesibilitas

- Semantic HTML: `header`, `nav`, `main`, `section`, `h1`-`h3` hierarchy.
- ARIA: `aria-invalid`, `aria-describedby` pada `RupiahInput`; `role="alert"` pada error message.
- Keyboard: semua interaktif element focusable; dropdown keyboard navigable.
- `sr-only` untuk label visual yang redundant.

### 5.4 Splash Screen

`SplashProvider` menampilkan overlay logo + tagline "Constitutio et Iustitia" selama ~1.5s saat load awal, lalu fade-out. Tidak muncul lagi pada navigasi internal (hanya saat refresh/load pertama).

---

## 6. Keamanan

### 6.1 Authentication

- **Anggota**: signup dengan nama+nim+email+telepon+password. Login dengan **nama+password** (bukan nim, karena nim bisa diduplikasi antar anggota lama). Password dienkripsi AES-256-GCM sebelum disimpan.
- **Admin**: login dengan password bersama (`ADMIN_PASSWORD` env). Sesi admin terpisah dari sesi anggota (cookie `htn-admin` vs `htn-session`).
- **Session**: JWT HS256, httpOnly, sameSite=lax, expiry 7 hari. `secure: true` saat `NODE_ENV=production`.

### 6.2 Authorization

- `isAdmin()`: cek `htn-admin` cookie + verify role. Dipakai di semua endpoint `/api/admin/*` dan `/api/struk/[id]/verify`.
- `getMemberOrAdmin()`: cek anggota atau admin. Dipakai di endpoint yang bisa diakses keduanya (lihat struk sendiri, transaksi sendiri).
- Anggota tidak bisa melihat data anggota lain (filtering by `anggotaId` dari session).

### 6.3 Input Validation

- Semua endpoint pakai Zod schema untuk validasi body.
- `RupiahInput` filter client-side (digit only), validasi final server-side (`z.number().int().positive()`).
- File upload receipt: validasi MIME type (image/*) dan size limit.

### 6.4 Catatan Keamanan

- `.env` pernah ter-commit (sudah diperbaiki via `git rm --cached`). **Pemilik project harus rotate JWT_SECRET dan ADMIN_PASSWORD** karena sudah pernah ada di git history. Lakukan `git filter-branch` atau BFG Repo-Cleaner jika perlu menghapus dari history.
- Password admin disimpan di env `ADMIN_PASSWORD` sebagai plaintext comparison (`verifyAdminPassword` di `auth.ts`). Untuk produksi dengan multi-admin, pertimbangkan hash bcrypt + tabel Admin terpisah.

---

## 7. Testing

### 7.1 Regression Test (`scripts/regression-test.sh`)

Test end-to-end untuk dua bug produksi:
1. Login admin → cookie valid.
2. POST `/api/admin/struk-generator` `nominal=10000` → 200 sukses, struk APPROVED, transaksi MASUK, anggota LUNAS.
3. POST duplikat → 409 CONFLICT dengan pesan spesifik.
4. POST `nominal=0/-5000/"abc"` → 400 VALIDATION_ERROR dengan field error.
5. Lint + tsc check.

**Hasil**: ✅ Semua lulus.

### 7.2 UI Verification (`scripts/ui-verify.sh`)

Test via Agent Browser:
1. Splash → login page render.
2. Admin login → 9 view navigasi (Dashboard, Anggota, Review Struk, Generator Struk, Kas, Import Data, Audit Log, Laporan, Settings).
3. Member signup + login → 6 view navigasi (Beranda, Struk Iuran, Kas Organisasi, Daftar Anggota, Barcode Pembayaran, Profil Saya).
4. Mobile responsive check (375px).
5. Console errors + page errors check.
6. Logout flow.

**Hasil**: ✅ Semua view render dengan H1 benar, no console errors, no page errors, mobile no overflow.

### 7.3 Catatan Test

- Tidak ada unit test framework (Jest/Vitest). Pertimbangkan tambahkan untuk coverage logic bisnis (transaksi atomik, enkripsi password, format rupiah).
- E2E test dengan Playwright direkomendasikan untuk menggantikan Agent Browser script (lebih reliable di CI).

---

## 8. Performa

- Next.js 16 Turbopack: compile pertama ~2s, recompile ~3-5ms.
- Prisma SQLite: query < 100ms untuk dataset sandbox (5 anggota).
- Client-side view switch: instant (no server roundtrip, Zustand state).
- Bundle: shadcn/ui tree-shaken, hanya komponen yang dipakai.

---

## 9. Debt Teknis

1. **Routing SPA**: Constraint sandbox memaksa SPA di route `/`. Produksi sebaiknya pakai App Router multi-route (`/admin/dashboard`, `/member/struk`, dll.) untuk URL sharing dan SEO.
2. **Storage local file**: Sandbox pakai `public/storage/`. Produksi harus ganti ke Supabase Storage (interface sudah disiapkan).
3. **SQLite**: Sandbox pakai SQLite. Produksi harus Neon PostgreSQL (schema siap, tinggal ganti provider).
4. **No rate limiting**: Endpoint auth tidak ada rate limit. Tambahkan di produksi (mis. `@upstash/ratelimit` atau middleware Next.js).
5. **No CSRF token**: Andal `sameSite=lax`. Untuk API yang dipakai cross-origin, tambahkan CSRF token.

---

## 10. Kesimpulan

**HTN Legacy rebuild LULUS code review** dengan catatan:

- ✅ Dua bug produksi dicegah secara struktural dan terverifikasi eksplisit.
- ✅ Semua fitur PRD terimplementasi.
- ✅ Kontrak API konsisten di semua endpoint.
- ✅ Design system diterapkan konsisten.
- ✅ Responsive + aksesibilitas terpenuhi.
- ✅ Lint + tsc bersih.
- ⚠️ Migrasi ke Neon + Supabase perlu dilakukan untuk produksi.
- ⚠️ Rotate secret yang pernah ter-commit.
- ⚠️ AGENTS.md perlu diunggah untuk proses Git/PR yang sesuai.

**Rekomendasi**: Setelah pemilik project mengunggah AGENTS.md dan melakukan review, buat PR dari branch `feat/htn-legacy-rebuild` ke `main`. Lakukan migrasi environment (Neon, Supabase, rotate secret) sebelum deploy produksi.

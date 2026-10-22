# Technical Specification

## Status Dokumen

Spesifikasi untuk HTN Legacy versi baru, dibangun dari nol. Mengikuti `ARCHITECTURE.md` untuk alur kerja dan standar error handling, dan `DESIGN.md` untuk tampilan.

## Stack dan Environment

- Next.js 16 App Router
- React 19
- TypeScript (`strict: true`)
- Prisma 6
- PostgreSQL Neon
- Supabase Storage
- Zod untuk validasi skema di semua Route Handler
- Bun
- Vercel atau deployment standalone

Environment utama:

```text
DATABASE_URL              koneksi Neon pooler untuk runtime
DIRECT_URL                koneksi Neon direct untuk Prisma
JWT_SECRET                signing session cookie
ENCRYPTION_KEY             kunci AES-256-GCM
ADMIN_PASSWORD             password Admin bersama
SUPABASE_URL               URL project Supabase
SUPABASE_SECRET_KEY        secret server-only Supabase
SUPABASE_STORAGE_BUCKET    nama bucket receipt/barcode
NEXT_PUBLIC_INSTANCE_NAME  nama instance pada UI
DEBUG_MW                   1 untuk debug proxy, 0 untuk normal
```

Catatan tambahan:

- `.env.example` memakai path database sandbox `file:../db/custom.db`. Path relatif
  Prisma dihitung dari folder `prisma/`, bukan dari root repository.
- `z.config(z.locales.id())` diaktifkan di `src/lib/api-response.ts` supaya pesan
  validasi bawaan Zod berbahasa Indonesia.

## Status Receipt

```text
PENDING   menunggu review manual
APPROVED  disetujui Admin/Bendahara
REJECTED  ditolak dan dapat dikirim ulang
```

## Policy Periode Receipt

`MAX_RECEIPT_MONTHS = 4`.

Periode valid terdiri dari periode berjalan dan tiga periode sebelumnya. Satu anggota hanya boleh memiliki satu receipt dengan status `PENDING` atau `APPROVED` pada periode yang sama. Validasi dilakukan sebelum upload dan diperiksa kembali sebelum `db.struk.create`, mengikuti diagram pada `ARCHITECTURE.md`.

## Komponen Bersama Wajib

### `RupiahInput`

Lokasi: `src/components/ui/rupiah-input.tsx`.

```ts
type RupiahInputProps = {
  value: number | null;       // nilai integer polos, bukan string berformat
  onChange: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  id: string;
  label: string;
};
```

Aturan implementasi:

- Elemen dasar `<input type="text" inputMode="numeric">`. **Dilarang** `type="number"`.
- **Dilarang** atribut `pattern="[0-9]*"`. Nilai yang ditampilkan terformat mengandung
  pemisah ribuan, jadi pattern native menolak nilai yang sebenarnya valid ("10.000")
  dengan pesan "Please match the requested format." Itu kelas bug yang sama dengan bug
  `step` yang menjadi alasan rebuild ini. Filter `onChange` sudah membuang non-digit,
  dan validasi akhir tetap di server lewat Zod.
- Filter `onChange`: buang semua karakter non-digit sebelum disimpan ke state.
- Tampilkan nilai terformat (`Intl.NumberFormat('id-ID')`) di `value` input, simpan integer polos di state React.
- Pulihkan posisi caret ke digit yang sama setelah nilai berubah, supaya nominal bisa diedit di tengah nilai terformat, bukan selalu melompat ke ujung.
- Batas atas nilai adalah 2.000.000.000, mengikuti kapasitas kolom `Int` (32 bit) di PostgreSQL. Batas yang sama diverifikasi ulang di server lewat Zod.
- Tampilkan prefiks `Rp` statis dan baris bantuan preview (contoh: "Preview: Rp 15.000") di bawah field.
- Tidak ada `min`/`max`/`step` HTML native. Batas bawah (misal "harus lebih dari 0") divalidasi lewat Zod di server dan ditampilkan sebagai pesan error di bawah field, bukan lewat atribut HTML.
- Dipakai di: form kas manual (`/admin/kas`), form struk generator (`/admin/struk-generator`), form nominal iuran (`/admin/settings`).

### `api-response` helper

Lokasi: `src/lib/api-response.ts`.

```ts
type ApiErrorCategory =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "STORAGE_ERROR"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

function apiSuccess<T>(data: T): Response;

function apiError(
  category: ApiErrorCategory,
  message: string,
  options?: { fields?: Record<string, string>; status?: number }
): Response;
```

`apiError` menetapkan status HTTP default per kategori (400 untuk `VALIDATION_ERROR`, 401/403 untuk `AUTH_ERROR`, 404 untuk `NOT_FOUND`, 409 untuk `CONFLICT`, 502 untuk `STORAGE_ERROR`, 500 untuk `DATABASE_ERROR`/`INTERNAL_ERROR`), menghasilkan `requestId`, dan mencatat log server untuk kategori `STORAGE_ERROR`, `DATABASE_ERROR`, dan `INTERNAL_ERROR` sebelum mengembalikan response ke client. Setiap Route Handler baru wajib memakai helper ini, tidak membuat bentuk response error sendiri.

## Endpoint Receipt

### `POST /api/struk/upload`

Input multipart:

```text
anggotaId     string wajib
password      string wajib
periodeBulan  YYYY-MM, maksimal empat periode terbaru
file          JPG, PNG, atau WebP, maksimal 5 MB
```

Proses lengkap dengan titik kegagalan ada di `ARCHITECTURE.md` bagian "Alur Receipt Anggota". Ringkasan:

1. Validasi field dasar (Zod).
2. Validasi file.
3. Rate limit dan verifikasi password.
4. Cek receipt aktif pada anggota dan periode.
5. Upload ke Supabase Storage.
6. Cek ulang receipt aktif untuk melindungi request paralel.
7. Buat `Struk(PENDING)`.
8. Hapus object storage jika pembuatan database gagal.

Setiap langkah yang gagal mengembalikan response lewat `apiError()` dengan kategori yang sesuai, tidak ada langkah yang gagal secara diam.

### `POST /api/struk/[id]/verify`

Body:

```json
{ "action": "approve", "alasan": "" }
```

atau:

```json
{ "action": "reject", "alasan": "alasan wajib untuk reject" }
```

Approval memperbarui receipt dan membuat transaksi `MASUK` dalam transaksi database yang sama. Nominal menggunakan nominal receipt jika tersedia, atau nominal iuran untuk data legacy. Receipt historis tidak mengubah status anggota periode berjalan. Kegagalan transaksi database dikembalikan sebagai `DATABASE_ERROR` dengan `requestId` untuk ditelusuri di log server, bukan 500 polos.

Rejection menyimpan alasan, mengembalikan akses pengiriman pada periode yang sama, dan menyediakan tautan WhatsApp manual.

## Endpoint Kas

### `GET /api/transaksi?bulan=YYYY-MM`

Mengembalikan transaksi periode yang dipilih, ringkasan semua periode, dan saldo.

### `POST /api/transaksi`

Body:

```json
{
  "tipe": "MASUK",
  "nominal": 1000,
  "keterangan": "Pemasukan kas",
  "periodeBulan": "2026-10",
  "anggotaId": null
}
```

`nominal` harus integer positif, tanpa batasan kelipatan atau digit akhir tertentu. Nilai disimpan menggunakan `Math.floor` setelah validasi Zod di server. Field ini di client memakai komponen `RupiahInput`.

### `DELETE /api/transaksi/[id]`

Admin dapat menghapus transaksi manual maupun transaksi yang memiliki `strukId`. Jika receipt terkait, receipt ditandai `REJECTED`, object storage dihapus, dan status anggota periode berjalan disinkronkan. Jika penghapusan file storage gagal, penghapusan record transaksi tetap dilanjutkan (lihat `ARCHITECTURE.md` node `M1`), dan kegagalan storage dicatat sebagai `STORAGE_ERROR` di log untuk pembersihan manual kemudian. Audit `DELETE_TRANSAKSI` tetap dibuat dalam kedua skenario.

## Receipt Generator Admin

- `GET /api/admin/struk-generator/anggota`: daftar anggota tanpa receipt aktif periode berjalan.
- `POST /api/admin/struk-generator`: menerima `anggotaId`, nominal (lewat `RupiahInput`), dan catatan.
- Receipt manual langsung `APPROVED`.
- Transaksi pemasukan dan receipt dibuat atomik dengan isolation level `Serializable`.
- Kegagalan serialization conflict dikembalikan sebagai `DATABASE_ERROR` dengan pesan "konflik data, silakan coba lagi", bukan 500 tanpa keterangan. Lihat `ARCHITECTURE.md` bagian "Alur Receipt Generator Admin" untuk daftar titik kegagalan yang wajib diuji.

## Storage

```text
struk/{YYYY-MM}/{filename}
assets/barcode-{timestamp}.{extension}
```

Database menyimpan path object. UI menerima signed URL. Jangan menggunakan secret Supabase di client component.

Aturan tambahan:

- Path objek storage **tidak boleh** dikirim apa adanya ke client sebagai URL. Selalu
  kirim URL siap pakai hasil `getSignedUrl()`, misalnya `barcodeUrl` pada
  `GET /api/settings` dan `fileUrl` pada `POST /api/admin/struk-generator`.
- Ekstensi file diturunkan dari peta MIME type ke ekstensi. MIME type
  `image/svg+xml` menghasilkan ekstensi `svg`, bukan `svg+xml`.

## Authorization

- Route anggota memerlukan session anggota atau Admin sesuai kebutuhan.
- Route Admin memerlukan `isAdmin()`.
- Endpoint yang hanya dibaca (transaksi, anggota, settings) juga wajib memeriksa session.
  Tanpa session, request ditolak dengan kategori `AUTH_ERROR` dan status 401.
- Password per aksi tetap diverifikasi pada upload receipt.
- Request stale tidak boleh membuat receipt aktif kedua.
- Rate limit upload dikunci dengan kombinasi IP dan anggota, supaya tidak bisa dipakai
  memblokir anggota lain. Batasnya memakai kategori `VALIDATION_ERROR` dengan status 429,
  karena `ARCHITECTURE.md` menetapkan tujuh kategori error yang eksklusif.

## WhatsApp

Format yang digunakan:

```text
https://wa.me/<nomor>?text=<pesan-url-encoded>
```

Tidak ada WAHA, session WhatsApp, webhook, pengiriman otomatis, atau service 24/7.

## Validasi Lokal

```text
bunx tsc --noEmit
bun run lint
bun run build
git diff --check
```

`bun run db:generate` diperlukan setelah perubahan schema atau instalasi dependency. Jangan menjalankan `db:reset` pada database production. Script `db:push` menggunakan `--accept-data-loss`, sehingga harus dipakai hanya setelah review dan backup.

## Checklist Regresi Wajib (Baru)

Sebelum fitur nominal atau receipt generator dianggap selesai, verifikasi eksplisit poin berikut (akar dari bug yang pernah terjadi):

- [ ] Nominal `10000`, `15000`, dan nominal wajar lain apapun diterima tanpa ditolak oleh validasi apapun.
- [ ] Tidak ada satupun `<input type="number">` dipakai untuk field nominal di seluruh codebase.
- [ ] Endpoint `POST /api/admin/struk-generator` mengembalikan pesan error spesifik (bukan 500 polos) untuk setiap kategori kegagalan yang terdaftar di `ARCHITECTURE.md`.
- [ ] Setiap error `DATABASE_ERROR`, `STORAGE_ERROR`, dan `INTERNAL_ERROR` tercatat di log server dengan `requestId` yang bisa dikorelasikan dengan response yang diterima client.

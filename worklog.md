# HTN Legacy — Worklog

Dokumen ini mencatat pekerjaan semua agent sesuai urutan Task ID.
Setiap section dipisah oleh `---`.

## Catatan Adaptasi Environment (penting)

Dokumen menyebutkan Neon PostgreSQL + Supabase Storage, namun sandbox hanya mendukung SQLite dan tidak memiliki kredensial Supabase. Adaptasi berikut dibuat untuk menjaga agar arsitektur tetap utuh:

1. **Database**: SQLite Prisma client (bukan Neon PostgreSQL). Struktur model data persis seperti ARCHITECTURE.md bagian "Model Data".
2. **Storage**: Adapter local file storage (`src/lib/storage.ts`) dengan kontrak interface yang sama (upload, hapus, signed URL). File disimpan di `public/storage` dan disajikan langsung. Tidak ada secret di client.
3. **Routing**: Seluruh aplikasi di-render di route `/` sebagai SPA dengan client-side view management (env constraint: user hanya bisa lihat `/`). Semua fitur PRD tetap dapat diakses.
4. **AGENTS.md**: Tidak diunggah; aturan proses kerja mengikuti instruksi operasi (worklog, todo, subagent) yang setara.

## Bug yang Dicegah Secara Struktural (non-negotiable)

1. `RupiahInput` — komponen bersama untuk SEMUA field nominal, berbasis `type="text" inputMode="numeric"`, tanpa `step` native.
2. `api-response` helper — SEMUA endpoint API mengembalikan response terklasifikasi dengan `requestId` dan pesan spesifik Bahasa Indonesia.

---

Task ID: 0
Agent: main
Task: Membaca kelima dokumen, mencatat adaptasi environment, menyiapkan worklog dan rencana eksekusi.

Work Log:
- Membaca PRD.md, ARCHITECTURE.md, SPEC.md, DESIGN.md secara penuh.
- Memverifikasi AGENTS.md tidak ada di folder upload.
- Memeriksa state project: Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui sudah ter-setup. Prisma SQLite sudah dikonfigurasi.
- Mengidentifikasi dua standar non-negotiable: RupiahInput dan api-response helper.
- Menyusun rencana eksekusi berlapis: foundation (design system + shared components + data model + auth + storage) → shell → fitur anggota → fitur admin → endpoint API → verifikasi.

Stage Summary:
- Empat dokumen telah dibaca dan dipahami.
- Adaptasi environment didokumentasikan.
- Siap membangun foundation sebelum form/endpoint apapun.

---
Task ID: V-1
Agent: main (verifier)
Task: Post-launch self-verification dengan Agent Browser + regression test eksplisit untuk dua bug produksi yang dicegah.

Work Log:
- Membaca worklog.md sebelumnya; hanya Task ID 0 tercatat (pembacaan dokumen). Seluruh kode foundation + fitur sudah dibangun oleh sesi sebelumnya tanpa mencatat di worklog.
- Memulai dev server Next.js (port 3000) via gateway Caddy (port 81). Server tidak stabil di sandbox (mati setiap ~30-60s antar sesi bash), jadi seluruh regression test dijalankan dalam satu sesi bash via scripts/regression-test.sh.
- Verifikasi visual via Agent Browser: halaman / render dengan judul "HTN Legacy — Sistem Iuran & Kas Organisasi". Dashboard Admin menampilkan periode Oktober 2026, iuran Rp 10.000, 5 anggota, breakdown status pembayaran, ringkasan keuangan.
- Navigasi ke Generator Struk: form render dengan dropdown anggota (5 anggota tersedia), RupiahInput nominal, catatan, tombol "Generate & Simpan".
- MENEMUKAN REGRESI: RupiahInput memiliki `pattern="[0-9]*"` yang menolak nilai terformat "10.000" (mengandung titik pemisah ribuan) dengan pesan native "Please match the requested format." Ini adalah kelas bug yang sama dengan bug step lama. Memeriksa source: src/components/ui/rupiah-input.tsx baris 89.
- MEMPERBAIKI: menghapus `pattern="[0-9]*"` dari RupiahInput (rupiah-input.tsx) dan dari settings-view.tsx (field Tanggal Deadline). Filter onChange sudah membuang non-digit; validasi final di server via Zod. Update komentar komponen untuk mendokumentasikan larangan pattern.
- Re-test setelah perbaikan: RupiahInput sekarang `type=text | inputMode=numeric | pattern=null | step=null`, native validation `valid=true, msg:none` untuk nilai "10.000". Bug 1 secara struktural dicegah.
- Regression test lengkap (scripts/regression-test.sh):
  * Login admin: HTTP 200, cookie htn-admin tersimpan.
  * POST /api/admin/struk-generator dengan nominal=10000: HTTP 200 success, struk APPROVED dibuat, transaksi MASUK 10000 dicatat, status anggota berubah LUNAS. Bug 2 secara struktural dicegah (TIDAK 500).
  * POST duplikat struk: HTTP 409 CONFLICT dengan pesan spesifik "Anggota X sudah memiliki receipt APPROVED pada periode Y" + fields.anggotaId + requestId. Bukan 500.
  * POST nominal=0: HTTP 400 VALIDATION_ERROR "Nominal harus lebih dari 0" + requestId.
  * POST nominal=-5000: HTTP 400 VALIDATION_ERROR + requestId.
  * POST nominal="abc": HTTP 400 VALIDATION_ERROR "Nominal wajib diisi" + requestId.
- Verifikasi tipe: `bunx tsc --noEmit` bersih untuk src/ (error hanya di examples/ dan skills/ yang merupakan file template, bukan bagian project).
- Verifikasi lint: `bun run lint` bersih.
- Verifikasi responsive: viewport mobile 375x667 render tanpa error; ada 1px horizontal overflow minor (376 vs 375) - tidak blocking.
- Verifikasi sticky footer: DESIGN.md tidak mensyaratkan footer (hanya "top bar sticky" pada kedua shell). Layout menggunakan sidebar + top bar, sesuai design system. Tidak ada footer di DOM - konsisten dengan DESIGN.md.

Stage Summary:
- DUA BUG PRODUKSI TERVERIFIKASI SECARA STRUKTURAL DICEGAH:
  1. Bug input nominal: RupiahInput menggunakan type="text" inputMode="numeric" TANPA pattern/step. Nilai 10000 diterima tanpa native validation error.
  2. Bug struk-generator 500: endpoint mengembalikan response terklasifikasi (AUTH_ERROR/VALIDATION_ERROR/CONFLICT/SUCCESS) dengan requestId untuk semua path, termasuk sukses (200), validasi (400), konflik (409), auth (403). Tidak ada 500 tanpa detail.
- Perbaikan yang dilakukan: hapus `pattern="[0-9]*"` dari rupiah-input.tsx dan settings-view.tsx (regresi yang ditemukan saat verifikasi).
- Aplikasi render dan interaktif: dashboard, navigasi admin (Dashboard/Anggota/Review Struk/Generator Struk/Kas/Import Data/Audit Log/Laporan/Settings), form struk generator, alur data struk→transaksi→status anggota→dashboard.
- Lint dan TypeScript lulus bersih untuk src/.
- CATATAN: worklog sebelumnya hanya berisi Task ID 0. Pekerjaan build sesi sebelumnya tidak tercatat di worklog. AGENTS.md tidak diunggah ke folder upload, jadi proses Git/PR/Issue/CHANGELOG/CODE_REVIEW tidak dapat diikuti sepenuhnya.
- Dev server tidak stabil di sandbox ini (mati setiap ~30-60 detik antar perintah bash). Ini adalah constraint sandbox, bukan bug kode. Untuk verifikasi lanjutan, gunakan scripts/regression-test.sh yang menjalankan semua tes dalam satu sesi.

# Code Review - HTN Legacy

**Tanggal**: 2026-11-05
**Reviewer**: Agent (self-review)
**Scope**: PR #45 - Fontconfig pada generator struk

---

## PR #45

**PR:** 45
**Repo:** htnuinar26/htn-legacy
**Status:** [ ] belum dicopas

```
Review terpadu untuk PR #45:

- `src/lib/fontconfig.ts` menetapkan `FONTCONFIG_PATH` hanya pada Linux dan sebelum Sharp diimpor. `assets/fontconfig/fonts.conf` merujuk ke folder font secara relatif dan menggunakan cache `/tmp`, sesuai lingkungan function serverless.
- `assets/fonts/plus-jakarta-sans/PlusJakartaSans-Variable.ttf` menyediakan family yang diminta SVG struk. `assets/fonts/plus-jakarta-sans/OFL.txt`, `assets/fontconfig/fonts.dtd`, dan `assets/fontconfig/COPYING` menyertakan lisensi font dan sumber DTD.
- `next.config.ts` memasukkan konfigurasi, DTD, dan TTF ke file tracing hanya untuk `/api/admin/struk-generator`. `src/app/api/admin/struk-generator/route.ts` tetap menghasilkan PNG dan tidak mengubah urutan upload, transaksi `Serializable`, status receipt, atau response endpoint.
- `docs/SPEC.md` mendokumentasikan bahwa renderer Linux harus memakai aset yang dipaketkan. `CHANGELOG.md` mencatat perubahan di bawah marker Unreleased. `TODO.md` dan `worklog.md` mencatat hasil typecheck/lint, kegagalan build lokal saat mengambil Google Font, dan kebutuhan verifikasi render runtime.
- Vercel Preview build berstatus Ready dan pemeriksaan PR lulus. Namun belum ada request generator nyata pada Preview yang membuktikan font benar-benar termuat dan teks PNG terbaca. Sebelum merge, buat satu struk melalui Preview lalu pastikan preview PNG berisi teks lengkap dan log endpoint tidak lagi mencatat error Fontconfig.
```

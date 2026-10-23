# Code Review - HTN Legacy

**Tanggal**: 2026-10-23
**Reviewer**: Agent (self-review)
**Scope**: PR #43 - identitas Admin, sesi 30 menit, dan kontrol kustom

---

## PR #43

**PR:** 43
**Repo:** htnuinar26/htn-legacy
**Status:** [ ] belum dicopas

```
Review terpadu untuk PR #43:

- `src/lib/admin-identities.ts`, endpoint login, dan `login-view.tsx` memakai daftar empat nama yang sama. Nilai nama dikirim sebagai bagian dari sesi admin dan divalidasi kembali ketika sesi dibaca, sehingga `ADMIN_NAMES` dari environment tidak lagi menentukan pilihan login.
- `src/lib/auth.ts` menerapkan TTL 30 menit pada token dan cookie Admin serta membiarkan TTL sesi anggota tetap tujuh hari. Sesi Admin yang sudah aktif sebelum perubahan ini akan ditolak jika usia token melewati batas atau identitasnya tidak ada di daftar baru, sehingga Admin perlu login ulang setelah deploy.
- Select kustom digunakan pada seluruh lokasi native select yang ditemukan. File picker menyamarkan input visual namun mempertahankan label keyboard-accessible; dialog pemilihan berkas tetap menggunakan dialog OS melalui input file, sesuai perilaku browser.
- `README.md`, `.env.example`, `CHANGELOG.md`, `TODO.md`, dan `worklog.md` selaras dengan implementasi: empat nama ditetapkan di code, `ADMIN_NAMES` dihapus dari konfigurasi, dan rencana ditandai selesai. Tidak ada migrasi database atau perubahan storage.
- Satu ketidakkonsistenan masih ada di luar cakupan perubahan: sejumlah handler audit mencatat actor Admin sebagai `Bendahara` tetap. Karena sesi sekarang memuat nama Admin aktual, log audit untuk tindakan tersebut belum tentu mengatribusikan tindakan ke nama yang login. Pertimbangkan tindak lanjut terpisah agar atribusi audit menggunakan identitas sesi.
- TypeScript dan lint lulus. Build Webpack lulus dengan mock font lokal; build Turbopack normal belum terverifikasi karena resolver mock font gagal di sandbox. Pemeriksaan source menemukan tidak ada lagi tag select native atau pembacaan runtime `ADMIN_NAMES`.
```

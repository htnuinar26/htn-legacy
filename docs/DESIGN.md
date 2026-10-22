# DESIGN.md: Design System Minimalist Editorial

## Arah Desain

HTN Legacy menggunakan gaya **minimalist editorial**: permukaan datar, border tipis, shadow nyaris tidak terlihat, tipografi tegas sebagai alat hierarki utama, dan warna sebagai sumber daya langka yang hanya dipakai untuk makna semantik (status, aksen utama).

Referensi layout: sidebar putih bersih dengan item aktif berwarna solid, card ringkasan dengan ikon kotak rounded berlatar pastel lembut, tabel dengan zebra-stripe halus pada baris, badge status berbentuk dot + teks (bukan warna saja).

Prinsip yang mengikat setiap keputusan visual:

- Data keuangan dan status adalah prioritas visual tertinggi, bukan dekorasi.
- Warna aksen dipakai pada momen penting saja: item navigasi aktif, tombol utama, ikon ringkasan, status badge. Latar besar tetap netral.
- Tidak ada gradient, tidak ada glow, tidak ada neon. Shadow dibatasi sangat tipis dan hanya untuk card yang perlu sedikit terangkat dari latar.
- Border radius kecil dan konsisten (8px sampai 12px). Tidak ada bentuk pil pada card atau tombol utama; pil hanya untuk badge status.
- Ikon fungsional selalu disertai teks atau `aria-label`, tidak berdiri sendiri sebagai satu-satunya penanda makna.

## Token Architecture (Three-Layer)

Semua warna, spacing, dan radius didefinisikan dalam tiga lapis agar tema terang/gelap dan penyesuaian komponen tidak pernah menyentuh hex mentah di dalam komponen.

```
Primitive (nilai mentah)
       ↓
Semantic (alias tujuan)
       ↓
Component (token spesifik komponen)
```

Contoh:

```css
/* Primitive */
--maroon-700: #4a0e16;
--maroon-900: #2c080d;
--gold-500: #c9a24b;

/* Semantic */
--accent-primary: var(--maroon-700);
--accent-primary-strong: var(--maroon-900);
--accent-secondary: var(--gold-500);

/* Component */
--sidebar-item-active-bg: var(--accent-primary);
--button-primary-bg: var(--accent-primary);
--summary-icon-bg: color-mix(in srgb, var(--accent-primary) 12%, transparent);
```

Komponen WAJIB membaca token component atau semantic, tidak pernah primitive langsung, dan tidak pernah hex hardcode.

## Palet Warna

Warna primary/accent diturunkan dari logo HTN Legacy (maroon tua dengan aksen emas pada lambang Dewi Keadilan dan tulisan). Palet dasar tetap netral hangat ala `minimalist-ui`; maroon dan emas dipakai sebagai aksen, bukan warna latar besar.

### Primitive

```css
--maroon-900: #2c080d;
--maroon-700: #4a0e16;
--maroon-500: #6b1420;
--maroon-100: #f5e3e5;

--gold-700: #9c7a2f;
--gold-500: #c9a24b;
--gold-300: #e3c988;
--gold-100: #faf3e0;

--neutral-ink: #111111;
--neutral-ink-soft: #2f3437;
--neutral-muted: #787774;
--neutral-bone: #faf9f6;
--neutral-bone-alt: #f7f6f3;
--neutral-border: #eaeaea;
--neutral-white: #ffffff;

--green-500: #4ade80;
--green-100: #d9ffe6;
--red-500: #ff4d4d;
--red-100: #ffe0e0;
--amber-500: #fbbf24;
--amber-100: #fff4d1;
```

### Semantic (Tema Terang)

```css
--bg-base: var(--neutral-bone);
--surface: var(--neutral-white);
--surface-alt: var(--neutral-bone-alt);
--ink: var(--neutral-ink);
--ink-soft: var(--neutral-ink-soft);
--ink-muted: var(--neutral-muted);
--border-default: var(--neutral-border);

--accent-primary: var(--maroon-700);
--accent-primary-strong: var(--maroon-900);
--accent-primary-soft: var(--maroon-100);
--accent-secondary: var(--gold-500);
--accent-secondary-soft: var(--gold-100);

--status-lunas: var(--green-500);
--status-lunas-bg: var(--green-100);
--status-tertunggak: var(--red-500);
--status-tertunggak-bg: var(--red-100);
--status-pending: var(--amber-500);
--status-pending-bg: var(--amber-100);
--status-approved: var(--green-500);
--status-approved-bg: var(--green-100);
--status-rejected: var(--red-500);
--status-rejected-bg: var(--red-100);

--row-stripe-bg: color-mix(in srgb, var(--accent-primary) 5%, var(--surface));
```

### Semantic (Tema Gelap, class `.dark`)

```css
--bg-base: #171717;
--surface: #1f1f1f;
--surface-alt: #262626;
--ink: #f5f5f4;
--ink-soft: #e5e5e4;
--ink-muted: #a8a7a4;
--border-default: #333333;

--accent-primary: var(--gold-500);
--accent-primary-strong: var(--gold-300);
--accent-primary-soft: rgba(201, 162, 75, 0.14);
--accent-secondary: var(--maroon-500);
--accent-secondary-soft: rgba(107, 20, 32, 0.22);

--status-lunas: #4ade80;
--status-lunas-bg: #123b26;
--status-tertunggak: #ff6b6b;
--status-tertunggak-bg: #451a1a;
--status-pending: #fbbf24;
--status-pending-bg: #4a3506;
--status-approved: #4ade80;
--status-approved-bg: #123b26;
--status-rejected: #ff6b6b;
--status-rejected-bg: #451a1a;

--row-stripe-bg: color-mix(in srgb, var(--accent-primary) 8%, var(--surface));
```

Catatan: pada tema gelap, peran maroon dan emas ditukar (emas jadi accent-primary) karena maroon gelap kehilangan kontras di atas latar gelap. Ini bukan penyimpangan, melainkan aturan tetap di baris di atas; jangan hardcode ulang di komponen.

## Tipografi

Font utama: **Plus Jakarta Sans**, dipertahankan dari dokumen sebelumnya karena sudah terintegrasi dan tegas dibaca pada data finansial.

```text
Plus Jakarta Sans, Inter, system-ui, sans-serif
```

- Body text tidak pernah hitam mutlak (`#000000`); gunakan `--ink` (`#111111` terang / `#f5f5f4` gelap).
- Teks sekunder menggunakan `--ink-muted`.
- Weight yang dipakai: 400 (body), 500 (label), 600 (subjudul), 700 (judul card/angka ringkasan), 800 (angka besar pada summary card, headline halaman).
- Nominal uang selalu `font-variant-numeric: tabular-nums`, weight 700 atau 800 tergantung konteks (badge kecil vs angka ringkasan besar).
- Line-height body minimal 1.5 untuk keterbacaan, 1.1-1.2 untuk angka besar pada summary card.

## Komponen Utama

### Card Ringkasan (Summary Card)

Mengikuti referensi: ikon kotak rounded kecil berlatar pastel di kiri, angka besar di kanan ikon, label kecil di bawah angka.

```css
.summary-card {
  background: var(--surface);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  gap: 16px;
}

.summary-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--accent-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-card__value {
  font-size: 28px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}

.summary-card__label {
  font-size: 13px;
  color: var(--ink-muted);
}
```

Tiga kartu ringkasan pada satu baris boleh memakai warna ikon berbeda (misal accent-primary, status-lunas, status-tertunggak) untuk membedakan makna, selama tiap warna tetap dipakai sebagai latar ikon pastel saja, bukan latar seluruh card.

### Card Umum

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}
```

Shadow hanya dipakai pada card dan dropdown/popover yang perlu terasa sedikit terangkat dari latar. Modal memakai shadow sedikit lebih kuat (`0 8px 24px rgba(0,0,0,0.08)`) karena perlu memisahkan diri dari seluruh halaman.

### Button

- Border radius: 6px.
- Tidak ada shadow pada state default; shadow tipis (`0 1px 2px rgba(0,0,0,0.04)`) hanya muncul pada hover tombol primary.
- Varian:
  - **Primary**: background `--accent-primary`, teks putih. Hover: `color-mix(in srgb, var(--accent-primary) 85%, black)`.
  - **Secondary/Neutral**: background `--surface-alt`, border `--border-default`, teks `--ink`.
  - **Danger**: background `--status-tertunggak`, teks putih. Dipakai untuk hapus, reject, aksi destruktif.
  - **Ghost**: transparan, teks `--ink-muted`, dipakai untuk kontrol ringan (tombol close, ikon aksi pada baris tabel).
- State wajib: hover, active (`transform: scale(0.98)`), disabled (opacity 0.5, cursor not-allowed), focus-visible (ring 2px `--accent-primary`, offset 2px).
- Area sentuh minimal 44x44px pada mobile, termasuk tombol ikon-only pada baris tabel.

### Input Nominal Rupiah (`RupiahInput`)

Komponen wajib dipakai ulang di **setiap** form yang menerima nominal uang (kas manual, struk generator, settings nominal iuran). Lihat `ARCHITECTURE.md` bagian "Standar Input Nominal" untuk aturan teknis penuh; bagian ini hanya mengatur tampilannya.

```css
.rupiah-input {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--surface);
  padding: 12px 14px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: 16px;
}

.rupiah-input:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-primary-soft);
}
```

Prefiks `Rp` ditampilkan statis di dalam field (bukan bagian dari value), dan baris bantuan di bawah field menampilkan preview hasil format ribuan secara real-time, contoh: "Preview: Rp 15.000".

### Input Umum

- Border 1px `--border-default`, radius 8px, background `--surface`.
- Label selalu terlihat di atas field, tidak pernah hanya placeholder.
- Pesan error muncul tepat di bawah field terkait, bukan hanya di satu banner atas.

### Status Badge

Selalu dot + teks, tidak pernah warna saja.

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: currentColor;
}
```

Status yang tersedia: Lunas, Belum Lunas, Tertunggak, Pending, Disetujui, Ditolak. Badge "Tertunggak" harus menjaga teks tetap satu baris pada layar 360px (gunakan `white-space: nowrap` dan sediakan ruang cukup pada kolom tabel/card).

### Tabel

- Header kolom: huruf kecil-besar campur ditingkatkan jadi uppercase, `letter-spacing: 0.04em`, warna `--ink-muted`, ukuran 12px.
- Baris berselang (zebra-stripe) memakai `--row-stripe-bg`, bukan warna solid kuat, agar tetap terbaca di kedua tema.
- Baris tidak memakai border horizontal tebal; cukup perbedaan warna latar antar baris genap/ganjil.
- Tabel lebar memakai container `overflow-x: auto` dengan `min-width: 0` pada parent grid/flex agar tidak merusak layout.
- Aksi per baris (edit, hapus) memakai ikon `lucide-react` ukuran 18px dengan `aria-label`, area sentuh diperluas ke 44x44px lewat padding transparan, bukan memperbesar ikon itu sendiri.

### Sidebar dan Navigasi

- Sidebar desktop: latar `--surface`, lebar tetap, border kanan tipis `--border-default`.
- Item navigasi aktif: latar `--accent-primary`, teks putih, radius 8px, tanpa shadow.
- Item navigasi non-aktif: teks `--ink-soft`, ikon `lucide-react` 20px, hover latar `--surface-alt`.
- Mobile: sidebar menjadi drawer penuh tinggi layar, dibuka dari tombol hamburger pada top bar, dengan overlay scrim 40 persen hitam di belakangnya.
- Top bar sticky pada kedua shell (Anggota dan Admin), berisi logo kecil + nama instance, kontrol tema, dan breadcrumb/judul halaman.

### Splash Screen

Ditampilkan sekali saat aplikasi pertama kali dimuat di browser/sesi, sebelum shell utama siap.

- Latar: `--bg-base`.
- Konten: logo HTN Legacy (lambang Dewi Keadilan) di tengah, ukuran sedang, dengan garis bawah tipis berwarna `--accent-secondary` (emas) yang terisi dari 0 ke 100 persen selama durasi loading sebagai indikator progres, bukan spinner generik.
- Transisi keluar: fade out 250ms begitu sesi (auth check, tema tersimpan, data awal shell) selesai dimuat, tidak pernah dipaksa menunggu durasi tetap yang tidak perlu.
- Durasi maksimal yang dianggap wajar: di bawah 1.5 detik pada koneksi normal; jika lebih lama, splash tetap tampil (tidak timeout paksa ke halaman kosong) karena lebih baik menunggu dengan logo daripada menampilkan shell yang belum siap.
- Splash **tidak** dihormati `prefers-reduced-motion` untuk mematikan animasi garis progres sepenuhnya; garis tetap terisi secara instan (tanpa transisi halus) sebagai gantinya, karena ini indikator fungsi (progres muat), bukan dekorasi.
- Tidak dipakai sebagai splash PWA native (`manifest.json`); itu di luar lingkup dokumen ini kecuali diminta lanjutan.

## Ikonografi

- Ikon fungsional: `lucide-react`, stroke width konsisten 2.0 di seluruh aplikasi.
- Ikon sosial media (WhatsApp, dan platform lain bila ditambahkan): **Bootstrap Icons** (`bootstrap-icons` via `react-bootstrap-icons` atau sprite SVG langsung), karena `lucide-react` tidak memiliki brand mark resmi untuk platform sosial.
- Tidak mencampur dua family untuk kategori ikon yang sama; Bootstrap Icons khusus untuk brand mark sosial media, tidak dipakai untuk ikon fungsional umum (edit, hapus, close, dll).
- Setiap ikon brand mark mengikuti warna resmi platform tersebut (misal hijau WhatsApp) hanya pada konteks tautan `wa.me`, tidak di luar itu.
- Emoji tidak pernah dipakai sebagai pengganti ikon UI.
- Semua ikon fungsional tanpa label teks wajib memiliki `aria-label`.

## Navigasi dan Responsive

- Breakpoint utama: 640px (mobile ke tablet kecil), 1024px (ke layout desktop penuh).
- Mobile-first: setiap komponen ditulis dari lebar paling sempit dahulu, lalu ditingkatkan.
- Tombol dan kontrol interaktif: area sentuh minimal 44x44px pada semua breakpoint di bawah 1024px.
- Card memakai shadow lebih kecil atau dihapus total pada mobile untuk mengurangi noise visual di layar kecil.
- Chart menggunakan container responsif dengan `min-width: 0` agar tidak mendorong lebar parent.
- Gambar dibatasi `max-width: 100%`.
- Tabel lebar memakai overflow horizontal pada container yang sesuai, bukan memaksa seluruh halaman scroll ke samping.
- Modal: lebar penuh pada mobile dengan margin kecil, dibatasi `max-width` pada desktop agar tidak melebihi kenyamanan baca.

Komponen baru harus diuji pada lebar 360px, 640px, 768px, dan 1024px, pada kedua tema (terang dan gelap).

## Dark Mode

Dark mode tersedia melalui `next-themes` dengan pilihan `light`, `dark`, `system` (default). Tombol tema tersedia pada top bar shell Anggota dan Admin. Hydration mismatch harus dihindari pada kontrol yang membaca tema di client; gunakan pola `suppressHydrationWarning` pada elemen yang relevan dan render kontrol tema hanya setelah mount.

## Animasi

Transisi singkat 150-250ms untuk hover, focus, dan perubahan state. Scroll-entry fade khusus dipakai secukupnya pada halaman laporan/dashboard, tidak pada setiap elemen.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Tidak ada animasi loop tanpa henti (pulse, bounce, float) kecuali indikator loading yang sedang aktif menunggu proses nyata, dan itu pun berhenti begitu proses selesai.

## Accessibility

- Jangan mengandalkan warna saja untuk status; selalu sertakan dot/ikon dan teks.
- Semua tombol ikon-only memiliki `aria-label`.
- Modal memakai `role="dialog"` dan `aria-modal="true"`; drawer memakai label dialog yang jelas.
- Setiap input memiliki `<label>` yang terasosiasi, bukan hanya placeholder.
- Focus-visible harus terlihat jelas pada semua elemen interaktif (ring 2px minimum).
- Kontras teks minimum 4.5:1 untuk teks normal, 3:1 untuk teks besar, diverifikasi pada kedua tema.
- Urutan tab mengikuti urutan visual; tidak ada jebakan fokus di luar modal yang sedang terbuka.

## Branding

Logo HTN Legacy (lambang Dewi Keadilan dengan border laurel emas di atas latar maroon, teks "HTN" dan motto "Constitutio et Iustitia") dipakai sebagai aset identitas utama pada splash screen, top bar, dan halaman login. Warna maroon dan emas pada logo adalah sumber primitive warna aksen di atas; jangan menurunkan warna aksen dari sumber lain.

# Product Requirements Document

## Status Dokumen

Dokumen ini adalah spesifikasi untuk **HTN Legacy versi baru**, dibangun dari nol. Cakupan fitur sama persis dengan versi sebelumnya; perubahan ada pada kedalaman alur kerja dan standar penanganan error, dirancang untuk mencegah dua bug yang pernah terjadi di versi lama: validasi nominal yang menolak angka wajar, dan error 500 generik tanpa detail yang bisa ditindaklanjuti.

## Tujuan

Menyediakan sistem internal untuk pencatatan iuran dan kas organisasi yang mudah digunakan, aman, dapat diaudit, dan memiliki verifikasi receipt manual oleh Admin/Bendahara. Setiap kegagalan di sistem ini harus memberi pesan yang jelas, bukan kegagalan diam atau pesan generik.

## Pengguna dan Peran

### Anggota

- Registrasi dan login.
- Melihat status iuran, anggota, barcode pembayaran, kas, dan profil.
- Mengirim receipt untuk periode yang tersedia.
- Melihat riwayat receipt miliknya.
- Menghubungi pengurus melalui WhatsApp manual.

### Admin/Bendahara

- Login ke panel Admin.
- Mengelola anggota dan import data.
- Review manual receipt.
- Membuat receipt manual untuk pembayaran tunai (Receipt Generator).
- Mengelola transaksi kas.
- Melihat audit log, laporan, settings, dan siklus bulanan.

## Receipt Anggota

Alur utama (detail teknis lengkap dengan diagram ada di `ARCHITECTURE.md` bagian "Alur Receipt Anggota"):

1. Anggota memilih nama dan memasukkan password per aksi.
2. Anggota memilih periode dari empat periode terbaru.
3. Anggota memilih gambar JPG, PNG, atau WebP maksimal 5 MB.
4. Server mengupload file ke Supabase Storage.
5. Server membuat receipt berstatus `PENDING`.
6. Admin memeriksa gambar secara manual.
7. Admin memilih `APPROVED` atau `REJECTED`.

Ketentuan:

- Tidak ada OCR.
- Tidak ada Gemini atau AI fallback.
- Tidak ada validasi isi gambar otomatis.
- Receipt buram tetap masuk review jika file dan data dasar valid.
- Satu anggota hanya dapat memiliki satu receipt aktif per bulan.
- Receipt pada bulan yang sama tidak dapat dibuat dua kali melalui request paralel atau request lama.
- Receipt `REJECTED` dapat dikirim ulang.
- Setiap kegagalan pada alur ini (validasi, upload, race condition) wajib mengembalikan pesan spesifik sesuai kontrak error di `ARCHITECTURE.md`, bukan pesan generik seperti "terjadi kesalahan".

## Receipt Manual Admin (Receipt Generator)

Admin dapat memilih anggota, mengisi nominal dan catatan, lalu membuat receipt manual. Receipt manual langsung `APPROVED`, transaksi `MASUK` dibuat atomik, file disimpan di Supabase Storage, dan receipt dapat dipreview atau diunduh.

Field nominal pada form ini **wajib** memakai komponen `RupiahInput` yang sama dipakai di seluruh aplikasi (lihat `ARCHITECTURE.md` bagian "Standar Input Nominal"). Nominal seperti `10000`, `15000`, atau angka wajar lain tidak boleh ditolak oleh validasi apapun di client maupun server; satu-satunya syarat adalah bilangan bulat positif.

Setiap kegagalan pembuatan receipt manual (anggota tidak ditemukan, sudah punya receipt aktif, konflik transaksi database) wajib memberi pesan spesifik yang menyebutkan sebab kegagalan, bukan "Gagal membuat struk manual" tanpa konteks.

## Kas

- Nominal berupa integer Rupiah positif, dimasukkan lewat komponen `RupiahInput` yang sama di seluruh form kas.
- Admin dapat mencatat pemasukan dan pengeluaran tanpa batas buatan seperti keharusan memasukkan `1.001` untuk nominal `1.000`. Tidak ada batasan kelipatan, langkah (`step`), atau digit akhir tertentu pada nominal manapun di aplikasi ini.
- Semua transaksi dapat dihapus oleh Admin, termasuk transaksi yang terhubung receipt.
- Penghapusan transaksi receipt menyinkronkan receipt, anggota, dan storage.
- Audit log penghapusan tetap disimpan, bahkan ketika penghapusan file storage gagal sebagian (lihat `ARCHITECTURE.md` bagian "Alur Kas dan Penghapusan").

## Status dan Laporan

- Status `TERTUNGGAK` dihitung dari status anggota dan deadline.
- Transaksi disimpan sebagai histori permanen kecuali Admin secara eksplisit menghapusnya.
- Laporan dapat diekspor bersama receipt approved sesuai periode.
- Reset siklus membersihkan storage sesuai aturan dan tidak menghapus histori transaksi secara otomatis.

## UI

- Gaya minimalist editorial, lihat `DESIGN.md` untuk detail penuh.
- Warna primary/accent diturunkan dari logo HTN Legacy (maroon dan emas).
- Dark mode terang, gelap, atau mengikuti system.
- Responsive mobile-first dengan drawer navigasi, ditingkatkan ke layout desktop penuh di atas breakpoint 1024px.
- Status selalu ditampilkan dengan ikon dan teks, bukan warna saja.
- Splash screen singkat (logo dan indikator progres) ditampilkan saat aplikasi pertama kali dimuat, hilang otomatis begitu sesi dan data awal siap.
- Logo HTN Legacy yang sudah tersedia dipakai sebagai aset identitas pada splash screen, top bar, dan halaman login.

## Standar Kualitas Teknis (Baru)

Dua requirement berikut wajib dipenuhi di seluruh aplikasi, bukan hanya pada fitur tempat bug sebelumnya ditemukan:

1. **Input nominal**: setiap field yang menerima nilai uang memakai komponen `RupiahInput` bersama, berbasis `type="text" inputMode="numeric"`, tanpa batasan `step` HTML native. Lihat `ARCHITECTURE.md`.
2. **Error handling API**: setiap endpoint mengklasifikasikan error dan mengembalikan pesan spesifik ke client plus log detail di server. Lihat `ARCHITECTURE.md`.

## Batasan dan Larangan

- Tidak ada service OCR atau AI receipt.
- Tidak ada Python service receipt.
- Tidak ada WAHA, session WhatsApp, webhook, atau worker WhatsApp 24/7.
- WhatsApp hanya menggunakan link `wa.me` manual.
- Secret database, Supabase, JWT, enkripsi, dan Admin tidak boleh masuk repository.
- Dilarang memakai `<input type="number">` untuk nominal uang di manapun dalam aplikasi.
- Dilarang mengembalikan pesan error generik tanpa kategori dan detail dari endpoint API manapun.

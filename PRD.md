# PRD — Garda Abdi Negara v1

## Keputusan pengguna

- Satu lokasi, sekitar maksimal 30 siswa.
- Rapor lengkap mengikuti tujuh kelompok pada contoh: akademik, SKD, psikotes, fisik, tugas, kesehatan, dan kehadiran.
- Program campuran TNI, Polri, dan sekolah kedinasan.
- Hosting Vercel; semua data aplikasi dan akun tersimpan di Google Sheets.
- Username/password dibuat admin.
- Presensi per sesi: input pengajar, pengajuan mandiri, atau QR; pengajuan siswa diverifikasi pengajar.
- Nilai bulanan memakai rata-rata seluruh tes per komponen.
- Tampilan Komando dengan tata letak ponsel dan desktop.
- Data contoh dapat dicoba, dengan tombol khusus untuk masuk ke data real.

## Peran

Admin mengelola siswa, akun, kelas, jadwal, data penilaian, aturan, serta penerbitan rapor. Pengajar mengelola nilai siswa pada kelasnya dan presensi pada sesi yang ditugaskan. Siswa mengajukan presensi, mengumpulkan tugas, serta melihat data dan rapor sendiri. Orang tua melihat data anak yang ditautkan ke akunnya.

## Aturan inti

Satu siswa memiliki satu catatan logis per sesi. Pengajuan mandiri/QR berstatus menunggu sampai disahkan. Sesi tidak dapat ditutup selama ada pengajuan menunggu. Siswa tanpa catatan saat sesi selesai dihitung alfa. Daftar peserta dibekukan saat sesi dibuka agar riwayat tidak hilang saat siswa berganti kelas.

Rata-rata memakai tes pada bulan yang dipilih. Nol tetap dihitung, nilai kosong dikeluarkan. Hasil fisik asli disimpan terpisah dari skor pengajar. Pengukuran kesehatan memakai catatan terakhir dalam bulan tersebut.

Rapor terbit menyimpan snapshot nilai, identitas, catatan, dan aturan. Koreksi membutuhkan revisi draf baru; versi terbit sebelumnya tetap tersedia bagi siswa/wali dan melalui riwayat versi. Dokumen dapat dicetak atau disimpan PDF lewat browser.

## Rujukan penilaian

Predikat internal GAN: A ≥80, B ≥60, C ≥40, D <40; dapat diubah admin. Kedisiplinan: ≥95% sangat disiplin, ≥85% disiplin, ≥75% cukup disiplin, selebihnya perlu pembinaan. Ini aturan internal lembaga.

Acuan latihan SKD Kedinasan 2026 umum: TWK 65/150, TIU 80/175, TKP 156/225. Sumber: [KepmenPANRB 406/2026](https://data-jdih.menpan.go.id/dokumen/2026kepmenpanrb406.pdf). Tidak ada penggantian pemeriksaan komponen oleh total nilai saja.

[Pengumuman Akpol 2026](https://penerimaan.polri.go.id/uploads/pdf/PENGUMUMAN%20TARUNA%20AKPOL%20T.A.%202026.pdf) mencantumkan batas psikologi 61 dan jasmani 41 tanpa item nol; angka ini tidak diterapkan sebagai konversi umum seluruh latihan. Tabel konversi lengkap seluruh profil fisik TNI/Polri belum terverifikasi, sehingga v1 menerima skor pengajar dengan keterangan protokol/sumber.

Kesehatan menampilkan pengukuran dan IMT numerik; interpretasi mengikuti pemeriksa. Untuk peserta usia 5–19 tahun, interpretasi IMT perlu mempertimbangkan umur dan jenis kelamin sesuai [WHO BMI-for-age](https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators/bmi-for-age).

## Batas implementasi v1

Tidak ada konversi fisik resmi otomatis tanpa tabel terverifikasi. Pengumpulan tugas menggunakan status, catatan, dan tautan; file biner tidak disimpan dalam sel spreadsheet. Penulisan real memerlukan koneksi internet. Penerbitan dan pengelolaan akun dilindungi API, dengan password scrypt, cookie HttpOnly, CSRF, dan pembatasan login.

# Struktur Google Sheets

Tab awal `Sheet1` dipertahankan. Aplikasi memakai tab berikut:

| Tab | Data |
|---|---|
| GAN_Users | Akun, peran, siswa terkait, kelas pengajar, hash password, versi otorisasi |
| GAN_Students | Identitas, kode siswa, kelas, jalur, tanggal masuk, status aktif |
| GAN_Sessions | Kegiatan, tanggal, jam, kelas, pengajar, status, daftar peserta saat sesi dibuka |
| GAN_Attendance | Satu identitas logis untuk kombinasi sesi dan siswa; pengajuan, verifikasi, waktu, keterlambatan |
| GAN_Tests | Hasil tiap tes akademik, SKD, psikotes, atau fisik beserta tanggal dan pengajar |
| GAN_Assignments | Tugas, instruksi, kelas, tenggat, pengajar |
| GAN_Submissions | Pengumpulan siswa, tautan, catatan, status pemeriksaan, nilai |
| GAN_Health | Pengukuran kesehatan dan catatan pemeriksa |
| GAN_Settings | Identitas lembaga, kelas, zona waktu, toleransi, dan rubrik |
| GAN_Reports | Draf, arsip terbit per versi, snapshot nilai, catatan, dan aturan penilaian |
| GAN_Auth | Hash token sesi login, kedaluwarsa, serta catatan pembatasan percobaan login |
| GAN_Audit | Waktu, pelaku, jenis perubahan, dan entitas yang berubah |

Setiap tab memiliki enam kolom: `event_id`, `timestamp_utc`, `actor_id`, `entity_id`, `operation`, `data_json`. Perubahan ditambahkan sebagai baris baru. Status terkini diambil dari event terakhir per entitas; ID event yang sama diabaikan saat proyeksi untuk mencegah penghitungan ganda.

Penulisan entitas dan audit dikirim dalam satu Google Sheets batch. Permintaan ulang dari client memakai ID operasi yang sama; API memeriksa audit sebelum memprosesnya lagi. Google Sheets tetap memiliki batas konkurensi dan kuota, sehingga aplikasi ini ditujukan untuk skala kecil satu lokasi seperti kebutuhan awal. Bila beberapa admin mengubah entitas yang sama bersamaan, perubahan terakhir menjadi nilai terkini; seluruh event tetap dapat ditelusuri.

Lakukan pengubahan data melalui aplikasi. Mengedit JSON atau menghapus baris event secara manual dapat merusak hubungan serta riwayat. Akun admin spreadsheet memiliki akses ke database, sehingga spreadsheet sebaiknya dibagikan hanya kepada pengelola yang berwenang dan service account.

Data contoh disimpan pada `localStorage` browser dengan key `gan-program-demo-v2`. Data real tidak disalin ke localStorage. Service worker hanya menyimpan kerangka aplikasi; endpoint API tidak dicache untuk penggunaan offline. Saat offline, penulisan data real menampilkan kegagalan dan tidak masuk antrean tersembunyi.

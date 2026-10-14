# Garda Abdi Negara — Komando

Aplikasi presensi per sesi, hasil latihan, tugas, kesehatan, dan rapor bulanan. Tampilan Komando telah dipilih. Antarmuka menyesuaikan ponsel, tablet, dan desktop; tersedia manifest PWA untuk pemasangan lewat browser.

## Mulai sekarang

Jalankan dari folder ini:

```powershell
npm ci
npm run dev
```

Buka alamat `Local` yang dicetak terminal, biasanya [http://127.0.0.1:4173/](http://127.0.0.1:4173/).

- **Coba Data Contoh**: 28 siswa, empat peran, jadwal, presensi, hasil latihan, tugas, dan rapor. Perubahannya disimpan di browser. Menu Pengaturan → Pulihkan data contoh mengembalikan contoh awal.
- **Gunakan Data Real**: login ke akun yang dibuat admin. Data disimpan melalui server ke Google Sheets. Data contoh tidak disalin ke spreadsheet.
- Informasi admin pertama ada di **AKSES_ADMIN_LOKAL.txt** pada komputer ini. File tersebut diabaikan Git, build, dan upload Vercel. Ganti password melalui Akun Saya setelah masuk.

Spreadsheet yang terhubung: [Presensi GAN](https://docs.google.com/spreadsheets/d/1yyxHMUpSbxrk56Go0cujiMQ5HQ6cdO1pCxAQUdKCtuI/edit). Tab `Sheet1` dipertahankan. Dua belas tab `GAN_` telah disiapkan, termasuk akun admin pertama. Data real siswa dimulai kosong.

## Deploy ke Vercel

Panduan lengkap: **[DEPLOY_VERCEL.md](DEPLOY_VERCEL.md)**. Gunakan folder ini sebagai Root Directory, Framework **Other**, Node.js **24.x**, Build Command `npm run build`, dan Output Directory `dist`. API Node.js berada di `api/index.mjs`.

Siapkan tiga environment variable server:

| Variable | Isi |
|---|---|
| `GOOGLE_SPREADSHEET_ID` | ID spreadsheet pada `.env.example` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Seluruh isi JSON service account yang sudah Anda siapkan |
| `AUTH_SECRET` | Secret acak minimal 32 karakter |

`APP_ORIGIN` opsional, diisi domain aplikasi lengkap setelah domain final diketahui. Credentials asli tetap di folder induk; file tersebut tidak disalin ke `public/` atau `dist/`.

## Alur penggunaan data real

1. Admin masuk, menyesuaikan nama lokasi, zona waktu, kelas, dan toleransi terlambat.
2. Admin menambahkan siswa, lalu membuat akun pengajar, siswa, dan orang tua. Hubungkan akun siswa/wali dengan ID siswa; tentukan kelas pengajar.
3. Admin/pengajar membuat sesi dan membukanya pada tanggal kegiatan.
4. Pengajar dapat mencatat hadir/izin/sakit/alfa langsung. Siswa juga dapat mengajukan sendiri atau memindai QR sesi. Pengajuan siswa menunggu verifikasi pengajar.
5. Verifikasi/tolak semua pengajuan sebelum menutup sesi. Siswa tanpa catatan pada sesi selesai dihitung alfa. Kehadiran tetap dihitung saat terlambat.
6. Input setiap hasil tes. Nilai rapor dihitung sebagai rata-rata per komponen; nol tetap dihitung dan data kosong tidak dianggap nol.
7. Tambahkan tugas, periksa pengumpulan, dan catat pengukuran kesehatan.
8. Buka rapor siswa, isi catatan, lalu terbitkan. Nilai dan aturan disalin ke arsip versi tersebut. Revisi membuat draf baru; wali tetap dapat melihat versi terbit sebelumnya.
9. **Cetak / PDF** membuka dialog cetak browser. Pilih A4 portrait dan Save as PDF. Pada ponsel, rincian rapor ditampilkan sebagai bagian yang dapat dibuka/tutup.

## Fitur yang berjalan

- Login username/password, akun admin/pengajar/siswa/orang tua, password scrypt, sesi 8 jam, pembatasan percobaan login, dan perubahan password.
- Hak akses diperiksa di API. Orang tua dan siswa hanya menerima data terkait; pengajar dibatasi kelas serta penugasan sesi.
- Kelola siswa, kelas, jadwal, presensi, pengajuan izin/sakit, QR aktif 10 menit, dan ekspor CSV presensi.
- Akademik, SKD, psikotes, fisik, tugas, serta kesehatan. Hasil tes dapat diarsipkan dengan riwayat tetap tersimpan.
- Rapor bulanan, draf/catatan, penerbitan, revisi, arsip versi, serta cetak PDF lewat browser.
- Semua data aplikasi, akun, sesi login, dan audit tersimpan di Google Sheets; tidak memakai database eksternal.

## Penilaian

Predikat internal: A ≥80, B ≥60, C ≥40, D <40; admin dapat mengubah batasnya. Acuan latihan SKD Kedinasan 2026 umum: TWK 65, TIU 80, TKP 156, berdasarkan [KepmenPANRB 406/2026](https://data-jdih.menpan.go.id/dokumen/2026kepmenpanrb406.pdf). Setiap komponen diperiksa sendiri. Tampilan tidak menyatakan kelulusan seleksi resmi.

Skor fisik dan psikotes dicatat pengajar sesuai pedoman yang digunakan. Hasil fisik asli dan skor dipisahkan. Konversi otomatis memakai tabel resmi TNI/Polri belum diaktifkan karena tabel lengkap seluruh profil belum terverifikasi. Kesehatan menampilkan hasil pengukuran, IMT numerik, dan catatan pemeriksa; aplikasi tidak menetapkan diagnosis atau kelayakan medis.

Kategori kedisiplinan internal: ≥95% sangat disiplin, ≥85% disiplin, ≥75% cukup disiplin, selebihnya perlu pembinaan. Persentase berasal dari sesi selesai yang wajib diikuti siswa.

## Struktur kode

| Folder/file | Peran |
|---|---|
| `public/program.js` | Komponen inti UI dan data contoh awal |
| `public/features.js` | Halaman dan komponen Komando |
| `public/actions.js` | Interaksi, formulir, dan pemisahan demo/real |
| `src/server/handler.mjs` | API login, data, QR, mutasi, dan riwayat rapor |
| `src/server/mutations.mjs` | Validasi dan hak akses perubahan |
| `src/server/domain.mjs` | Rekap, penilaian, dan snapshot rapor |
| `src/server/sheets.mjs` | Google Sheets dan penyimpanan event |
| `src/server/auth.mjs` | Password, cookie, CSRF, serta token QR |
| `api/index.mjs` | Entry point Vercel Functions |
| `tests/domain.test.mjs` | Pengujian aturan dan hak akses |
| `public/designs.html` | Arsip tiga pilihan desain awal |

## Pemeriksaan

```powershell
npm run check
npm test
npm run build
```

`npm run test:real` menjalankan pengujian terhadap spreadsheet yang dikonfigurasi, menggunakan akun admin lokal. Script membuat entitas `QA-`, mengujinya, lalu mengeluarkannya dari data aktif dengan event penghapusan logis. Riwayat event tetap tersimpan. Script ini ditujukan untuk pemeriksaan teknis; tidak diperlukan saat penggunaan biasa.

Google Sheets menerapkan kuota API. Aplikasi menggabungkan penulisan event dan audit dalam satu batch, menggunakan ID permintaan untuk pengiriman ulang, dan tidak melakukan polling otomatis. Jika kuota atau jaringan bermasalah, aplikasi menampilkan kegagalan dan tidak mengklaim data tersimpan. Lihat [DATA_DICTIONARY.md](DATA_DICTIONARY.md).

Status: siap dideploy dari source; deployment Vercel belum dijalankan pada pengerjaan ini. [QA.md](QA.md) mencatat hasil verifikasi lokal.

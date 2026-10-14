# Catatan verifikasi

Pemeriksaan lokal diselesaikan pada 14 Oktober 2026, zona waktu Asia/Jakarta. Deployment Vercel belum dijalankan.

## Source dan build

- Pemeriksaan sintaks seluruh JavaScript: lulus.
- 17 pengujian aturan dan hak akses: lulus.
- Build aset web ke `dist/`: lulus.
- Audit dependency saat instalasi: tidak menemukan kerentanan.

Pengujian aturan mencakup akses siswa/wali, batas kelas pengajar, pengajuan dan verifikasi presensi, sesi dibatalkan, peserta sesi yang dibekukan, alfa, nilai kosong versus nol, ambang per komponen SKD, snapshot rapor, revisi, pasangan tekanan darah, token QR, deduplikasi event, password, serta pencabutan sesi.

## Integrasi spreadsheet real

Pengujian langsung menggunakan service account dan spreadsheet yang diberikan pengguna berhasil untuk:

- Login admin dan penolakan akses tanpa login.
- Penambahan siswa, sesi, hasil tes, pengukuran kesehatan, tugas, dan akun uji.
- Pembatasan data siswa serta penolakan perubahan pengaturan oleh siswa.
- Pembuatan QR PNG valid, pengajuan siswa, verifikasi, penutupan sesi, dan rekap.
- Pengumpulan tugas, penilaian, penerbitan rapor, dan akses wali.
- Penolakan origin yang tidak sesuai dan pengiriman ulang operasi tanpa menggandakan tes.
- Pembacaan riwayat versi rapor 1 dan 2 langsung dari spreadsheet, dengan snapshot nilai yang tetap berbeda sesuai waktu penerbitan.

Entitas uji diberi nama `QA-` dan dikeluarkan dari data aktif setelah pemeriksaan. Riwayat event/audit tetap ada. Tab `Sheet1` dipertahankan. Data real aktif untuk siswa dimulai kosong; akun admin pertama tersedia.

## Browser dan tata letak

- Desktop dan ponsel ditinjau melalui browser.
- Pada viewport 320 px, empat halaman utama tidak melampaui lebar halaman. Tabel nilai bergulir di dalam wadahnya.
- Presensi ponsel menggunakan kartu, navigasi bawah, dan kontrol sentuh.
- Input nilai nol melalui browser memperbarui rata-rata serta jumlah tes dengan benar.
- Perubahan peran contoh membatasi menu dan menampilkan siswa yang terkait.
- Pengajuan siswa masuk antrean pengajar dan berubah menjadi hadir setelah diverifikasi.
- Rapor ponsel memuat tujuh bidang dalam bagian yang dapat dibuka/tutup.
- Riwayat rapor dapat dibuka dalam tampilan baca; tombol revisi tidak ditampilkan saat melihat arsip.
- Console browser tidak menampilkan error pada alur yang diperiksa.

Cetak memakai dialog cetak browser dengan CSS A4 portrait. Tampilan rapor ditinjau di browser; ekspor PDF melalui dialog cetak perangkat pengguna dan pemasangan PWA tidak diotomatisasi pada pemeriksaan ini. Verifikasi HTTPS/domain dan QR antarperangkat dilakukan setelah deployment.

## Pemisahan data dan secrets

Data contoh disimpan di browser, tidak dimasukkan ke spreadsheet real. Data real diambil lewat API dengan pemeriksaan hak akses. Static server hanya menyajikan `public/`. Permintaan ke `credentials.json` dan percobaan keluar dari folder public menghasilkan 404. `.env.local`, credentials, serta informasi admin lokal dikecualikan dari Git/upload/build dan paket source untuk deploy.

# Deploy Garda Abdi Negara ke Vercel

## 1. Source project

Gunakan isi folder `garda-presensi`, termasuk `api/`, `src/`, `public/`, `scripts/`, `package.json`, `package-lock.json`, dan `vercel.json`. Jangan memilih folder induk `Presensi` sebagai root karena di sana terdapat credentials asli.

Source bisa diunggah ke repository Git lalu diimpor ke Vercel, atau dideploy dengan Vercel CLI dari folder ini. Deployment belum dijalankan otomatis.

## 2. Pengaturan project

| Pengaturan | Nilai |
|---|---|
| Framework Preset | Other |
| Root Directory | `garda-presensi` jika repository memakai folder induk; `.` jika isi folder ini menjadi root repository |
| Node.js | 24.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

`vercel.json` mengarahkan `/api/*` ke satu Node.js Function. Folder `dist` berisi aset web; kode fungsi tetap berasal dari `api/` dan `src/server/`.

## 3. Environment variables

Tambahkan pada environment Production:

1. `GOOGLE_SPREADSHEET_ID`: `1yyxHMUpSbxrk56Go0cujiMQ5HQ6cdO1pCxAQUdKCtuI`.
2. `GOOGLE_SERVICE_ACCOUNT_JSON`: paste seluruh JSON dari file credentials service account asli. Gunakan nama persis ini, tanpa awalan `PUBLIC` atau `NEXT_PUBLIC`.
3. `AUTH_SECRET`: secret acak minimal 32 karakter. Dapat dibuat di terminal sendiri dengan:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

`GOOGLE_APPLICATION_CREDENTIALS` digunakan untuk pengembangan lokal saja. Path di komputer tidak dapat digunakan oleh Vercel.

`APP_ORIGIN` bersifat opsional. Jika diisi, gunakan origin tepat, contohnya `https://garda-gan.vercel.app`, tanpa slash di akhir. Sesuaikan per environment jika juga memakai Preview Deployment. Jika kosong, server memeriksa origin terhadap URL permintaan.

## 4. Deploy

Klik Deploy di dashboard Vercel, atau jalankan Vercel CLI dari folder project. Untuk CLI:

```powershell
npx vercel
```

Ikuti proses login dan pemilihan project pada komputer Anda. Setelah environment variables Production tersimpan, deploy Production:

```powershell
npx vercel --prod
```

Spreadsheet dan admin pertama sudah disiapkan pada pengerjaan lokal ini. Akun serta password yang sama berlaku setelah deploy karena hash-nya berada pada spreadsheet. Informasi awal ada di file lokal `AKSES_ADMIN_LOKAL.txt`; file itu tidak perlu diunggah.

## 5. Periksa setelah deploy

- Halaman awal menampilkan Coba Data Contoh dan Gunakan Data Real.
- Mode contoh menampilkan 28 siswa dan pilihan empat peran.
- Masuk mode real dengan admin; daftar siswa awal kosong sampai Anda mengisinya.
- Tambahkan satu siswa dan sesi, buka sesi pada hari kegiatan, lalu catat presensi.
- Buat akun siswa/wali dan periksa pembatasan aksesnya.
- Periksa QR dengan kamera ponsel pada alamat HTTPS deployment.
- Terbitkan rapor dan gunakan Cetak / PDF untuk menyimpannya.

## 6. Pembaruan

Push perubahan ke repository yang terhubung, atau jalankan kembali `npx vercel --prod`. Perubahan environment variable memerlukan deployment baru. Jangan menjalankan setup ulang dengan spreadsheet baru jika ingin mempertahankan data lama.

## Troubleshooting

| Gejala | Pemeriksaan |
|---|---|
| Mode real gagal memuat | Pastikan tiga variable wajib terisi dan lakukan redeploy |
| Izin Sheets ditolak | Pastikan Google Sheets API aktif dan client email service account memiliki akses Editor |
| Login berhasil tetapi mutasi ditolak | Periksa `APP_ORIGIN`, origin domain, dan apakah password awal perlu diganti |
| Login dibatasi | Tunggu 15 menit setelah batas percobaan gagal tercapai |
| Presensi mandiri ditolak | Sesi harus aktif pada tanggal kegiatannya dan siswa terdaftar pada kelas sesi |
| QR ditolak | QR berlaku 10 menit; buat QR baru untuk sesi yang masih aktif |
| Rapor wali belum tampil | Periksa hubungan siswa, periode bulan, serta status penerbitan |
| Google Sheets membatasi permintaan | Tunggu sebentar, segarkan data, lalu ulangi tindakan yang belum mendapat konfirmasi |

Referensi: [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [Node.js 24.x di Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Environment variables](https://vercel.com/docs/environment-variables), [Google Sheets API limits](https://developers.google.com/workspace/sheets/api/limits).

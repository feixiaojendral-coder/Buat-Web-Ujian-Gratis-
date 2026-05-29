# Buat Web Ujian Gratis

Web ujian online berbasis Node.js. Admin bisa membuat link ujian, membuka ujian dengan tombol start, memantau submit siswa, dan mengunduh rekap nilai Excel.

## Jalan Lokal

```bash
npm install
npm start
```

Buka:

- Siswa: `http://127.0.0.1:8002`
- Admin: `http://127.0.0.1:8002/admin.html`

Jika `DATABASE_URL` kosong, data disimpan di `data/exam-state.json` untuk pemakaian lokal.

## Deploy Gratis

Jalur gratis yang disarankan:

- GitHub untuk menyimpan kode.
- Supabase Free untuk database.
- Render Free Web Service untuk menjalankan Node.js.

GitHub Pages saja tidak cukup karena aplikasi ini butuh backend `server.js`.

## Buat Database Supabase

1. Daftar atau login ke Supabase.
2. Buat project baru dengan paket Free.
3. Buka menu project database connection.
4. Salin connection string Postgres.
5. Simpan password database karena nanti dipakai di Render.

Server akan membuat tabel otomatis saat pertama kali jalan. Kalau mau membuat manual, jalankan isi file `supabase-schema.sql` di SQL Editor Supabase.

## Deploy ke Render

1. Push repo ini ke GitHub.
2. Login ke Render.
3. Pilih `New Web Service`.
4. Connect ke repository GitHub ini.
5. Isi pengaturan:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: `Free`
6. Tambahkan environment variable:
   - `DATABASE_URL`: connection string Supabase
   - `PGSSLMODE`: `require`
7. Deploy.

Setelah deploy selesai:

- Admin: `https://nama-app.onrender.com/admin.html`
- Siswa: pakai link ujian yang dibuat dari halaman admin.

## Catatan Penting

Render Free bisa tidur kalau tidak dipakai beberapa menit. Sebelum ujian dimulai, buka halaman admin lebih dulu dan tunggu sampai web aktif.

Jangan upload `.env` atau `data/exam-state.json` ke GitHub karena bisa berisi data ujian dan jawaban siswa.

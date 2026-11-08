# PANDUAN MENJALANKAN SKRIPSICHAT

Dokumen ini berisi petunjuk teknis langkah demi langkah untuk menjalankan, menguji, dan mendemonstrasikan sistem **SkripsiChat (Academic Advisory Shield)** pada lingkungan lokal.

---

## 1. Prasyarat Sistem

Sebelum menjalankan aplikasi, pastikan perangkat Anda telah terpasang:
* **Node.js**: Versi 20.x, 22.x, atau 24.x LTS.
* **NPM**: Versi 10.x ke atas.
* **Peramban Web (Browser)**: Google Chrome, Microsoft Edge, atau Mozilla Firefox versi terbaru.
* **Kamera Webcam**: Aktif dan diizinkan pada peramban untuk modul otentikasi biometrik wajah.

---

## 2. Struktur Proyek

Repositori terbagi menjadi dua direktori utama:
* `/server`: Backend API berbasis Node.js murni (HTTP, WebSocket, SQLite, dan modul kriptografi native `node:crypto`).
* `/client`: Frontend Single Page Application berbasis Next.js 15 (App Router), React 19, dan Tailwind CSS.

---

## 3. Langkah Instalasi Dependensi

Buka terminal pada direktori root repositori, kemudian pasang seluruh dependensi untuk server dan client:

### A. Dependensi Backend (Server)
```bash
cd server
npm install
```

### B. Dependensi Frontend (Client)
```bash
cd ../client
npm install
```

---

## 4. Reset dan Inisialisasi Basis Data (Seeder)

Untuk memastikan seluruh tabel SQLite, kunci virtual dongle, dan data simulasi terpasang dengan benar, jalankan perintah reset database:

```bash
cd ../server
npm run db:reset
```

Perintah ini akan secara otomatis:
1. Membuat ulang tabel basis data pada `server/prisma/dev.db`.
2. Menghasilkan kunci hardware virtual dongle (`.skripsi_key` dan `.aegis_key`) pada direktori `server/virtual_usb_dongle/`.
3. Mendaftarkan dua akun standar akademik:
   * **Mahasiswa**: `@mahasiswa_01` (Nama: Rian Pratama) | Sandi: `SkripsiChat2026!`
   * **Dosen Pembimbing**: `@dosen_pembimbing` (Nama: Dr. Ir. Budi Santoso, M.Kom) | Sandi: `SkripsiChat2026!`
4. Mengisi data awal pesan super enkripsi, berkas terenkripsi ChaCha20, citra steganografi, dan Genesis Block.

---

## 5. Menjalankan Server Pengujian (Unit & Integration Tests)

Untuk memvalidasi bahwa seluruh fungsi kriptografi dan integrasi database berjalan 100% tanpa galat:

```bash
cd server
npm test
```
*Hasil yang diharapkan: 18/18 test PASS.*

---

## 6. Menjalankan Aplikasi

Aplikasi dijalankan dengan membuka dua terminal terpisah:

### Terminal 1: Backend Server (Port 5000)
```bash
cd server
npm run dev
```
Server akan aktif pada: `http://localhost:5000`

### Terminal 2: Frontend Client (Port 3000)
```bash
cd client
npm run dev
```
Aplikasi web dapat diakses melalui peramban pada: `http://localhost:3000`

---

## 7. Kredensial Pengguna untuk Simulasi

Gunakan akun berikut untuk menguji interaksi antar-peran (Role-Based Access Control):

| Peran | Username | Kata Sandi | Status Dongle |
| :--- | :--- | :--- | :--- |
| **Dosen Pembimbing** | `dosen_pembimbing` | `SkripsiChat2026!` | Terhubung secara default |
| **Mahasiswa** | `mahasiswa_01` | `SkripsiChat2026!` | Dapat ditukar via dropdown simulator login |

---

## 8. Panduan Pengujian Fitur pada Menu Aplikasi

1. **Halaman Login (3-Factor Authentication)**
   * Input kredensial username dan password.
   * Sistem mendeteksi status USB Dongle secara real-time.
   * Sistem melakukan pemindaian wajah melalui webcam dan mencocokkan vektor 128-float Euclidean Distance terhadap rekaman di server.
2. **Ruang Bimbingan (`/dashboard`)**
   * Menampilkan gelembung percakapan hasil dekripsi super enkripsi (Vigenere + Transposisi + AES-256).
   * Klik tombol **Kripto** pada pesan untuk memeriksa ciphertext per lapis melalui modal inspektur.
3. **Naskah & Berkas (`/dashboard/files`)**
   * Mahasiswa mengunggah berkas naskah format sembarang.
   * Berkas langsung dienkripsi dengan **ChaCha20-Poly1305** di disk server dan hash aslinya tercatat di blockchain.
   * Dosen dapat menelaah draf dan memberikan status REVISION atau APPROVED.
4. **Brankas Pesan Penting (`/dashboard/messages`)**
   * Menandai keputusan sidang/revisi penting.
   * Pesan disimpan dengan enkripsi per kolom database **AES-256-GCM** menggunakan K_master_db.
5. **Inspeksi Database SQLite (`/dashboard/db-view`)**
   * Menampilkan perbandingan langsung antara ciphertext mentah di disk SQLite vs plaintext terdekripsi.
6. **Steganografi Citra (`/dashboard/stego`)**
   * Menyisipkan teks rahasia ke kanal RGB citra PNG lossless menggunakan Spatial Domain LSB.
   * Mengukur degradasi visual menggunakan metrik PSNR (dB) dan MSE.
7. **Buku Konsultasi & Ledger Blockchain (`/dashboard/blockchain`)**
   * Tab 1: Penerbitan surat ACC sidang dengan tanda tangan digital RSA-PSS dan Proof-of-Work.
   * Tab 2: Verifikasi keaslian berkas fisik terhadap rekaman hash blockchain.
   * Tab 3: Visualisasi rantai blok berantai SHA-256 dan simulasi audit tamper (manipulasi data blok serta pemulihannya).

# SkripsiChat: Academic Advisory Shield

Sistem Informasi Bimbingan Tugas Akhir dan Konsultasi Akademik Berbasis Kriptografi Hibrida Berlapis, Biometrik Multi-Faktor, Steganografi Citra, dan Ledger Blockchain Terdistribusi.

---

## Ringkasan Proyek

SkripsiChat dirancang untuk menjawab kerentanan keamanan dan integritas pada proses bimbingan tugas akhir di perguruan tinggi. Aplikasi ini menerapkan pertahanan berlapis (*defense-in-depth*) untuk menjamin aspek Kerahasiaan (*Confidentiality*), Integritas (*Integrity*), Otentikasi (*Authentication*), dan Nirsangkal (*Non-Repudiation*) pada setiap interaksi antara mahasiswa dan dosen pembimbing.

Sistem dibangun tanpa ketergantungan pihak ketiga untuk komputasi kriptografi, melainkan mengimplementasikan algoritma standar industri secara *native* memanfaatkan modul `node:crypto`.

---

## Pemetaan Kriteria Kriptografi

Sistem ini memenuhi seluruh kriteria keamanan informasi dan kriptografi akademik:

### 1. Otentikasi Multi-Faktor (3-Factor Authentication)
* **Faktor 1 (What You Know)**: Kata sandi dengan derivasi kunci Scrypt dan *cryptographic salt* 16-byte unik per pengguna.
* **Faktor 2 (What You Have)**: Kunci perangkat fisik USB Dongle (`.skripsi_key` / `.aegis_key`) yang dienkripsi menggunakan AES-256-CBC dengan verifikasi keaslian HMAC-SHA256.
* **Faktor 3 (What You Are)**: Pengenalan biometrik wajah berbasis vektor pencocokan jarak Euclidean 128 dimensi (*Euclidean Distance Matching*) dengan ambang batas batas toleransi (*threshold*) terukur.

### 2. Pertukaran Kunci & Hierarki Kunci Sesi
* **Asymmetric Key Exchange**: Pasangan kunci RSA-2048 (SPKI/PKCS8) per pengguna. Kunci privat dilindungi di database menggunakan Key Encryption Key (KEK) berbasis kombinasi sandi pengguna dan token rahasia USB Dongle.
* **Session Key Wrapping**: Kunci percakapan sesi bimbingan ($K_{conv}$) dibungkus menggunakan RSA-OAEP (SHA-256) untuk masing-masing partisipan.
* **Subkey Derivation**: HKDF-SHA256 digunakan untuk mengekstrak subkunci terpisah untuk enkripsi teks, berkas, dan steganografi.

### 3. Super Enkripsi Pesan Bimbingan (3 Lapis)
Setiap pesan teks diskusi bimbingan diamankan melalui tiga lapisan kriptografi:
1. **Lapis 1 (Substitusi Klasik)**: Extended Vigenere Cipher (rentang modulo 256 byte penuh).
2. **Lapis 2 (Permutasi / Aljabar Klasik)**: Vernam Cipher (Stream XOR) dan Transposisi Kolom (*Columnar Transposition*).
3. **Lapis 3 (Modern Block Cipher)**: AES-256 (CBC/GCM) dengan inisialisasi IV unik per pesan.

### 4. Enkripsi Berkas Naskah Skripsi
* Menggunakan algoritma stream cipher modern **ChaCha20-Poly1305** (kunci 256-bit, nonce 96-bit, dan Authentication Tag 128-bit).
* Kunci berkas independen dari kunci pesan teks untuk mencegah kebocoran silang (*cross-compromise*).
* Menyediakan verifikasi integritas berkas asli berbasis SHA-256 dan alur telaah status draf (*Submitted, Revision, Approved*).

### 5. Perlindungan Basis Data (Database-at-Rest Encryption)
* Enkripsi per-kolom pada tabel SQLite (`User`, `ImportantMessage`) menggunakan **AES-256-GCM**.
* Melibatkan *Additional Authenticated Data* (AAD) yang mengikat nilai terenkripsi ke ID baris tabel untuk mencegah serangan pertukaran data (*ciphertext swapping attack*).
* Kunci master basis data ($K_{master\_db}$) disimpan terisolasi di lingkungan server di luar file database.

### 6. Steganografi Citra Digital
* Menyisipkan instruksi rahasia ke dalam bit *Least Significant Bit* (LSB) pada bidang spasial citra PNG lossless.
* Menggunakan kunci akses stego (*passkey*) untuk mengacak urutan penyisipan bit.
* Evaluasi kualitas citra diukur secara matematis melalui metrik *Peak Signal-to-Noise Ratio* (PSNR > 38 dB) dan *Mean Squared Error* (MSE < 0.1).

### 7. Ledger Blockchain Sederhana & Tanda Tangan Digital
* Setiap aset akademik penting (Surat ACC Sidang, Nilai, Persetujuan Bab, Draf Mahasiswa) dicatat ke dalam buku besar berantai (*Chain of Custody Ledger*).
* Menggunakan pengait hash kriptografis SHA-256 (*Hash Linking*), kanonikalisasi JSON, dan mekanisme penambangan Proof-of-Work (PoW).
* Setiap blok keputusan disahkan dengan tanda tangan digital **RSA-PSS (SHA-256)** dari Dosen Pembimbing untuk menjamin nirsangkal (*non-repudiation*).
* Dilengkapi antarmuka audit tamper untuk mendemonstrasikan deteksi otomatis terhadap manipulasi data pada blok ledger.

---

## Arsitektur Teknologi

### Backend (`/server`)
* Runtime: Node.js (ES Module & Native Crypto Engine)
* Basis Data: SQLite (`node:sqlite` Native Driver)
* Jaringan: HTTP Server & WebSocket Native Dispatcher
* Pengujian: Node.js Built-in Test Runner (`node --test`)

### Frontend (`/client`)
* Framework: Next.js 15 (App Router, React 19, TypeScript)
* Desain Antarmuka: Tailwind CSS v4, Lucide / Material Symbols Icons
* Pemrosesan Sisi Klien: Web API Canvas, FileReader, WebRTC MediaDevices (Webcam)

---

## Panduan Instalasi dan Menjalankan Sistem

Instruksi lengkap mengenai langkah konfigurasi, instalasi dependensi, reset basis data, dan tata cara demonstrasi per modul dapat dilihat pada file:
```
CARA_RUNNING.md
```

---

## Struktur Direktori Utama

```
SkripsiChat/
├── CARA_RUNNING.md                 # Petunjuk instalasi dan eksekusi sistem
├── README.md                       # Dokumentasi spesifikasi sistem
├── client/                         # Kode sumber frontend Next.js
│   ├── src/
│   │   ├── app/                    # Routing halaman (Login, Register, Dashboard)
│   │   ├── features/               # Modul fitur (Auth, Chat, Files, Stego, Blockchain, DB)
│   │   └── lib/                    # Utilitas API dan pengolahan biometrik klien
├── server/                         # Kode sumber backend Node.js
│   ├── src/
│   │   ├── adapters/               # Adapter simulasi USB Dongle dan Biometrik
│   │   ├── crypto/                 # Implementasi 4 pilar algoritma kriptografi
│   │   ├── database/               # Skema tabel SQLite dan seeder data awal
│   │   ├── routes/ & controllers/  # API Dispatcher dan kontrol alur logika
│   │   └── services/               # Layanan bisnis (Auth, Keys, File, Chain, Vault)
│   ├── uploads/                    # Direktori penyimpanan berkas naskah terenkripsi
│   └── virtual_usb_dongle/         # Direktori simulasi hardware keyfile
```

---

## Verifikasi dan Pengujian

Seluruh logika kriptografi dan endpoint sistem telah divalidasi menggunakan pengujian otomatis:
```bash
# Pengujian Backend (18 test suites)
cd server
npm test

# Pengecekan Konsistensi Tipe Data
npx tsc --noEmit
```

---

## Lisensi dan Hak Cipta

Proyek ini dikembangkan sebagai prototipe akademik sistem keamanan informasi dan kriptografi tugas akhir. Seluruh hak cipta dilindungi oleh pengembang.

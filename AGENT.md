# Context & Guide for AI Agent: SkripsiChat (Kriptografi Workspace)

Dokumen ini adalah **petunjuk utama (System Context & Rules of Engagement)** untuk AI coding assistant (Antigravity/Claude/ChatGPT) yang bekerja di repositori ini.

---

## 1. Identitas Proyek & Prinsip Dasar
* **Nama Proyek**: **SkripsiChat** (Platform Messenger Akademik Dosen-Mahasiswa Terenkripsi).
* **Domain Masalah**: Bimbingan skripsi dan validasi aset akademik (nilai, sertifikat, draf, ACC sidang) menggunakan protokol kriptografi berlapis.
* **Mata Kuliah**: Tugas Akhir Kriptografi (Tim 2 Orang).
* **Dokumen Spesifikasi Acuan**: Wajib merujuk pada [SkripsiChat_Spesifikasi.md](./SkripsiChat_Spesifikasi.md).
* **Dokumen Rencana Kerja**: Wajib merujuk pada [PLAN.md](./PLAN.md).
* **Dokumen Arsitektur Teknis**: Wajib merujuk pada [ARSITEKTUR.md](./ARSITEKTUR.md).

---

## 2. Inventaris Kode & Modul Existing (Bagian 2.2 Spesifikasi)

| Pertanyaan | Jawaban / Status di Repo |
|---|---|
| **Bahasa & Runtime** | Node.js v24.11.1 (Native ESM & TypeScript via `--input-type=module` / `allowImportingTsExtensions`) |
| **Framework Backend** | HTTP Server bawaan `node:http` (port 4000) dengan modular router di `server/src/routes/` |
| **Framework Frontend** | Next.js 16 (React 19 + TypeScript, port 3000) di folder `client/` |
| **Database** | SQLite lokal via modul bawaan Node.js `node:sqlite` (`server/prisma/dev.db`) |
| **Kriptografi Existing** | Built-in `node:crypto` (AES-256-GCM, AES-256-CBC, ChaCha20-Poly1305, SHA-256, HMAC, Scrypt) + manual Vigenère & Vernam |
| **Deteksi Dongle** | `server/src/crypto/1_dongleKey.ts` (scan drive `D:\`–`Z:\` & `virtual_usb_dongle/.aegis_key` dengan AES-256-CBC & HMAC-SHA256) |
| **Biometrik Wajah** | `server/src/crypto/1_passwordHash.ts` & `client/src/lib/biometric.ts` (Ekstraksi 128-float facial descriptor & Euclidean Distance matcher) |
| **Penyimpanan Wajah** | Vektor wajah & foto referensi tersimpan di SQLite tabel `User` terenkripsi dengan AES-256-GCM (`faceDescriptorEncrypted`, `facePhotoEncrypted`) |

---

## 3. Aturan Kerja Wajib untuk AI Agent (DOs & DONTs)

> [!IMPORTANT]
> **Aturan 1: Lindungi Kode Login & Hardware Dongle yang Sudah Berjalan**
> Kode deteksi USB Dongle (`1_dongleKey.ts`) dan verifikasi Wajah (`1_passwordHash.ts`) sudah teruji **100% PASS**. **JANGAN MEROMBAK ULANG DARI NOL**. Bungkus dengan adapter `DongleProvider` dan `FaceVerifier` sesuai Bagian 2.3 `SkripsiChat_Spesifikasi.md`.

> [!WARNING]
> **Aturan 2: Zero Plaintext di Sisi Server (Client-Side Encryption Priority)**
> Seluruh pesan teks, file bimbingan skripsi, foto catatan, dan private key user harus sampai di Server dalam bentuk *ciphertext* (`EncryptedBlob`). Server dan database hanya bertindak sebagai *untrusted storage & relay*.

> [!NOTE]
> **Aturan 3: Jangan Menulis Primitif Modern Sendiri**
> Gunakan `node:crypto` untuk AES-GCM, ChaCha20-Poly1305, RSA-OAEP, RSA-PSS, SHA-256, dan HKDF. Hanya cipher klasik (**Extended Vigenère** dan **Transposisi Kolom**) yang ditulis secara manual karena merupakan kriteria eksplisit tugas.

> [!TIP]
> **Aturan 4: Traceability & Testing Wajib Hijau**
> Setiap penambahan atau perubahan fungsi WAJIB menyertakan kode requirement di komentar kode (contoh: `// Ref: FR-CHAT-02, FR-KEY-03`) dan unit test di `server/src/crypto/crypto.test.ts` atau `server/src/server.test.ts`. Perintah `npm test` harus selalu **0 fail**.

---

## 4. Pemetaan Fungsi Existing -> Modul Target SkripsiChat

| Modul Target | File Lokasi Target | Status / Asal Kode Existing |
|---|---|---|
| `adapters/` | `server/src/adapters/` | **WRAP**: `1_dongleKey.ts` (`DongleProvider`) & `1_passwordHash.ts` (`FaceVerifier`) |
| `keys/` | `server/src/crypto/keys.ts` | **NEW**: RSA-2048 keypair, KEK derivation (password+dongle), K_conv wrapping, HKDF subkeys |
| `crypto/classic/` | `server/src/crypto/classic.ts` | **EXTEND**: Vigenère (byte-wise) + Transposition Cipher (16 kolom dari subkey) |
| `crypto/aead/` | `server/src/crypto/aead.ts` | **EXTEND**: AES-256-GCM (Super Enkripsi Lapis 3) & ChaCha20-Poly1305 (Draf Skripsi) |
| `chat/` | `server/src/routes/chat.routes.ts` | **REFACTOR**: Menggantikan `message.routes.ts` (Session-based, Vigenere->Transposisi->AES-GCM) |
| `vault/` | `server/src/routes/vault.routes.ts` | **NEW**: Pesan penting (ACC, Revisi, Jadwal Sidang) terenkripsi AES-256-GCM via Master Key |
| `files/` | `server/src/routes/files.routes.ts` | **EXTEND**: Menggantikan `file.routes.ts` (ChaCha20-Poly1305 streaming chunk + auto chain anchor) |
| `stego/` | `server/src/routes/stego.routes.ts` | **KEEP/EXTEND**: `3_steganography.ts` (LSB PNG cover + AES-GCM payload) |
| `chain/` | `server/src/routes/chain.routes.ts` | **EXTEND**: `4_blockchain.ts` ditambah tipe aset akademik + RSA-PSS digital signature dosen |

---

## 5. Cara Menjalankan & Memverifikasi Repositori
* **Jalankan Unit & Integration Tests**:
  ```powershell
  cd D:\dev\webdev\project\kriptografi\AegisVault\server
  npm test
  ```
* **Jalankan Backend Server (:4000)**:
  ```powershell
  cd D:\dev\webdev\project\kriptografi\AegisVault\server
  npm start
  ```
* **Jalankan Frontend Next.js Client (:3000)**:
  ```powershell
  cd D:\dev\webdev\project\kriptografi\AegisVault\client
  npm run dev
  ```

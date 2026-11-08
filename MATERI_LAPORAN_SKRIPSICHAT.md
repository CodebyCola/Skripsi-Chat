# MATERI LAPORAN TUGAS AKHIR / PROYEK KRIPTOGRAFI: SKRIPSICHAT

> **INSTRUKSI UNTUK MODEL AI PEMBUAT DOKUMEN (.DOCX):**
> 1. Gunakan seluruh materi di dalam dokumen Markdown ini untuk menyusun laporan akademik resmi dalam format Microsoft Word (`.docx`) menggunakan Bahasa Indonesia baku (gaya penulisan ilmiah/skripsi).
> 2. Pertahankan seluruh rumus matematika, tabel spesifikasi kriptografi, struktur basis data, arsitektur sistem, dan rincian pengujian yang tertulis di sini karena seluruhnya diambil langsung dari kode sumber aktual proyek.
> 3. Seluruh 7 pilar kriptografi dan antarmuka pengguna telah **SELESAI 100% DIIMPLEMENTASIKAN DAN TERUJI**. Tidak ada lagi modul yang berstatus tertunda. Konversikan materi di bawah ini menjadi bab dan sub-bab laporan yang utuh, formal, dan komprehensif.

---

## INFORMASI UMUM PROYEK

- **Nama Aplikasi:** SkripsiChat (*Academic Advisory Shield*)
- **Deskripsi Singkat:** Aplikasi *messenger* bimbingan tugas akhir/skripsi antara Mahasiswa dan Dosen Pembimbing dengan pengamanan berlapis berbasis Hardware USB Dongle, Biometrik Wajah, Super Enkripsi Teks, Enkripsi Berkas ChaCha20-Poly1305, Enkripsi Kolom Basis Data AES-256-GCM, Steganografi Citra PNG Lossless (LSB), dan Buku Besar Blockchain SHA-256 bertanda tangan digital RSA-PSS.
- **Arsitektur Teknologi:**
  - **Frontend (`client/`):** Next.js (App Router, Turbopack), React 19, TypeScript 5, Tailwind CSS 4. Berjalan pada port `3000`.
  - **Backend (`server/`):** Node.js v24 (Native HTTP Server & Native `node:sqlite` DatabaseSync), modul kriptografi murni (`node:crypto`), TypeScript. Berjalan pada port `4000`.
  - **Basis Data:** SQLite (`server/prisma/dev.db`) dengan penyimpanan ciphertext dan template biometrik terenkripsi.

---

# BAB I: PENDAHULUAN

## 1.1 Latar Belakang
Proses bimbingan tugas akhir (skripsi) antara mahasiswa dan dosen pembimbing melibatkan pertukaran informasi akademik yang sangat sensitif, meliputi diskusi gagasan penelitian, pengiriman berkas draf naskah skripsi (PDF/DOCX), penyampaian catatan revisi mayor, pemberian persetujuan sidang (ACC), hingga penerbitan dokumen nilai dan lembar pengesahan. Pada aplikasi pesan instan konvensional, terdapat sejumlah celah keamanan kritis:
1. **Kerentanan Akses Akun:** Jika perangkat mahasiswa atau dosen dipinjam atau kata sandi bocor, pihak ketiga dapat mengakses riwayat bimbingan dan memalsukan pesan persetujuan.
2. **Kerahasiaan Pesan dan Naskah:** Pesan teks dan berkas draf skripsi rentan terhadap penyadapan maupun kebocoran di sisi server penyimpanan.
3. **Kebocoran Basis Data (*Database Breach*):** Apabila file basis data di server berhasil disalin oleh pihak yang tidak berwenang (*administrator* nakal atau penyerang), catatan keputusan penting seperti status ACC atau revisi dapat terbaca apabila disimpan dalam bentuk teks biasa (*plaintext*).
4. **Pemalsuan Dokumen Akademik (Surat ACC & Nilai):** Dokumen persetujuan sidang (ACC), transkrip nilai bimbingan, dan lembar pengesahan rentan dimanipulasi secara sepihak tanpa mekanisme verifikasi keaslian kriptografis yang tidak dapat diubah (*immutable*).

Untuk menjawab permasalahan tersebut, dikembangkan **SkripsiChat**, sebuah platform bimbingan akademik terenkripsi yang mengintegrasikan tujuh pilar kriptografi modern dan klasik ke dalam satu alur kerja akademik yang utuh.

## 1.2 Rumusan Masalah
1. Bagaimana mengimplementasikan mekanisme otentikasi multi-faktor yang mewajibkan keberadaan perangkat fisik (*Hardware USB Dongle*), kata sandi yang diamankan dengan fungsi penurunan kunci (*Key Derivation Function*), serta verifikasi biometrik wajah?
2. Bagaimana mengamankan pesan teks percakapan bimbingan menggunakan skema *Super Enkripsi* yang menggabungkan algoritma kriptografi klasik dan modern?
3. Bagaimana mengamankan berkas draf skripsi menggunakan algoritma enkripsi aliran (*stream cipher*) yang berbeda dari enkripsi pesan teks serta menjamin keutuhan berkasnya?
4. Bagaimana mengenkripsi catatan keputusan penting secara langsung pada kolom basis data (*Database-at-Rest Encryption*) menggunakan kunci master eksternal?
5. Bagaimana menyembunyikan informasi/catatan bimbingan ke dalam media citra digital menggunakan teknik steganografi tanpa merusak kualitas visual citra?
6. Bagaimana mengamankan aset akademik penting (Surat ACC, Nilai, Sertifikat) menggunakan teknologi *Blockchain* sederhana dengan tanda tangan digital asimetris?

## 1.3 Pemetaan Pemenuhan 7 Kriteria Penilaian Tugas Akhir

| No | Kriteria Penilaian | Algoritma & Mekanisme Kriptografi | File Implementasi Aktual | Status Implementasi |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Login biometrik & hanya dapat dihidupkan dengan bantuan *dongle* | **Hardware USB Dongle Gate** (`.skripsi_key` berenkripsi AES-256-CBC + HMAC-SHA256) + **Biometrik Wajah** (128-float descriptor, *Euclidean Distance* < 0.48) + **Runtime Lockout Overlay** | `server/src/crypto/1_dongleKey.ts`<br>`server/src/adapters/dongle.adapter.ts`<br>`server/src/adapters/face.adapter.ts`<br>`client/src/features/login/`<br>`client/src/features/dashboard/hooks/useDongleGuard.ts` | **SELESAI 100%** (Server & Client) |
| **2** | Login aplikasi menggunakan algoritma kriptografi | **Scrypt KDF** (N=16384, r=8, p=1, *salt* 16 byte) untuk *password hashing* & penurunan **KEK** (*Key Encryption Key*) 32-byte guna membuka kunci privat RSA-2048 pengguna yang dibungkus **AES-256-GCM** | `server/src/crypto/1_passwordHash.ts`<br>`server/src/services/keys.service.ts`<br>`server/src/services/auth.service.ts`<br>`server/src/services/session.service.ts` | **SELESAI 100%** (Server & Client) |
| **3** | Pesan teks dienkripsi menggunakan *Super Enkripsi* (Klasik + Modern) | **3-Layer Super Encryption:**<br>1. *Extended Vigenère Cipher* (Mod 256)<br>2. *Columnar Transposition* 16-Kolom (Fisher-Yates SHA-256) / *Vernam XOR*<br>3. **AES-256-GCM** (12B Nonce + 16B Tag + AAD `convId\|\|senderId`) | `server/src/crypto/2_superEncryption.ts`<br>`server/src/services/chat.service.ts`<br>`client/src/features/dashboard/components/ChatStream.tsx`<br>`client/src/features/dashboard/components/CipherInspectModal.tsx` | **SELESAI 100%** (Server & Client) |
| **4** | Pesan file dienkripsi menggunakan kriptografi yang berbeda dari teks | **ChaCha20-Poly1305** (*Authenticated Stream Cipher*, kunci 256-bit `k_file` dari HKDF, Nonce 96-bit, Poly1305 Tag 128-bit, AAD `convId\|version\|sha256`) + Verifikasi **SHA-256** berkas asli | `server/src/crypto/2_fileChaCha20.ts`<br>`server/src/services/file.service.ts`<br>`client/src/features/files/components/FilesView.tsx`<br>`client/src/features/files/components/ReviewPanel.tsx` | **SELESAI 100%** (Server & Client) |
| **5** | Pesan penting dienkripsi pada basis data yang digunakan | **Database-at-Rest Column Encryption** menggunakan **AES-256-GCM** dengan kunci eksternal `K_master_db` dan AAD `important_messages.content\|<msgId>` pada tabel `ImportantMessage` & kolom sensitif `User` | `server/src/crypto/3_dbEncryption.ts`<br>`server/src/services/vault.service.ts`<br>`client/src/features/messages/components/MessagesView.tsx`<br>`client/src/features/db-inspector/components/DbInspectorView.tsx` | **SELESAI 100%** (Server & Client) |
| **6** | Pesan gambar diamankan menggunakan konsep steganografi | **Spatial Domain LSB (Least Significant Bit)** 3-kanal RGB pada citra **PNG Lossless** dengan payload biner `SCST` berenkripsi AES-256-GCM (subkey `k_stego` dari sesi HKDF) + Evaluasi **MSE** & **PSNR > 50 dB** | `server/src/crypto/3_steganography.ts`<br>`server/src/services/stego.service.ts`<br>`client/src/features/stego/components/StegoView.tsx`<br>`client/src/features/stego/components/StegoEmbedForm.tsx` | **SELESAI 100%** (Server & Client) |
| **7** | Aset penting diamankan menggunakan teknologi *blockchain* sederhana | **SHA-256 Hash Chaining** + **Canonical JSON** + **Proof-of-Work (PoW)** (*difficulty prefix* `"00"`) + **Tanda Tangan Digital RSA-PSS (SHA-256)** oleh Dosen Penerbit pada aset nilai/ACC/sertifikat | `server/src/crypto/4_blockchain.ts`<br>`server/src/services/chain.service.ts`<br>`client/src/features/blockchain/components/BlockchainView.tsx`<br>`client/src/features/blockchain/components/BlockchainControls.tsx` | **SELESAI 100%** (Server & Client) |

---

# BAB II: LANDASAN TEORI DAN SPESIFIKASI KRIPTOGRAFI

## 2.1 Otentikasi Multi-Faktor: Dongle Fisik, Scrypt KDF, dan Biometrik Wajah

### 2.1.1 Hardware USB Dongle (`.skripsi_key`)
Aplikasi menerapkan gerbang perangkat keras (*Hardware Gate*) di mana pengguna tidak dapat masuk atau mempertahankan sesi aktif apabila *dongle* USB tidak terpasang. File kunci pada *dongle* disimpan dalam format terenkripsi menggunakan **AES-256-CBC** dan dilindungi dari modifikasi menggunakan **HMAC-SHA256**:
$$\text{Payload}_{\text{dongle}} = \text{IV}_{16\text{B}} \parallel \text{HMAC-SHA256}(\text{IV} \parallel C) \parallel C$$
di mana $C = \text{AES-256-CBC}_{\text{Enc}}(K_{\text{hardware}}, \text{JSON}(\text{username}, \text{dongleId}, \text{secret}))$.

### 2.1.2 Pengamanan Kata Sandi dengan Scrypt
Kata sandi pengguna dicacah menggunakan fungsi penurunan kunci berbasis memori (**Scrypt**) dengan parameter:
- Cost factor ($N$) = $16384$ ($2^{14}$), Block size ($r$) = $8$, Parallelization ($p$) = $1$
- Panjang *Salt* acak = $16\text{ byte}$, Panjang keluaran *Hash* = $64\text{ byte}$
- Verifikasi menggunakan perbandingan waktu konstan (`crypto.timingSafeEqual`).

### 2.1.3 Verifikasi Biometrik Wajah (*Euclidean Distance*)
Wajah pengguna direpresentasikan sebagai vektor fitur berdimensi 128 (*128-D float descriptor*). Saat login, jarak *Euclidean* antara vektor wajah saat ini ($\mathbf{v}_{\text{login}}$) dan vektor referensi di basis data ($\mathbf{v}_{\text{db}}$) dihitung menggunakan rumus:
$$d(\mathbf{v}_{\text{login}}, \mathbf{v}_{\text{db}}) = \sqrt{\sum_{i=1}^{128} \left(v_{\text{login}, i} - v_{\text{db}, i}\right)^2}$$
Verifikasi dinyatakan **COCOK (MATCH)** apabila $d < 0.48$. Di dalam basis data SQLite, vektor wajah disimpan dalam keadaan terenkripsi AES-256-GCM.

---

## 2.2 Hierarki Kunci Kriptografi (RSA-2048, KEK, dan HKDF-SHA256)

1. **Key Encryption Key ($\text{KEK}_{\text{user}}$):**
   $$\text{KEK}_{\text{user}} = \text{Scrypt}(\text{password} \parallel \text{dongle\_secret}, \text{kdf\_salt}, 32\text{ byte})$$
2. **Pembungkusan Kunci Privat Pengguna (RSA-2048):**
   $$\text{PrivKey}_{\text{enc}} = \text{AES-256-GCM}_{\text{Enc}}(\text{KEK}_{\text{user}}, \text{Nonce}_{12\text{B}}, \text{PrivKey}_{\text{PEM}}, \text{AAD}=\text{username})$$
   Saat login, $\text{PrivKey}_{\text{PEM}}$ dibuka hanya di memori sesi (*in-memory session*) dan langsung dihapus (*zeroized*) saat *logout* atau *idle-lock* (15 menit).
3. **Kunci Percakapan ($K_{\text{conv}}$) & RSA-OAEP Key Wrapping:**
   Setiap ruang bimbingan memiliki kunci acak $K_{\text{conv}}$ (32 byte) yang dibungkus dengan **RSA-OAEP (SHA-256)** menggunakan kunci publik Mahasiswa (`wrappedKeyStudent`) dan kunci publik Dosen (`wrappedKeyLecturer`).
4. **Penurunan Sub-Kunci Percakapan (HKDF-SHA256):**
   Dari $K_{\text{conv}}$, diturunkan 5 sub-kunci independen melalui **HKDF-SHA256** (`salt = "skripsichat-v1-subkey"`):
   - $k_{\text{text\_vig}}$ (16B, `info = "text-vig"`)
   - $k_{\text{text\_trans}}$ (16B, `info = "text-trans"`)
   - $k_{\text{text\_aes}}$ (32B, `info = "text-aes"`)
   - $k_{\text{file}}$ (32B, `info = "file-chacha"`)
   - $k_{\text{stego}}$ (32B, `info = "stego-lsb"`)

---

## 2.3 Super Enkripsi Pesan Teks (Vigenère + Transposisi Kolom + AES-256-GCM)

1. **Pra-pemrosesan Panjang & Padding:**
   $$B_0 = \text{PKCS7\_Pad}(\text{uint32\_be}(|P|) \parallel P, 16)$$
2. **Tahap 1 — Substitusi Klasik (*Extended Vigenère Cipher* Mod 256):**
   $$B_1[i] = \left(B_0[i] + k_{\text{text\_vig}}[i \bmod 16]\right) \bmod 256$$
3. **Tahap 2 — Permutasi Klasik (*Columnar Transposition* 16-Kolom):**
   Permutasi $\pi$ sepanjang 16 kolom dibangkitkan secara deterministik dari $k_{\text{text\_trans}}$ melalui *Fisher-Yates Shuffle* berbasis `SHA-256(k_text_trans || counter)`. Matriks byte dibaca per kolom sesuai urutan $\pi$ menghasilkan $B_2$.
4. **Tahap 3 — Kriptografi Modern (AES-256-GCM):**
   $$(C, \text{Tag}_{16\text{B}}) = \text{AES-256-GCM}_{\text{Enc}}(k_{\text{text\_aes}}, \text{Nonce}_{12\text{B}}, B_2, \text{AAD}=\text{convId}\parallel\text{senderId})$$

---

## 2.4 Enkripsi Berkas Naskah Skripsi (ChaCha20-Poly1305 & SHA-256)

- Menggunakan *stream cipher* **ChaCha20-Poly1305** (RFC 8439) dengan kunci $k_{\text{file}}$ (32 byte), Nonce 12 byte, Tag Poly1305 16 byte, dan AAD `convId|version|originalSha256`.
- Memvalidasi ekstensi dan *magic bytes* dokumen (`.pdf` dengan `%PDF-` dan `.docx` dengan `PK\x03\x04`).
- Memverifikasi keutuhan berkas pasca-dekripsi menggunakan hash **SHA-256**.

---

## 2.5 Enkripsi Kolom Basis Data (*Database-at-Rest Column Encryption*)

Menggunakan **AES-256-GCM** dengan kunci master eksternal $K_{\text{master\_db}} = \text{SHA-256}(\text{SKRIPSICHAT\_MASTER\_DB\_KEY})$ dan AAD `important_messages.content|<messageId>`. Seluruh pesan penting (`ACC`, `REVISI_MAYOR`, `REVISI_MINOR`, `JADWAL_SIDANG`) dan kolom identitas sensitif tersimpan sebagai ciphertext di dalam SQLite.

---

## 2.6 Steganografi Citra Digital (Spatial Domain LSB PNG Lossless)

Menyisipkan bit pesan terenkripsi (dengan *header* panjang 32-bit) ke dalam bit paling tidak berarti (LSB) pada 3 kanal warna (R, G, B) citra PNG Lossless. Kualitas citra diukur menggunakan MSE dan PSNR:
$$\text{MSE} = \frac{1}{3 \cdot W \cdot H} \sum_{x=0}^{W-1} \sum_{y=0}^{H-1} \sum_{c \in \{R,G,B\}} \left(I_{\text{cover}}(x,y,c) - I_{\text{stego}}(x,y,c)\right)^2$$
$$\text{PSNR} = 10 \cdot \log_{10}\left(\frac{255^2}{\text{MSE}}\right) \text{ dB}$$

---

## 2.7 Blockchain Aset Akademik & Tanda Tangan Digital RSA-PSS

Setiap penerbitan aset akademik (`SURAT_ACC`, `TRANSKRIP_NILAI`, `LEMBAR_PENGESAHAN`) menghasilkan payload **Canonical JSON** yang memuat `docHash` (SHA-256 dokumen), ditandatangani secara digital oleh Dosen menggunakan **RSA-PSS (SHA-256)** dengan salt 32 byte, dan ditambang ke dalam blok baru melalui mekanisme **Proof-of-Work (PoW)** yang mengikat `previousHash` blok sebelumnya dengan difficulty target `"00"`.

---

# BAB III: ANALISIS DAN PERANCANGAN SISTEM

## 3.1 Struktur Direktori Proyek

- `server/src/adapters/`: `dongle.adapter.ts` (`DongleProvider`), `face.adapter.ts` (`FaceVerifier`)
- `server/src/crypto/`: `1_passwordHash.ts`, `1_dongleKey.ts`, `2_superEncryption.ts`, `2_fileChaCha20.ts`, `3_dbEncryption.ts`, `3_steganography.ts`, `4_blockchain.ts`
- `server/src/services/`: `keys.service.ts`, `session.service.ts`, `auth.service.ts`, `chat.service.ts`, `file.service.ts`, `vault.service.ts`, `stego.service.ts`, `chain.service.ts`, `admin.service.ts`, `audit.service.ts`
- `client/src/features/`: `login/`, `dashboard/`, `files/`, `messages/`, `stego/`, `blockchain/`, `db-inspector/`

## 3.2 Matriks Aktor dan Hak Akses (RBAC)

| Kapabilitas Sistem | Mahasiswa (`STUDENT`) | Dosen (`LECTURER`) | Admin (`ADMIN`) |
| :--- | :---: | :---: | :---: |
| Login Multi-Faktor (Password + USB Dongle + Biometrik Wajah) | Ya | Ya | Ya |
| Mengirim & Membaca Chat Super Enkripsi pada Percakapan Bimbingan | Ya | Ya | Tidak |
| Mengunggah & Mengunduh Draf Skripsi Terenkripsi ChaCha20-Poly1305 | Ya | Ya | Tidak |
| Menelaah Draf Skripsi (`REVISION` / `APPROVED` + Catatan) | Tidak | **Ya** | Tidak |
| Menandai/Mencabut Pesan Penting ke Vault Database (`ACC`/`REVISI`/`JADWAL`) | Tidak | **Ya** | Tidak |
| Menyisipkan & Mengekstrak Steganografi LSB pada Citra PNG | Ya | Ya | Tidak |
| Menerbitkan Aset Akademik ke Blockchain dengan Tanda Tangan RSA-PSS | Tidak | **Ya** | Tidak |
| Memverifikasi Keaslian Dokumen terhadap Blockchain & Validasi Rantai | Ya | Ya | Ya |
| Provisioning Akun, Penetapan Pembimbing, & Melihat Audit Log | Tidak | Tidak | **Ya** |

---

# BAB IV: IMPLEMENTASI DAN PENGUJIAN SISTEM

## 4.1 Modul yang Telah Selesai Diimplementasikan

1. **Seluruh Engine Kriptografi & Layanan Backend (`server/src/`):** **SELESAI 100%** mencakup 7 pilar kriptografi dan lulus pengujian unit otomatis.
2. **Otentikasi 3-Langkah (`client/src/features/login/`):** **SELESAI 100%** (Validasi Kredensial, Pemeriksaan Hardware USB Dongle, Pemindaian Wajah via Webcam, dan Pembukaan Kunci Privat RSA-2048 ke Sesi Server).
3. **Fondasi Dashboard & Guard Navigasi Peran:** **SELESAI 100%** (`DashboardSidebar.tsx`, `DashboardHeader.tsx`, `DashboardLayout.tsx`, dan `DongleLockModal.tsx`).
4. **Ruang Bimbingan & Super Enkripsi Chat Sesi:** **SELESAI 100%** (`DashboardWorkspace.tsx`, `ChatStream.tsx`, `ChatInputDock.tsx`, `CipherInspectModal.tsx`).
5. **Naskah & Berkas ChaCha20-Poly1305 Sesi:** **SELESAI 100%** (`FilesView.tsx`, `FileUploadCard.tsx`, `FileItemCard.tsx`, `ReviewPanel.tsx`).
6. **Inspektur Basis Data SQLite Mentah (`/dashboard/db-view`):** **SELESAI 100%** (`DbInspectorView.tsx`).

---

## 4.2 Detail Implementasi Antarmuka & Alur Kriptografi Fitur Lanjutan

### 4.2.1 Implementasi Halaman Pesan Penting & Vault Database-at-Rest (`/dashboard/messages`)
- **Tujuan:** Memenuhi Kriteria #5, yaitu membuktikan bahwa keputusan penting dosen (status ACC, catatan revisi mayor, dan jadwal sidang) terenkripsi langsung di basis data SQLite pada tingkat kolom (*column encryption*) menggunakan kunci master yang terpisah dari database.
- **Komponen Kunci:**
  - `client/src/features/messages/components/MessagesView.tsx`
  - `client/src/features/messages/components/ImportantMessageCard.tsx`
  - `server/src/services/vault.service.ts`
- **Alur Kerja & Mekanisme Kriptografi:**
  1. **Pencatatan Keputusan Akademik:** Dosen dapat menandai pesan bimbingan krusial melalui tombol "Penting" di gelembung obrolan atau melalui form pada halaman `/dashboard/messages`. Kategori yang didukung meliputi `ACC`, `REVISI_MAYOR`, `REVISI_MINOR`, dan `JADWAL_SIDANG`.
  2. **Enkripsi Kolom AES-256-GCM:** Teks keputusan dienkripsi menggunakan kunci master eksternal $K_{\text{master\_db}} = \text{SHA-256}(\text{SKRIPSICHAT\_MASTER\_DB\_KEY})$ dengan Nonce acak 12 byte dan pengikatan konteks AAD `important_messages.content|<messageId>`.
  3. **Penyimpanan di SQLite:** Kolom tabel `ImportantMessage` hanya menyimpan nilai heksadesimal acak `contentEnc`, `nonceHex`, dan `authTagHex`.
  4. **Tampilan Ganda (*Dual View*):**
     - **Tampilan Pengguna:** Mahasiswa dan Dosen melihat daftar keputusan akademik yang telah didekripsi secara transparan lengkap dengan badge kategori dan waktu penetapan.
     - **Tab Inspeksi Mentah SQLite:** Menampilkan perbandingan tabel antara ciphertext mentah di disk vs hasil dekripsi aplikasi, membuktikan tidak adanya teks biasa yang tersimpan di server.
  5. **Penegakan RBAC:** Mahasiswa hanya memiliki akses baca (*read-only*), sedangkan Dosen Pembimbing berwenang menandai dan mencabut status penting (`unmarkImportantAs`).

### 4.2.2 Implementasi Steganografi Citra Dokumen Berbasis Sesi Otomatis (`/dashboard/stego`)
- **Tujuan:** Memenuhi Kriteria #6, yaitu menyembunyikan catatan dokumen skripsi rahasia ke dalam media gambar PNG lossless tanpa memerlukan input kata sandi manual, melainkan terikat langsung pada sesi percakapan bimbingan aktif.
- **Komponen Kunci:**
  - `client/src/features/stego/components/StegoView.tsx`
  - `client/src/features/stego/components/StegoEmbedForm.tsx`
  - `client/src/features/stego/components/StegoGalleryItem.tsx`
  - `server/src/services/stego.service.ts`
  - `server/src/crypto/3_steganography.ts`
- **Alur Kerja & Mekanisme Kriptografi:**
  1. **Penurunan Kunci Sesi Otomatis ($k_{\text{stego}}$):** Kunci steganografi diturunkan secara deterministik dari kunci sesi percakapan $K_{\text{conv}}$ menggunakan **HKDF-SHA256** dengan label `info: "stego-lsb"`. Hal ini menghilangkan kebutuhan kata sandi manual dan mencegah pihak luar mengekstrak dokumen bimbingan.
  2. **Format Payload Biner `SCST`:** Payload terstruktur dibentuk dengan format:
     $$\text{Magic}_{16\text{B}} \parallel \text{Len}_{4\text{B}} \parallel \text{Nonce}_{12\text{B}} \parallel \text{Ciphertext}_{\text{AES-GCM}} \parallel \text{AuthTag}_{16\text{B}}$$
  3. **Penanaman LSB (Spatial Domain):** Bit-bit payload biner disisipkan secara sekuensial pada bit paling rendah (LSB) kanal warna R, G, B dari citra PNG.
  4. **Metrik Kualitas Citra Objektif:**
     - Sistem menghitung Mean Squared Error (MSE) dan Peak Signal-to-Noise Ratio (PSNR) secara otomatis pasca-penyisipan.
     - Hasil pengujian empiris menunjukkan nilai $\text{MSE} < 0.005$ dan $\text{PSNR} > 50\text{ dB}$, melampaui batas ambang standar persepsi mata manusia ($38\text{ dB}$).
  5. **Ekstraksi & Validasi Otentikasi:** Saat gambar diunduh atau diekstrak oleh peserta percakapan, sistem mendekripsi payload dengan subkey $k_{\text{stego}}$ dan memvalidasi AuthTag GCM serta kesesuaian `convId`. Jika gambar dimanipulasi atau diakses pihak luar, sistem menolak dengan kode kesalahan `ERR_DECRYPT_FAILED`.

### 4.2.3 Implementasi Buku Konsultasi & ACC Blockchain dengan Tanda Tangan Digital RSA-PSS (`/dashboard/blockchain`)
- **Tujuan:** Memenuhi Kriteria #7, yaitu mengamankan aset akademik penting (Surat ACC Sidang, Rekapitulasi Nilai Bimbingan, Lembar Pengesahan) menggunakan buku besar *blockchain* yang tidak dapat dimanipulasi (*tamper-proof*).
- **Komponen Kunci:**
  - `client/src/features/blockchain/components/BlockchainView.tsx`
  - `client/src/features/blockchain/components/BlockCard.tsx`
  - `client/src/features/blockchain/components/BlockchainControls.tsx`
  - `client/src/features/blockchain/components/BlockchainStatusBanner.tsx`
  - `server/src/services/chain.service.ts`
  - `server/src/crypto/4_blockchain.ts`
- **Alur Kerja & Mekanisme Kriptografi:**
  1. **Penerbitan Aset Akademik oleh Dosen:**
     - Dosen memilih jenis aset (`SURAT_ACC`, `TRANSKRIP_NILAI`, `LEMBAR_PENGESAHAN`).
     - Dokumen/data akademik dihitung ringkasan pesannya ($\text{SHA-256}(\text{assetData})$).
     - Dosen menandatangani hash tersebut menggunakan kunci privat RSA-2048 dengan skema **RSA-PSS (Probabilistic Signature Scheme)** menggunakan *salt* 32 byte.
  2. **Penambangan Blok Proof-of-Work (PoW):**
     - Blok baru memuat indeks, timestamp ISO, hash blok sebelumnya (`previousHash`), data aset, tanda tangan dosen, dan *nonce*.
     - Proses *mining* mencari *nonce* sedemikian rupa sehingga $\text{SHA-256}(\text{BlockHeader})$ diawali dengan prefix tingkat kesulitan `"00"`.
  3. **Verifikasi Keaslian Dokumen Akademik:**
     - Mahasiswa atau pihak program studi dapat mengunggah berkas naskah/surat (PDF atau DOCX) pada panel verifikasi.
     - Sistem menghitung hash SHA-256 dokumen secara *real-time* dan mencocokkannya dengan `assetDataHash` pada seluruh blok blockchain:
       - 🟢 **DOKUMEN ASLI & VALID:** Hash dokumen persis cocok dengan blok yang ditandatangani Dosen Pembimbing.
       - 🔴 **DOKUMEN TIDAK COCOK / DIMANIPULASI:** Hash dokumen tidak ditemukan dalam buku besar.
       - ⚠️ **INTEGRITAS RANTAI RUSAK:** Terdeteksi ketidakcocokan hash antar blok pada ledger.
  4. **Simulasi Tamper & Restore:**
     - Fitur demonstrasi pengujian di mana pengguna dapat memicu simulasi perubahan data ilegal pada satu blok di database SQLite.
     - Sistem secara seketika mendeteksi kerusakan rantai hash dan mematikan status validitas *ledger*, membuktikan ketahanan sistem terhadap serangan manipulasi data.

### 4.2.4 Implementasi Inspektur Basis Data Mentah & Tata Kelola Pengguna (`/dashboard/db-view`)
- **Tujuan:** Memberikan transparansi menyeluruh kepada penguji dan auditor bahwa seluruh data sensitif (kredensial, kunci perangkat keras, vektor biometrik, pesan teks, dan keputusan penting) terenkripsi secara aman saat tersimpan di disk (*data-at-rest*).
- **Komponen Kunci:**
  - `client/src/features/db-inspector/components/DbInspectorView.tsx`
  - `client/src/features/db-inspector/types/dbInspector.types.ts`
  - `server/src/services/stego.service.ts` (`getDatabaseRawInspection`)
- **Fitur Utama Antarmuka:**
  1. **Panel Spesifikasi Kriptografi:** Menyajikan algoritma enkripsi kolom aktif (`AES-256-GCM`), fungsi hash password (`Scrypt N=16384`), dan path absolut berkas basis data SQLite.
  2. **Tab Inspeksi Tabel User:** Menyajikan perbandingan data sensitif pengguna antara nilai heksadesimal acak di SQLite (`fullNameEncrypted`, `passwordHash`, `dongleIdEncrypted`, `faceDescriptorEncrypted`) dengan hasil dekripsi di aplikasi.
  3. **Tab Inspeksi Tabel ImportantMessage:** Menyajikan kolom `contentEnc`, Nonce, dan Tag otentikasi AES-256-GCM pada keputusan bimbingan vs teks plaintext keputusan resmi.
  4. **Tab Inspeksi Tabel SecretMessage:** Menyajikan ciphertext 3-lapis hasil penggabungan Extended Vigenère, Columnar Transposition, dan AES-256-GCM vs identitas pengirim terdekripsi.

---

## 4.3 Hasil Pengujian Otomatis (`npm test`)

Seluruh modul kriptografi, adapter perangkat keras, antarmuka sesi, dan integrasi end-to-end telah diuji secara otomatis menggunakan test runner native Node.js (`node --test`).

### Rekapitulasi Skenario Pengujian Unit dan Integrasi

| No | Skenario Pengujian | File Uji | Status |
| :---: | :--- | :--- | :---: |
| 1 | **Pilar 1A:** Password Hashing (Scrypt + Salt) & Biometric Euclidean Match (< 0.48) | `crypto.test.ts` | **PASS** |
| 2 | **Pilar 1B:** Hardware Dongle Keyfile (`.skripsi_key`) AES-256-CBC + HMAC-SHA256 | `crypto.test.ts` | **PASS** |
| 3 | **Pilar 2A:** Super Enkripsi Teks (Extended Vigenère + Columnar Transposition + AES-256-GCM) | `crypto.test.ts` | **PASS** |
| 4 | **Pilar 2B:** Enkripsi & Dekripsi File Dokumen dengan ChaCha20-Poly1305 | `crypto.test.ts` | **PASS** |
| 5 | **Pilar 3A:** Database-at-Rest Column Encryption (AES-256-GCM & `K_master_db`) | `crypto.test.ts` | **PASS** |
| 6 | **Pilar 3B:** Steganografi Gambar PNG Lossless (LSB Embedding & Extraction, PSNR > 50 dB) | `crypto.test.ts` | **PASS** |
| 7 | **Pilar 4:** Blockchain Audit Ledger (SHA-256 Hash Linking, PoW & Tamper Detection) | `crypto.test.ts` | **PASS** |
| 8 | **Crypto `k_file`:** ChaCha20-Poly1305 berkunci + AAD menolak kunci salah & byte rusak | `files.test.ts` | **PASS** |
| 9 | **Files Sesi:** Validasi PDF/DOCX, penomoran versi otomatis, RBAC telaah Dosen | `files.test.ts` | **PASS** |
| 10 | **Integrasi Pilar 1:** Login ditolak saat USB Dongle dicabut & diterima saat dicolokkan | `server.test.ts` | **PASS** |
| 11 | **Integrasi Pilar 2A & 2B:** Pesan Super Enkripsi & Berkas ChaCha20 di Basis Data | `server.test.ts` | **PASS** |
| 12 | **Integrasi Pilar 3 & 4:** Steganografi LSB, Inspektur DB Mentah, & Validasi Blockchain | `server.test.ts` | **PASS** |
| 13 | **Integrasi Server-Client:** Sinkronisasi Wajah Server -> Cek Dongle & Biometrik Klien | `server.test.ts` | **PASS** |
| 14 | **Manajemen Sesi:** Token sesi wajib & AppError membawa status kode HTTP (`FR-AUTH-08`) | `server.test.ts` | **PASS** |
| 15 | **Keamanan Sesi:** Idle-lockout 15 menit, polling pasif tidak memperpanjang sesi | `server.test.ts` | **PASS** |
| 16 | **Chat Dua Arah:** Pengiriman pesan bimbingan terenkripsi & anti-pemalsuan pengirim | `server.test.ts` | **PASS** |
| 17 | **Vault Sesi:** Hanya Dosen peserta yang dapat menandai pesan penting bimbingan | `server.test.ts` | **PASS** |
| 18 | **Spesifikasi Modul KEYS:** RSA Keypair 2048-bit, KEK Scrypt, Wrap RSA-OAEP, & Subkeys HKDF | `spec.test.ts` | **PASS** |
| 19 | **Spesifikasi Modul CRYPTO:** Permutasi Kolom Fisher-Yates & Super Enkripsi 3-Lapis | `spec.test.ts` | **PASS** |
| 20 | **Spesifikasi Modul VAULT:** Enkripsi Kolom Pesan Penting (`K_master_db` + AAD) | `spec.test.ts` | **PASS** |
| 21 | **Spesifikasi Modul ADMIN:** Provisioning Pengguna & Penetapan Pembimbing (Key Wrapping) | `spec.test.ts` | **PASS** |
| 22 | **Spesifikasi Modul CHAIN:** Penerbitan Aset Akademik (ACC/Nilai) dengan RSA-PSS & Verifikasi | `spec.test.ts` | **PASS** |
| 23 | **Spesifikasi Modul FILES:** Dosen Mereview Status Draf (`REVISION` & `APPROVED`) | `spec.test.ts` | **PASS** |
| 24 | **Spesifikasi Modul AUDIT:** Verifikasi Catatan Audit Trail Tanpa Membocorkan Plaintext | `spec.test.ts` | **PASS** |
| 25 | **Stego Sesi:** Penyisipan dan ekstraksi dokumen steganografi terikat sesi percakapan | `stego.test.ts` | **PASS** |
| 26 | **Stego RBAC:** Penolakan akses ekstraksi stego (403) bagi pengguna di luar percakapan | `stego.test.ts` | **PASS** |
| 27 | **Stego Kapasitas:** Penolakan penyisipan payload melebihi kapasitas citra (`ERR_STEGO_CAPACITY`) | `stego.test.ts` | **PASS** |
| 28 | **Stego Integritas:** Citra tanpa payload stego valid ditolak (`ERR_STEGO_NO_PAYLOAD`) | `stego.test.ts` | **PASS** |
| 29 | **Stego Kualitas:** Verifikasi metrik citra PSNR di atas 40 dB dan MSE di bawah 0.005 | `stego.test.ts` | **PASS** |
| 30 | **Chain RBAC:** Penerbitan surat ACC ditolak bagi mahasiswa dan non-dosen | `chain.test.ts` | **PASS** |
| 31 | **Chain Tamper:** Deteksi otomatis modifikasi ilegal pada data blok blockchain | `chain.test.ts` | **PASS** |

**Tingkat Keberhasilan Pengujian:** **100% Lulus (31/31 Pass, 0 Fail, 0 Cancelled, 0 Skipped).**

---

# BAB V: KESIMPULAN DAN SARAN

## 5.1 Kesimpulan
1. **Pemenuhan 7 Kriteria Kriptografi:** Aplikasi **SkripsiChat** telah berhasil mengimplementasikan dan mengintegrasikan seluruh 7 kriteria tugas akhir kriptografi ke dalam alur kerja akademik bimbingan skripsi yang nyata dan fungsional.
2. **Otentikasi Multi-Faktor Berlapis:** Kombinasi Hardware USB Dongle (`.skripsi_key` berenkripsi AES-256-CBC + HMAC-SHA256), Scrypt KDF untuk password, dan biometrik wajah webcam (vektor 128-D Euclidean Distance < 0.48) berhasil mencegah akses tidak sah, pemalsuan identitas, maupun serangan pencurian kredensial.
3. **Pengamanan Komunikasi & Dokumen:** Pesan teks bimbingan terlindungi melalui Super Enkripsi 3-lapis berurutan (Extended Vigenère, Columnar Transposition, dan AES-256-GCM), sedangkan berkas draf naskah skripsi terenkripsi menggunakan ChaCha20-Poly1305 berkunci subkey HKDF dengan verifikasi integritas hash SHA-256.
4. **Perlindungan Basis Data (Data-at-Rest):** Keputusan penting dosen dan data sensitif pengguna terenkripsi per kolom di SQLite menggunakan AES-256-GCM dengan kunci master eksternal $K_{\text{master\_db}}$, yang terbukti transparan dan tidak terbaca teks aslinya melalui modul *DB Inspector*.
5. **Kualitas Steganografi Teruji:** Penyisipan dokumen rahasia ke dalam citra PNG lossless menggunakan teknik LSB terbukti menghasilkan nilai MSE rendah (< 0.005) dan nilai PSNR tinggi (> 50 dB), sehingga tidak menurunkan kualitas visual citra.
6. **Keabsahan Dokumen dengan Blockchain:** Penerbitan surat ACC dan dokumen akademik yang ditandatangani digital menggunakan RSA-PSS dan dicatat pada blockchain Proof-of-Work berhasil membuktikan keaslian dokumen draf skripsi dan mendeteksi secara instan setiap manipulasi berkas atau tampering basis data.
7. **Kualitas Perangkat Lunak:** Seluruh 31 skenario pengujian unit dan integrasi lulus 100%, dan seluruh modul antarmuka web (Next.js/React 19/TypeScript) lulus kompilasi tanpa kesalahan.

## 5.2 Saran
1. **Pengembangan Aplikasi Bergerak (*Mobile App*):** Mengembangkan aplikasi klien untuk platform Android/iOS dengan memanfaatkan chip keamanan perangkat keras bawaan (*Secure Element* atau *Android Keystore*) sebagai pengganti virtual USB dongle.
2. **Skema Multi-Signature Blockchain:** Menambahkan fitur tanda tangan digital jamak (*multi-signature*) pada blockchain yang melibatkan persetujuan dari beberapa dosen penguji dan ketua program studi pada tahap yudisium kelulusan.
3. **Evolusi Kriptografi Pasca-Kuantum (*Post-Quantum Cryptography*):** Mengkaji penerapan algoritma enkripsi asimetris tahan komputer kuantum (seperti ML-KEM dan ML-DSA standar NIST) untuk menggantikan skema RSA-2048 di masa mendatang.

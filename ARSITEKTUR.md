# Dokumen Arsitektur Teknis: SkripsiChat
*(Messenger Akademik Dosen-Mahasiswa Terenkripsi — Tugas Akhir Kriptografi)*

Dokumen ini mendokumentasikan topologi sistem, hierarki kunci kriptografi, skema database, dan diagram aliran data sesuai spesifikasi [SkripsiChat_Spesifikasi.md](./SkripsiChat_Spesifikasi.md).

---

## 1. Topologi Sistem & Pemisahan Tanggung Jawab

```mermaid
flowchart TB
    subgraph ClientLayer["Frontend Client (Next.js 16 + React 19 — Port 3000)"]
        UI["UI Messenger & Akademik Vault"]
        Cam["Webcam Module (Face Capture 128-Float)"]
        CryptoClient["Client-Side Crypto Engine\n(Super Decrypt, Unpack File, LSB Parse)"]
    end

    subgraph HardwareLayer["Lapisan Hardware Lokal"]
        USBKey["USB Flashdisk (.aegis_key / secret key)"]
        WebcamDev["Hardware Webcam Laptop"]
    end

    subgraph ServerLayer["Backend Engine (Node.js v24 HTTP — Port 4000)"]
        Adapters["Adapters (DongleProvider, FaceVerifier)"]
        AuthSrv["Auth & Session Manager (Argon2id/Scrypt + RBAC)"]
        KeySrv["Key & KEK Derivation (HKDF, RSA-OAEP Wrap)"]
        MsgSrv["Chat & Super Encryption Relay"]
        VaultSrv["Important Message Vault (AES-256-GCM Column Encrypt)"]
        FileSrv["File Storage & ChaCha20-Poly1305 Streamer"]
        StegoSrv["LSB PNG Steganography Generator"]
        ChainSrv["Academic Blockchain Ledger (SHA-256 + RSA-PSS Sign)"]
    end

    subgraph DataLayer["Storage & Database Lokal"]
        SQLiteDB[("SQLite database: server/prisma/dev.db\n(Hanya menyimpan Ciphertext & Template Terenkripsi)")]
        FileStore[("Encrypted File Storage: server/uploads/\n(File .enc & Citra PNG Stego)")]
    end

    WebcamDev --> Cam
    USBKey <-->|Scan D:-Z: & read_secret| Adapters
    UI <-->|REST API JSON /api/*| ServerLayer
    Cam --> UI
    ServerLayer --> SQLiteDB
    ServerLayer --> FileStore
```

---

## 2. Hierarki Kunci Kriptografi (Key Hierarchy)

Sesuai Bagian 7 spesifikasi:

```mermaid
flowchart TD
    Pass["Password User"] & DongleSec["Dongle Secret (32 Byte)"] -->|"KDF (Scrypt / Argon2id + kdf_salt)"| KEK["KEK_user (32 Byte)"]
    KEK -->|"AES-256-GCM Wrap (user_id AAD)"| PrivKeyEnc["User RSA Private Key (Encrypted in DB)"]
    PrivKeyEnc -->|"Unlocked on Login"| PrivKeyMem["User Private Key (In-Memory Session Only)"]

    KConv["K_conv acak 32 Byte (Per Conversation)"] -->|"RSA-OAEP SHA-256 (Mahasiswa PubKey)"| WrapMhs["wrapped_key_student"]
    KConv -->|"RSA-OAEP SHA-256 (Dosen PubKey)"| WrapDsn["wrapped_key_lecturer"]

    KConv -->|"HKDF-SHA256 (info: text-vig)"| KVig["k_text_vig (16 Byte)"]
    KConv -->|"HKDF-SHA256 (info: text-trans)"| KTrans["k_text_trans (16 Byte)"]
    KConv -->|"HKDF-SHA256 (info: text-aes)"| KAes["k_text_aes (32 Byte)"]
    KConv -->|"HKDF-SHA256 (info: file-chacha)"| KFile["k_file (32 Byte)"]
    KConv -->|"HKDF-SHA256 (info: stego-lsb)"| KStego["k_stego (32 Byte)"]

    MasterKey["K_master_db (Dari ENV / File Eksternal)"] -->|"AES-256-GCM"| VaultCol["Kolom Tabel important_messages"]
```

---

## 3. Protokol Kriptografi per Fitur

| Fitur / Modul | Kebutuhan Kriptografi | Algoritma & Formula | Alasan Desain |
|---|---|---|---|
| **Pilar 1: Login & Akses** | Hashing Password + Dongle Gate + Biometrik | Scrypt / Argon2id (`salt` 16B), AES-256-CBC token di dongle, Euclidean Distance (`< 0.48`) pada 128-float facial vector. | Kunci privat tidak bisa didekripsi tanpa fisik dongle dan password yang benar. |
| **Pilar 2A: Chat Teks** | Super Enkripsi (2 Klasik + 1 Modern) | $P \rightarrow \text{Vigenère (Mod 256)} \rightarrow \text{Transposisi Kolom 16-kolom} \rightarrow \text{AES-256-GCM (12B Nonce + 16B Tag)}$. | Menjamin kerahasiaan (*confidentiality*) dan keaslian (*integrity/authenticity*) pesan bimbingan. |
| **Pilar 2B: Draf Skripsi** | Enkripsi Berkas (Berbeda dari Teks) | **ChaCha20-Poly1305** (RFC 8439) per streaming chunk + SHA-256 integritas. | Pemenuhan syarat algoritma berbeda (stream cipher modern bertenaga tinggi). |
| **Pilar 3A: Pesan Penting** | Database-at-Rest Column Encryption | **AES-256-GCM** dengan `K_master_db` yang tersimpan di luar DB. | Database administrator tidak bisa membaca catatan penting (ACC/Revisi) secara telanjang. |
| **Pilar 3B: Foto Dokumen** | Steganografi Citra Digital | **LSB (Least Significant Bit)** 3-Kanal (RGB) pada PNG Lossless, payload terenkripsi AES-GCM + metrik PSNR (> 50 dB) & MSE. | Menyembunyikan catatan persetujuan di dalam foto lembar pengesahan tanpa merusak kualitas visual. |
| **Pilar 4: Aset Akademik** | Blockchain & Anti-Tampering | SHA-256 hash chaining, Proof-of-Work (`difficulty 00...`), digital signature **RSA-PSS (SHA-256)** oleh Dosen penerbit. | Menjamin dokumen nilai, sertifikat, dan surat ACC tidak dapat dipalsukan atau dimanipulasi. |

---

## 4. Skema Database Relasional (SQLite: `server/prisma/dev.db`)

```mermaid
erDiagram
    User ||--o{ Conversation : participates
    User ||--o{ Message : sends
    User ||--o{ AcademicAsset : issues_or_owns
    Conversation ||--o{ Message : contains
    Conversation ||--o{ ImportantMessage : flags
    Conversation ||--o{ DraftFile : stores

    User {
        int id PK
        string username UK
        string full_name_encrypted
        string role "STUDENT | LECTURER | ADMIN"
        string password_hash
        string kdf_salt
        string dongle_id
        string private_key_enc
        string public_key_pem
        string face_descriptor_encrypted
        string face_photo_encrypted
        int failed_attempts
        string locked_until
        string created_at
    }

    Conversation {
        string id PK
        int student_id FK
        int lecturer_id FK
        string wrapped_key_student
        string wrapped_key_lecturer
        string created_at
    }

    Message {
        int id PK
        string conversation_id FK
        int sender_id FK
        string msg_type "TEXT | FILE | IMAGE"
        string ciphertext_payload
        string nonce_hex
        string tag_hex
        string created_at
    }

    ImportantMessage {
        int id PK
        string conversation_id FK
        int original_message_id FK
        string category "ACC | REVISI | JADWAL_SIDANG | LAINNYA"
        string note_encrypted_gcm
        string marked_by FK
        string created_at
    }

    DraftFile {
        int id PK
        string conversation_id FK
        string file_name
        int version
        string stored_enc_path
        string original_sha256
        int uploader_id FK
        string review_status "SUBMITTED | REVISION | APPROVED"
        string created_at
    }

    AcademicAssetBlock {
        int index PK
        string timestamp
        string asset_type "GRADE | CERTIFICATE | DIPLOMA | THESIS_ACC | DRAFT_SUBMISSION"
        string student_identity_no
        int issuer_id FK
        string doc_hash_sha256
        string digital_signature_base64
        string previous_hash
        int difficulty
        int nonce
        string hash UK
    }
```

---

## 5. Konvensi Format Data & Encoding
* **Format Waktu**: ISO-8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
* **Format Kunci Asimetris**: RSA-2048 SPKI (Public Key PEM) & PKCS#8 (Private Key Encrypted PEM).
* **Format Ciphertext Super Enkripsi**: `SKRIPSI-SUPER-V1:<iv_hex>:<tag_hex>:<ciphertext_hex>`.
* **Format File Terenkripsi**: Biner `.enc` dengan header 12-byte Nonce + 16-byte Poly1305 Tag + ciphertext byte stream.
* **Canonical JSON**: Key JSON selalu diurutkan alfabetis tanpa whitespace untuk memastikan kesamaan hash signature blockchain.

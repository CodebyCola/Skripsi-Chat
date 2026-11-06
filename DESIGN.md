# SkripsiChat — Design System & UI/UX Guidelines
*(Simple, Modern, & Earthy Botanic Aesthetic)*

Dokumen ini adalah panduan desain antarmuka (Design System) untuk **SkripsiChat**. Tujuannya adalah menciptakan antarmuka aplikasi bimbingan akademik yang **bersih, tenang, modern, dan tidak melelahkan mata**, sekaligus menampilkan indikator keamanan kriptografi secara elegan tanpa terkesan kaku atau menakutkan.

---

## 1. Filosofi Desain

1. **Academic Serenity (Ketenangan Akademik)**:
   Menggunakan paduan warna alami (*Earthy Sage & Warm Canvas*) yang memberikan kesan terpercaya, tenang, dan nyaman untuk membaca dokumen draf skripsi berjam-jam.
2. **Invisible Yet Reassuring Security**:
   Mekanisme keamanan tingkat tinggi (Dongle USB, Biometrik, Super Enkripsi, Blockchain) ditampilkan melalui indikator mikro yang rapi (badge/pill), bukan pesan teknis yang membanjiri layar.
3. **Content-First Hierarchy**:
   Fokus utama mahasiswa dan dosen adalah **percakapan bimbingan dan draf dokumen**. Navigasi dan panel teknis kriptografi berada di sisi pendukung (*collapsible sidebar*).

---

## 2. Palet Warna (The Earthy Sage Palette)

```
[ Canvas: #F9FBF9 ] ─── [ Card: #FFFFFF ] ─── [ Sage Primary: #2D5A46 ] ─── [ Pine Text: #1C2823 ]
```

### 2.1 Skema Warna Utama (Light Mode - Rekomendasi Utama)

| Token Warna | Nilai Hex | Nuansa & Karakter | Penerapan pada Komponen |
|---|---|---|---|
| **`brand-primary`** | `#2D5A46` | **Deep Forest Sage** | Tombol submit utama, tab aktif, brand header |
| **`brand-hover`** | `#234737` | **Darker Pine** | State hover tombol primary |
| **`brand-soft`** | `#EDF5F0` | **Pale Mint / Sage Light** | Background bubble chat mahasiswa, active list item |
| **`bg-canvas`** | `#F9FBF9` | **Soft Ivory Canvas** | Background layar utama (lembut & tidak menyilaukan) |
| **`bg-surface`** | `#FFFFFF` | **Pure Paper White** | Background panel chat, kartu dokumen, dialog pop-up |
| **`border-subtle`**| `#E3EAE6` | **Muted Green-Gray** | Garis pemisah tipis, input border |
| **`text-primary`** | `#1C2823` | **Deep Charcoal Pine** | Teks judul, nama peserta bimbingan, isi chat |
| **`text-secondary`**| `#5F756B`| **Olive Slate** | Timestamp, metadata file, label instruksi |
| **`text-muted`** | `#8FA39A` | **Soft Sage Gray** | Placeholder, icon sekunder |

### 2.2 Warna Status & Kriptografi (Semantic & Security)

| Status | Hex | Penerapan Kriptografi |
|---|---|---|
| **`security-valid`** | `#2E7D5B` | USB Dongle terpasang, Wajah Cocok, Hash Blockchain valid |
| **`security-warning`**| `#C67D34` | Draf berstatus revisi, dongle akun lain terpasang |
| **`security-danger`** | `#BA4343` | USB Dongle tercabut (Akses terkunci), Blockchain tampered |
| **`security-info`** | `#3A758C` | Info enkripsi ChaCha20, detail RSA key fingerprint |

---

## 3. Tipografi

* **Font Utama (Interface & Body)**: `Plus Jakarta Sans` atau `Inter`
  * Headings (H1, H2, H3): `font-weight: 700` atau `600`, letter-spacing `-0.02em`
  * Body Text: `font-weight: 400`, line-height `1.5`
  * Labels & Buttons: `font-weight: 600`, font-size `13px–14px`
* **Font Monospace (Data Kriptografi & Hash)**: `JetBrains Mono` atau `Fira Code`
  * Digunakan untuk: ID Dongle, SHA-256 hash, Hex signature, Nonce
  * Ukuran: `11px–12px` dengan background soft (`#F0F4F2`) dan border tipis

---

## 4. Tata Letak (3-Column Layout Architecture)

```
┌──────────────┬──────────────────────────────────┬──────────────────────┐
│  Sidebar     │       Main Conversation Area     │   Academic Context   │
│  Navigation  │                                  │   & Security Drawer  │
│              │  [Header: Dosen Pembimbing]      │                      │
│  - User Card │                                  │  - Status Hardware   │
│  - Dongle    │  [Chat Stream]                   │  - Draf Skripsi (v2) │
│    Status    │   - Balasan Dosen (Kiri)         │  - Surat ACC & Nilai │
│  - Chat List │   - Chat Mahasiswa (Kanan)       │  - Tanda Tangan RSA  │
│  - Quick Nav │                                  │  - Hash Chain Log    │
│              │  [Composer + File Attachment]    │                      │
└──────────────┴──────────────────────────────────┴──────────────────────┘
   ( ~260px )                 ( Flex-1 )                 ( ~320px )
```

1. **Sidebar Kiri (Navigasi & Profil Pengguna)**:
   * Menampilkan nama dan role (`Mahasiswa` atau `Dosen Pembimbing`).
   * **Pill Dongle**: Indikator hardware USB mini (`🟢 Dongle Terverifikasi`).
   * Daftar percakapan aktif & navigasi cepat ke: Chat, Arsip Draf, Pesan ACC, dan Ledger Ijazah/Sertifikat.
2. **Area Tengah (Chat Stream Bimbingan)**:
   * Bubble dosen di kiri: latar belakang putih (`#FFFFFF`) dengan border halus (`#E3EAE6`).
   * Bubble mahasiswa di kanan: latar belakang Pale Sage (`#EDF5F0`) dengan teks Deep Pine (`#1C2823`).
   * Penanda Super Enkripsi: Ikon gembok mini halus di bawah bubble: `Super Encrypted • 10:45`.
3. **Sidebar Kanan (Panel Dokumen & Keamanan Kriptografi)**:
   * Menampilkan ringkasan file draf skripsi yang sedang aktif di-review dosen.
   * Tombol aksi dosen: Memberikan status `APPROVED (ACC)` atau `REVISION`.
   * Panel visualisasi bukti keamanan (Fingerprint RSA-OAEP, LSB Stego Foto, Validasi Blockchain).

---

## 5. Komponen UI Khusus Kriptografi

### 5.1 Card Status USB Hardware Dongle
```html
<!-- State: Terhubung -->
<div class="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
  <div class="flex items-center gap-2.5">
    <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
    <div>
      <h4 class="text-xs font-semibold text-emerald-900">Hardware Dongle Terhubung</h4>
      <p class="text-[11px] text-emerald-700">Drive E:\ • Kunci Kriptografi Aktif</p>
    </div>
  </div>
  <span class="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
    AES-256-CBC
  </span>
</div>
```

### 5.2 Card Lampiran Draf Skripsi (ChaCha20-Poly1305)
```html
<div class="flex items-center gap-3 p-3 rounded-xl border border-[#E3EAE6] bg-white hover:border-[#2D5A46] transition-all">
  <div class="w-10 h-10 rounded-lg bg-[#EDF5F0] text-[#2D5A46] flex items-center justify-center font-bold text-sm">
    PDF
  </div>
  <div class="flex-1 min-w-0">
    <h5 class="text-sm font-semibold text-[#1C2823] truncate">Draf_Skripsi_Bab3_Revisi.pdf</h5>
    <p class="text-xs text-[#5F756B]">2.4 MB • Versi 3 • ChaCha20 Stream Encrypted</p>
  </div>
  <button class="px-3 py-1.5 text-xs font-semibold text-[#2D5A46] bg-[#EDF5F0] rounded-lg hover:bg-[#DCECE3]">
    Unduh & Dekripsi
  </button>
</div>
```

### 5.3 Card Pesan Penting / ACC Sidang (Database Vault)
* Menggunakan border aksen emas/amber lembut (`#C67D34`) dengan ikon bintang ⭐.
* Menampilkan badge `Database-at-Rest Encrypted (AES-256-GCM)`.

### 5.4 Pemindai Biometrik Wajah (Webcam Modal)
* Menggunakan kontainer kamera dengan rasio 4:3 bersudut tumpul (`rounded-2xl`).
* Garis panduan wajah berupa oval tipis warna Sage (`#2D5A46`) dengan animasi pembacaan yang halus (bukan animasi sci-fi neon berkedip).

---

## 6. Konfigurasi Tailwind CSS (`tailwind.config.ts`)

Salin konfigurasi berikut ke project `client/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F4F7F5',
          100: '#EDF5F0',
          200: '#DCECE3',
          300: '#BFDACB',
          500: '#4D8269',
          700: '#2D5A46', // Primary
          800: '#234737', // Hover
          900: '#173326',
        },
        pine: {
          DEFAULT: '#1C2823', // Text Primary
          muted: '#5F756B',   // Text Secondary
          soft: '#8FA39A',    // Text Muted
        },
        canvas: '#F9FBF9',    // Background App
        borderMuted: '#E3EAE6',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(28, 40, 35, 0.04), 0 1px 2px -1px rgba(28, 40, 35, 0.04)',
        card: '0 4px 6px -1px rgba(28, 40, 35, 0.05), 0 2px 4px -2px rgba(28, 40, 35, 0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 7. Prinsip Microcopy (Gaya Bahasa Teks UI)

* **Bersahabat & Akademik**: Gunakan istilah seperti *"Ruang Bimbingan"*, *"Unggah Draf Skripsi"*, *"Persetujuan Pembimbing (ACC)"*, dan *"Validasi Ijazah"*.
* **Penjelasan Kripto yang Membumi**:
  * Ketimbang menulis: `"CIPHERTEXT_AES_GCM_AUTH_FAILED"`,
  * Tuliskan: `"Pesan tidak dapat didekripsi. Integritas data tidak cocok dengan kunci bimbingan."`
  * Ketimbang menulis: `"INSERT INTO BLOCKCHAIN PROOF OF WORK 00"`,
  * Tuliskan: `"Surat ACC telah dicatat permanen ke Buku Besar Akademik (Blok #4)."`.

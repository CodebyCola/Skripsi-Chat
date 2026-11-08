# Rencana Frontend UI SkripsiChat

Disusun dari kondisi repo terbaru, `DESIGN.md`, dan matriks hak akses di spesifikasi.

## Temuan penting sebelum mulai

Hanya endpoint **chat** yang sudah memakai sesi (`requireSession`). Endpoint lain masih menerima identitas dari body yang dikirim klien:

| Modul | Masalah di server |
| --- | --- |
| `blockchain/issue-asset` | `issuerId`, `studentId`, bahkan `issuerPrivateKeyPem` dikirim klien |
| `vault/important` | `markedBy` dan `actor` dari body |
| `files`, `stego` | masih memakai model `passphrase`/`passkey` lama (AegisVault) |
| `blockchain/tamper`, `admin/*` | tidak ada cek role |
| `/dashboard/messages` | masih memakai `/api/messages` lama, bukan vault |

Kalau UI dibangun di atas kontrak ini, guard role hanya kosmetik. Karena itu setiap fase UI di bawah dipasangkan dengan satu langkah backend kecil: `requireSession` plus cek role, dengan pola yang sama seperti chat v2. Tanpa itu, tombol "khusus dosen" bisa dipanggil siapa saja lewat curl.

## Fase

### F0. Fondasi (1 hari)

- Terapkan patch role-nav (sidebar per role, guard, token font).
- Buat UI kit kecil di `client/src/components/ui/`: `SecurityPill`, `HashText` (mono), `StatusBadge` (SUBMITTED/REVISION/APPROVED/ASLI/TIDAK COCOK), `EmptyState`, `ErrorBanner`, `ConfirmDialog`, `Toast`.
- Di `lib/api.ts`, tangani 403 (`ERR_NOT_PARTICIPANT` dan sejenisnya) dengan pesan yang ramah.
- Tambah panel kanan "Konteks & Keamanan" (320px) sesuai layout 3 kolom di `DESIGN.md`. Isinya: status dongle, fingerprint kunci, ringkasan draf aktif.

### F1. Ruang Bimbingan (chat)

- Daftar percakapan di sidebar. Dosen memilih mahasiswa, mahasiswa melihat dosennya.
- Bubble kiri (putih) dan kanan (sage), dengan penanda "Super Encrypted • jam".
- Tombol bintang di bubble untuk dosen, dengan pilihan kategori ACC/REVISI/JADWAL\_SIDANG.
- Banner untuk sesi habis dan idle-lock.
- Endpoint: `chat/*`, `vault/important` (POST).

### F2. Naskah & Berkas

- Form upload PDF/DOCX: validasi ekstensi dan ukuran di klien, hapus field passphrase.
- Daftar berkas dengan versi, status, dan catatan revisi.
- Tombol unduh yang menampilkan hasil cek hash (cocok atau ditolak).
- Panel review khusus dosen: REVISION/APPROVED beserta catatan.
- Backend: `file.controller` memakai sesi, `conv_id` dari sesi, review hanya untuk dosen.

### F3. Pesan Penting (mengganti halaman messages lama)

- Daftar dari `vault/important`, filter per kategori, kartu bernuansa amber dengan badge "AES-256-GCM".
- Tombol cabut tanda untuk dosen.
- Hapus `features/messages` versi AegisVault atau pindahkan jadi vault.
- Backend: `markedBy` dan `actor` diambil dari sesi.

### F4. Foto Dokumen (stego)

- Upload gambar, preview, kolom catatan tersembunyi.
- Setelah embed, tampilkan kapasitas, MSE, dan PSNR, serta pesan jelas jika payload melebihi kapasitas.
- Alur "buka foto": ekstrak lalu tampilkan catatan dan hasil verifikasi hash.
- Backend: sesi, kunci diturunkan dari `k_stego` (bukan passkey dari klien).

### F5. Buku Konsultasi & ACC (blockchain)

- Mahasiswa: daftar aset miliknya (`student-assets`).
- Dosen: form terbitkan aset (tipe, mahasiswa, judul, dokumen), plus riwayat penerbitan (`issuer-assets`).
- Semua role: verifikasi dokumen dengan upload file, hasil berupa badge ASLI / TIDAK COCOK / CHAIN RUSAK, dan tombol validasi chain.
- Admin: tombol tamper demo, hanya saat `DEMO_MODE`.
- Backend: `issuerPrivateKeyPem` dihapus dari body dan diambil dari sesi dosen. Ini yang paling penting untuk diperbaiki.

### F6. Admin

- Halaman baru `/dashboard/admin/users`: stepper provisioning (data, password, ikat dongle, enroll wajah), daftar user, nonaktifkan.
- Tetapkan pembimbing (pilih mahasiswa, dosen, topik).
- Halaman `/dashboard/admin/audit`: tabel audit log dengan paginasi, tanpa menampilkan plaintext atau kunci.
- Tambahkan rute ini ke `navigation.ts` (role `admin` saja) dan ubah `ROLE_HOME`.

### F7. Poles dan demo

- Responsif, fokus keyboard dan label ARIA, state loading/kosong/error di semua halaman.
- Konsistensi token warna sesuai `DESIGN.md`.
- Skenario demo: login → chat → upload draf → review → ACC di chain → verifikasi dokumen → tamper → pulihkan.

## Definisi selesai tiap fase

1. `npx tsc --noEmit` bersih dan `npm test` 0 fail.
2. Uji tiga akun (mahasiswa, dosen, admin) terhadap matriks hak akses di Bagian 5 spesifikasi.
3. Satu curl dengan token role yang salah harus mengembalikan 403, bukan sekadar tombol yang disembunyikan.
4. Komentar `// Ref: FR-...` di kode baru, sesuai Aturan 4 di `AGENT.md`.

## Urutan dan pembagian

Urutan: F0 → F1 → F2 → F3 → F5 → F4 → F6 → F7. F5 didahulukan dari F4 karena itu inti demo dan berisi celah keamanan terbesar.

Sesuai `PLAN.md`, Anggota 2 cocok memegang F1–F4 (chat, berkas, stego), dan Anggota 1 memegang F5–F6 (blockchain, admin).

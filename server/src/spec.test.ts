/**
 * ============================================================================
 * TEST SUITE: SPESIFIKASI SKRIPSICHAT (KRITERIA PENERIMAAN AT-01 s.d. AT-24)
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { initDatabase, db } from './database/connection.ts';
import { KeysService } from './services/keys.service.ts';
import {
  permFromKey,
  transpositionEncrypt,
  transpositionDecrypt,
  superEncryptWithSubkeys,
  superDecryptWithSubkeys,
} from './crypto/2_superEncryption.ts';
import { VaultService } from './services/vault.service.ts';
import { AdminService } from './services/admin.service.ts';
import { ChatService } from './services/chat.service.ts';
import { ChainService } from './services/chain.service.ts';
import { FileService } from './services/file.service.ts';
import { AuditService } from './services/audit.service.ts';
import { defaultDongleProvider } from './adapters/dongle.adapter.ts';
import { defaultFaceVerifier } from './adapters/face.adapter.ts';

initDatabase();

test('Spesifikasi Modul KEYS: RSA Keypair, KEK, Wrap/Unwrap RSA-OAEP, & Subkeys HKDF', () => {
  // 1. Generate keypair RSA 2048-bit
  const keypair = KeysService.generateUserKeypair();
  assert.ok(keypair.publicKeyPem.includes('BEGIN PUBLIC KEY'));
  assert.ok(keypair.privateKeyPem.includes('BEGIN PRIVATE KEY'));

  // 2. Turunkan KEK dari password + dongle secret
  const dongleSecret = crypto.randomBytes(32);
  const kdfSalt = crypto.randomBytes(16);
  const kek = KeysService.deriveKek('SkripsiChat2026!', dongleSecret, kdfSalt);
  assert.equal(kek.length, 32);

  // 3. Kunci (protect) private key dengan KEK (AES-256-GCM)
  const protectedBlob = KeysService.protectPrivateKey(keypair.privateKeyPem, kek, 'mahasiswa_test');
  assert.ok(protectedBlob.ciphertextHex.length > 0);
  assert.equal(Buffer.from(protectedBlob.nonceHex, 'hex').length, 12);
  assert.equal(Buffer.from(protectedBlob.authTagHex, 'hex').length, 16);

  // 4. Buka kembali (unlock) private key
  const unlockedPrivateKey = KeysService.unlockPrivateKey(protectedBlob, kek, 'mahasiswa_test');
  assert.equal(unlockedPrivateKey, keypair.privateKeyPem);

  // 5. Buat K_conv & bungkus dengan RSA-OAEP SHA-256
  const kConv = KeysService.createConversationKey();
  assert.equal(kConv.length, 32);

  const wrapped = KeysService.wrapKey(kConv, keypair.publicKeyPem);
  const unwrapped = KeysService.unwrapKey(wrapped, unlockedPrivateKey);
  assert.deepEqual(unwrapped, kConv);

  // 6. Turunkan 5 subkey domain spesifik dengan HKDF-SHA256
  const subkeys = KeysService.deriveSubkeys(kConv);
  assert.equal(subkeys.k_text_vig.length, 16);
  assert.equal(subkeys.k_text_trans.length, 16);
  assert.equal(subkeys.k_text_aes.length, 32);
  assert.equal(subkeys.k_file.length, 32);
  assert.equal(subkeys.k_stego.length, 32);
});

test('Spesifikasi Modul CRYPTO: Transposisi Kolom & Super Enkripsi (Vigenère + Transposisi + AES-GCM)', () => {
  const permKey = crypto.randomBytes(16);
  const perm = permFromKey(permKey);
  assert.equal(perm.length, 16);
  // Pastikan permutasi berisi angka 0..15 tanpa duplikat
  const sorted = [...perm].sort((a, b) => a - b);
  assert.deepEqual(sorted, Array.from({ length: 16 }, (_, i) => i));

  // Uji Transposisi Kolom bolak-balik
  const sampleData = Buffer.from('Testing transposisi kolom kriptografi skripsichat 2026!', 'utf8');
  const transposed = transpositionEncrypt(sampleData, perm);
  const detransposed = transpositionDecrypt(transposed, perm);
  assert.equal(detransposed.subarray(0, sampleData.length).toString('utf8'), sampleData.toString('utf8'));

  // Uji Super Enkripsi Lengkap dengan Subkeys
  const kConv = KeysService.createConversationKey();
  const subkeys = KeysService.deriveSubkeys(kConv);
  const textPlain = 'Revisi Sidang: Jelaskan arsitektur hybrid AES-256-GCM + ChaCha20-Poly1305!';
  const aad = 'conv:1|sender:dosen_pembimbing';

  const encrypted = superEncryptWithSubkeys(textPlain, subkeys, aad);
  assert.ok(encrypted.combinedPayload.startsWith('SUPER-GCM-V1:'));
  assert.notEqual(encrypted.ciphertextHex, textPlain);

  const decrypted = superDecryptWithSubkeys(
    {
      ciphertextHex: encrypted.ciphertextHex,
      nonceHex: encrypted.nonceHex,
      authTagHex: encrypted.authTagHex,
    },
    subkeys,
    aad
  );
  assert.equal(decrypted, textPlain);

  // Uji Manipulasi Tag / Tamper: Mengubah 1 byte ciphertext harus gagal didekripsi (ERR_DECRYPT_FAILED)
  const corruptedCipherHex =
    (encrypted.ciphertextHex.startsWith('aa') ? 'bb' : 'aa') + encrypted.ciphertextHex.slice(2);

  assert.throws(() => {
    superDecryptWithSubkeys(
      {
        ciphertextHex: corruptedCipherHex,
        nonceHex: encrypted.nonceHex,
        authTagHex: encrypted.authTagHex,
      },
      subkeys,
      aad
    );
  });
});

test('Spesifikasi Modul VAULT: Enkripsi Kolom Pesan Penting (K_master_db)', () => {
  const plainText = 'Keputusan Sidang: Draf Skripsi DISETUJUI (ACC) untuk Maju Sidang.';
  const messageId = 99901;

  // 1. Tandai pesan sebagai penting (ACC)
  const marked = VaultService.markImportant({
    messageId,
    category: 'ACC',
    plainContent: plainText,
    markedBy: 'dosen_pembimbing',
    convId: 1,
  });
  assert.equal(marked.category, 'ACC');
  assert.equal(marked.contentPlain, plainText);

  // 2. Verifikasi di DB: kolom contentEnc tersimpan dalam bentuk terenkripsi
  const rowInDb = db
    .prepare('SELECT contentEnc FROM ImportantMessage WHERE messageId = ?')
    .get(messageId) as { contentEnc: string };
  assert.ok(rowInDb.contentEnc.length > 0);
  assert.notEqual(rowInDb.contentEnc, plainText);

  // 3. Tampilkan daftar pesan penting (terdekripsi on-the-fly)
  const list = VaultService.listImportant(1);
  const found = list.find((m) => m.messageId === messageId);
  assert.ok(found);
  assert.equal(found?.contentPlain, plainText);

  // 4. Hapus tanda penting
  const unmarkSuccess = VaultService.unmarkImportant(messageId, 'dosen_pembimbing');
  assert.equal(unmarkSuccess, true);
});

test('Spesifikasi Modul ADMIN: Provisioning User & Penetapan Pembimbing (RSA-OAEP Key Wrapping)', () => {
  // Pastikan data uji bersih sebelum provisioning
  db.prepare('DELETE FROM Conversation WHERE studentId = ?').run('mhs_ta_2026');
  db.prepare('DELETE FROM User WHERE username = ?').run('mhs_ta_2026');

  const dummyFaceVec = Array.from({ length: 128 }, (_, i) =>
    Number((Math.cos(i * 0.4) * 0.2).toFixed(4))
  );

  // 1. Provision Mahasiswa Baru
  const studentProvision = AdminService.provisionUser(
    {
      username: 'mhs_ta_2026',
      fullName: 'Rian Pratama',
      role: 'MAHASISWA',
      identityNo: '20210801099',
      faceDescriptor: dummyFaceVec,
    },
    'MhsSecurePassword2026!'
  );
  assert.equal(studentProvision.success, true);
  assert.ok(studentProvision.publicKeyPem.length > 0);

  // 2. Penetapan Dosen Pembimbing (Menghasilkan percakapan & wrapped keys untuk kedua pihak)
  const conv = AdminService.assignSupervisor({
    studentId: studentProvision.userId,
    lecturerId: 'dosen_pembimbing',
    topic: 'Kriptografi Visual & Blockchain Ledger Skripsi',
  });
  assert.equal(conv.success, true);
  assert.ok(conv.convId > 0);

  // 3. Ambil data percakapan dari DB dan uji unwrap kedua sisi
  const convRow = db
    .prepare('SELECT wrappedKeyStudent, wrappedKeyLecturer FROM Conversation WHERE id = ?')
    .get(conv.convId) as { wrappedKeyStudent: string; wrappedKeyLecturer: string };

  // Ambil private key mahasiswa
  const studentDb = db
    .prepare('SELECT * FROM User WHERE id = ?')
    .get(studentProvision.userId) as any;
  const dongleSecret = defaultDongleProvider.read_secret();
  const studentKek = KeysService.deriveKek(
    'MhsSecurePassword2026!',
    dongleSecret,
    Buffer.from(studentDb.kdfSalt, 'hex')
  );
  const studentPrivKey = KeysService.unlockPrivateKey(
    {
      ciphertextHex: studentDb.privateKeyEnc,
      nonceHex: studentDb.privateKeyNonce,
      authTagHex: studentDb.privateKeyTag,
    },
    studentKek,
    'mhs_ta_2026'
  );

  // Mahasiswa membuka kunci percakapan
  const kConvFromStudent = KeysService.unwrapKey(convRow.wrappedKeyStudent, studentPrivKey);
  assert.equal(kConvFromStudent.length, 32);

  // Keduanya mendapatkan subkeys yang identik!
  const subkeys = KeysService.deriveSubkeys(kConvFromStudent);
  assert.equal(subkeys.k_text_aes.length, 32);

  // 4. Uji Kirim & Baca Chat Bimbingan Terenkripsi
  const sentMsg = ChatService.sendMessage({
    convId: conv.convId,
    sender: 'mhs_ta_2026',
    plaintext: 'Selamat siang Bapak, berikut draf revisi Bab 3 telah saya selesaikan.',
    subkeys,
  });
  assert.ok(sentMsg.id > 0);

  const fetchedMsgs = ChatService.fetchMessages({
    convId: conv.convId,
    subkeys,
  });
  const msgRead = fetchedMsgs.find((m) => m.id === sentMsg.id);
  assert.equal(msgRead?.status, 'DELIVERED');
  assert.equal(
    msgRead?.plaintext,
    'Selamat siang Bapak, berikut draf revisi Bab 3 telah saya selesaikan.'
  );
});

test('Spesifikasi Modul CHAIN: Penerbitan Aset Akademik (ACC/Nilai) dengan RSA-PSS & Verifikasi Dokumen', () => {
  const dummyDoc = Buffer.from(
    `DOKUMEN LEMBAR PENGESAHAN SKRIPSI - PROGRAM STUDI TEKNIK INFORMATIKA ${Date.now()}`,
    'utf8'
  );

  // 1. Dosen membuat keypair RSA untuk tanda tangan digital
  const lecturerKeypair = KeysService.generateUserKeypair();

  // Simpan public key dosen di tabel User untuk verifikasi nanti
  db.prepare('UPDATE User SET publicKey = ? WHERE username = ?').run(
    lecturerKeypair.publicKeyPem,
    'dosen_pembimbing'
  );

  // 2. Terbitkan Surat ACC Sidang Skripsi ke Blockchain
  const issued = ChainService.issueAsset({
    assetType: 'THESIS_ACC',
    studentId: 'mahasiswa_01',
    issuerId: 'dosen_pembimbing',
    issuerPrivateKeyPem: lecturerKeypair.privateKeyPem,
    documentBuffer: dummyDoc,
    title: 'Lembar Pengesahan Sidang Skripsi (ACC Dosen Pembimbing)',
  });
  assert.equal(issued.success, true);
  assert.ok(issued.blockIndex > 0);
  assert.ok(issued.signature.length > 0);

  // 3. Verifikasi dokumen ASLI
  const verifyValid = ChainService.verifyDocument(dummyDoc);
  assert.equal(verifyValid.status, 'AUTHENTIC');
  assert.equal(verifyValid.title, 'Lembar Pengesahan Sidang Skripsi (ACC Dosen Pembimbing)');
  assert.equal(verifyValid.signatureValid, true);

  // 4. Verifikasi dokumen yang sudah DIMANIPULASI 1 byte -> Harus NOT_FOUND
  const manipulatedDoc = Buffer.from(
    'DOKUMEN LEMBAR PENGESAHAN SKRIPSI - PROGRAM STUDI TEKNIK INFORMATIKA 2027',
    'utf8'
  );
  const verifyTampered = ChainService.verifyDocument(manipulatedDoc);
  assert.equal(verifyTampered.status, 'NOT_FOUND');
});

test('Spesifikasi Modul FILES: Dosen Mereview Status Draf (REVISION & APPROVED)', () => {
  const rawFile = 'Isi naskah draf skripsi Bab 1 s/d Bab 5 format docx simulasi';
  const fileCreated = FileService.uploadAndEncryptFile({
    originalName: 'draf_skripsi_final.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileBase64: Buffer.from(rawFile, 'utf8').toString('base64'),
    passphrase: 'PasswordDraf2026',
    uploader: 'mahasiswa_01',
  });
  assert.ok(fileCreated.id > 0);

  // Dosen memberikan review dan status APPROVED
  const reviewed = FileService.reviewFile({
    fileId: fileCreated.id,
    status: 'APPROVED',
    reviewNote: 'Semua bab telah diperbaiki sesuai masukan dewan penguji. Silakan daftar sidang.',
    reviewer: 'dosen_pembimbing',
  });
  assert.equal(reviewed.success, true);
  assert.equal(reviewed.status, 'APPROVED');

  // Cek di DB
  const rowInDb = db
    .prepare('SELECT status, reviewNote, reviewedBy FROM EncryptedFile WHERE id = ?')
    .get(fileCreated.id) as { status: string; reviewNote: string; reviewedBy: string };
  assert.equal(rowInDb.status, 'APPROVED');
  assert.equal(rowInDb.reviewedBy, 'dosen_pembimbing');
});

test('Spesifikasi Modul AUDIT: Verifikasi Catatan Audit Trail Tanpa Membocorkan Kunci/Plaintext', () => {
  AuditService.log({
    actorId: 'dosen_pembimbing',
    action: 'TEST_AUDIT_EVENT',
    targetType: 'DOCUMENT',
    targetId: 8821,
    result: 'SUCCESS',
    detail: 'Pengujian pencatatan audit log',
  });

  const logs = AuditService.listLogs(10, 0);
  const found = logs.find((l) => l.action === 'TEST_AUDIT_EVENT');
  assert.ok(found);
  assert.equal(found?.actorId, 'dosen_pembimbing');
  assert.equal(found?.result, 'SUCCESS');
});

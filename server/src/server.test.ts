/**
 * ============================================================================
 * END-TO-END API & SQLITE INTEGRATION TESTS (SELURUH 4 PILAR)
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { db, initDatabase } from './db.ts';
import {
  handleGetDongleStatus,
  handleToggleVirtualDongle,
  handleEnrollUserFace,
  handleCheckClientAuthStatus,
  handleVerifyClientFace,
  handleLoginUser,
} from './routes/auth.routes.ts';
import {
  handleCreateSuperEncryptedMessage,
  handleDecryptSuperMessage,
  handleDeleteMessage,
} from './routes/message.routes.ts';
import {
  handleUploadAndEncryptFile,
  handleDecryptStoredFile,
} from './routes/file.routes.ts';
import {
  handleEmbedStegoImage,
  handleExtractStegoImage,
  handleGetDatabaseRawInspection,
} from './routes/stego.routes.ts';
import {
  handleGetBlockchain,
  handleTamperBlockSimulation,
  handleRestoreBlockchainIntegrity,
} from './routes/blockchain.routes.ts';

initDatabase();

test('Integrasi Pilar 1: Login ditolak saat USB Dongle dicabut & diterima saat dicolok', () => {
  // 1. Cabut USB Dongle
  handleToggleVirtualDongle(false);
  const statusOff = handleGetDongleStatus();
  assert.equal(statusOff.dongleDetected, false);

  assert.throws(() => {
    handleLoginUser({
      username: 'editor_aegis',
      password: 'Aegis2026!',
    });
  }, /USB Hardware Dongle/);

  // 2. Colokkan kembali USB Dongle
  handleToggleVirtualDongle(true);
  const statusOn = handleGetDongleStatus();
  assert.equal(statusOn.dongleDetected, true);

  const loginOk = handleLoginUser({
    username: 'editor_aegis',
    password: 'Aegis2026!',
  });
  assert.equal(loginOk.success, true);
  assert.equal(loginOk.user.username, 'editor_aegis');
});

test('Integrasi Pilar 2A & 2B: Pesan Super Enkripsi & File ChaCha20 di Database', () => {
  const msgCreated = handleCreateSuperEncryptedMessage({
    title: 'Bukti Uji Integrasi',
    sender: 'editor_aegis',
    plaintext: 'Isi rahasia pesan super enkripsi 12345',
    passphrase: 'PassUji',
    mode: 'CBC',
  });
  assert.ok(msgCreated.id > 0);

  const msgDecrypted = handleDecryptSuperMessage({
    id: msgCreated.id,
    passphrase: 'PassUji',
  });
  assert.equal(msgDecrypted.plaintext, 'Isi rahasia pesan super enkripsi 12345');

  // Uji Hapus Pesan Super Enkripsi
  const msgDeleted = handleDeleteMessage({ id: msgCreated.id, actor: 'dosen_pembimbing' });
  assert.equal(msgDeleted.success, true);
  assert.throws(() => {
    handleDecryptSuperMessage({ id: msgCreated.id, passphrase: 'PassUji' });
  }, /Pesan tidak ditemukan/);

  const rawFileText = 'Dokumen Rahasia Negara - Uji ChaCha20';
  const fileCreated = handleUploadAndEncryptFile({
    originalName: 'uji_chacha20.txt',
    mimeType: 'text/plain',
    fileBase64: Buffer.from(rawFileText, 'utf8').toString('base64'),
    passphrase: 'PassFileUji',
  });
  assert.ok(fileCreated.id > 0);

  const fileDecrypted = handleDecryptStoredFile({
    id: fileCreated.id,
    passphrase: 'PassFileUji',
  });
  assert.equal(fileDecrypted.sha256Verified, true);
  assert.equal(
    Buffer.from(fileDecrypted.decryptedBase64, 'base64').toString('utf8'),
    rawFileText
  );
});

test('Integrasi Pilar 3 & 4: Steganografi LSB, DB Encryption Inspector, & Blockchain Validation', () => {
  const stegoEmbedded = handleEmbedStegoImage({
    title: 'Uji Stego PNG',
    secretMessage: 'Pesan Tersembunyi di LSB Piksel PNG',
    passkey: 'StegoPass',
  });
  assert.ok(stegoEmbedded.psnrDb > 50);

  const stegoExtracted = handleExtractStegoImage({
    id: stegoEmbedded.id,
    passkey: 'StegoPass',
  });
  assert.equal(stegoExtracted.secretMessage, 'Pesan Tersembunyi di LSB Piksel PNG');

  // Cek DB Raw Inspector
  const dbInspect = handleGetDatabaseRawInspection();
  assert.ok(dbInspect.usersTable.length >= 1);
  assert.ok(dbInspect.usersTable[0].rawInSqlite.fullNameEncrypted.startsWith('DBENC$v1$'));

  // Cek Blockchain Valid -> Tamper -> Restore
  const chainBefore = handleGetBlockchain();
  assert.equal(chainBefore.validation.isChainValid, true);

  const chainTampered = handleTamperBlockSimulation({ index: 1 });
  assert.equal(chainTampered.validation.isChainValid, false);
  assert.equal(chainTampered.validation.firstCorruptedIndex, 1);

  const chainRestored = handleRestoreBlockchainIntegrity();
  assert.equal(chainRestored.validation.isChainValid, true);
});

test('Integrasi Server <-> Client: Simpan Wajah di Server -> Cek Dongle & Verifikasi Biometrik di Client', () => {
  handleToggleVirtualDongle(true);

  const prevRow = db
    .prepare('SELECT faceDescriptorEncrypted, facePhotoEncrypted, faceUpdatedAt FROM User WHERE username = ?')
    .get('editor_aegis') as {
    faceDescriptorEncrypted: string;
    facePhotoEncrypted: string;
    faceUpdatedAt: string;
  };

  try {
    // 1. Server menyimpan rekaman wajah asli user
    const serverFace = Array.from({ length: 128 }, (_, i) =>
      Number((Math.cos(i * 0.3) * 0.05).toFixed(4))
    );
    const enrollRes = handleEnrollUserFace({
      username: 'editor_aegis',
      faceDescriptor: serverFace,
      facePhotoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    });
    assert.equal(enrollRes.success, true);

    // 2. Client mengecek status Dongle & apakah Wajah sudah terdaftar di Server
    const checkStatus = handleCheckClientAuthStatus('editor_aegis');
    assert.equal(checkStatus.dongleDetected, true);
    assert.equal(checkStatus.dongleMatchesUser, true);
    assert.equal(checkStatus.hasFacePhoto, true);

    // 3. Client mengirim scan wajah orang yang SAMA -> harus matched: true
    const clientSameFace = serverFace.map((v) => Number((v + 0.008).toFixed(4)));
    const verifySame = handleVerifyClientFace({
      username: 'editor_aegis',
      faceDescriptor: clientSameFace,
    });
    assert.equal(verifySame.matched, true);

    // 4. Client mengirim scan wajah orang BERBEDA -> harus matched: false
    const clientWrongFace = serverFace.map((v) => Number((v + 0.09).toFixed(4)));
    const verifyWrong = handleVerifyClientFace({
      username: 'editor_aegis',
      faceDescriptor: clientWrongFace,
    });
    assert.equal(verifyWrong.matched, false);

    // 5. Login dengan wajah yang cocok + dongle aktif -> Berhasil
    const loginRes = handleLoginUser({
      username: 'editor_aegis',
      password: 'Aegis2026!',
      faceDescriptor: clientSameFace,
    });
    assert.equal(loginRes.success, true);
  } finally {
    db.prepare(
      'UPDATE User SET faceDescriptorEncrypted = ?, facePhotoEncrypted = ?, faceUpdatedAt = ? WHERE username = ?'
    ).run(
      prevRow.faceDescriptorEncrypted,
      prevRow.facePhotoEncrypted,
      prevRow.faceUpdatedAt,
      'editor_aegis'
    );
  }
});


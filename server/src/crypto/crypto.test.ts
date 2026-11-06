/**
 * ============================================================================
 * AUTOMATED UNIT TESTS UNTUK KE-4 PILAR KRIPTOGRAFI AEGISVAULT
 * ============================================================================
 * Jalankan dengan: node --test src/crypto/crypto.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hashPasswordWithSalt,
  verifyPasswordWithSalt,
  verifyBiometricFace,
} from './1_passwordHash.ts';
import {
  generateDongleKeyFileContent,
  verifyDongleKeyFileContent,
} from './1_dongleKey.ts';
import {
  superEncryptText,
  superDecryptText,
} from './2_superEncryption.ts';
import {
  encryptFileChaCha20,
  decryptFileChaCha20,
} from './2_fileChaCha20.ts';
import {
  encryptDatabaseColumn,
  decryptDatabaseColumn,
} from './3_dbEncryption.ts';
import {
  generateSampleCoverPng,
  embedMessageInPngLsb,
  extractMessageFromPngLsb,
} from './3_steganography.ts';
import {
  createGenesisBlock,
  createMinedBlock,
  hashAssetData,
  validateBlockchain,
} from './4_blockchain.ts';

test('Pilar 1A: Password Hashing (Scrypt + Salt) & Biometric Euclidean Match', () => {
  const hashed = hashPasswordWithSalt('RahasiaNegara123!');
  assert.ok(hashed.combined.startsWith('scrypt$'));
  assert.equal(verifyPasswordWithSalt('RahasiaNegara123!', hashed.combined), true);
  assert.equal(verifyPasswordWithSalt('PasswordSalah', hashed.combined), false);

  // Simulasi vektor wajah biometrik 128-dimensi
  const faceReg = Array.from({ length: 128 }, (_, i) => Math.sin(i) * 0.2);
  const faceLoginSame = faceReg.map((v) => v + 0.01); // Orang yang sama (sedikit noise kamera)
  const faceLoginOther = faceReg.map((v) => v + 0.35); // Orang berbeda

  const matchSame = verifyBiometricFace(faceReg, faceLoginSame);
  assert.equal(matchSame.matched, true);
  assert.ok(matchSame.similarityPercent >= 75);

  const matchOther = verifyBiometricFace(faceReg, faceLoginOther);
  assert.equal(matchOther.matched, false);
});

test('Pilar 1B: Hardware Dongle Keyfile (.aegis_key) AES-256 + HMAC-SHA256', () => {
  const generated = generateDongleKeyFileContent('jurnalis_budi');
  assert.ok(generated.encryptedKeyFileContent.startsWith('AEGIS-USB-V1:'));

  const verified = verifyDongleKeyFileContent(
    generated.encryptedKeyFileContent,
    'jurnalis_budi',
    generated.dongleId
  );
  assert.equal(verified.valid, true);
  assert.equal(verified.payload?.username, 'jurnalis_budi');

  // Coba dengan username berbeda -> harus ditolak
  const wrongUser = verifyDongleKeyFileContent(
    generated.encryptedKeyFileContent,
    'hacker_jahat'
  );
  assert.equal(wrongUser.valid, false);
});

test('Pilar 2A: Super Enkripsi Teks (Vigenere + Vernam + AES-256-CBC & ECB)', () => {
  const pesanAsli = 'Laporan Investigasi #01: Dana Proyek Fiktif Rp 15.000.000.000,-!';
  const kunci = 'KunciSangatRahasia2026';

  // Mode CBC
  const encryptedCbc = superEncryptText(pesanAsli, kunci, 'CBC');
  assert.ok(encryptedCbc.combinedPayload.startsWith('SUPER-V1:CBC:'));
  assert.notEqual(encryptedCbc.stage3AesCiphertextHex, pesanAsli);

  const decryptedCbc = superDecryptText(encryptedCbc.combinedPayload, kunci);
  assert.equal(decryptedCbc.plaintext, pesanAsli);

  // Mode ECB
  const encryptedEcb = superEncryptText(pesanAsli, kunci, 'ECB');
  const decryptedEcb = superDecryptText(encryptedEcb.combinedPayload, kunci);
  assert.equal(decryptedEcb.plaintext, pesanAsli);
});

test('Pilar 2B: Enkripsi & Dekripsi File dengan ChaCha20-Poly1305', () => {
  const dummyFileContent = Buffer.from(
    'INI ADALAH ISI DOKUMEN BUKTI PDF RAHASIA YANG DIENKRIPSI DENGAN CHACHA20-POLY1305',
    'utf8'
  );
  const fileKey = 'FileSecretKey#99';

  const encFile = encryptFileChaCha20(dummyFileContent, fileKey);
  assert.ok(encFile.encryptedBuffer.length > dummyFileContent.length);

  const decFile = decryptFileChaCha20(encFile.encryptedBuffer, fileKey);
  assert.deepEqual(decFile.decryptedBuffer, dummyFileContent);
  assert.equal(decFile.decryptedSha256, encFile.originalSha256);

  // Pastikan gagal jika kunci salah
  assert.throws(() => {
    decryptFileChaCha20(encFile.encryptedBuffer, 'KunciSalah');
  });
});

test('Pilar 3A: Database-at-Rest Column Encryption (AES-256-GCM)', () => {
  const nikSensitif = 'NIK: 3273019988776655 - Saksi Kunci';
  const encryptedCol = encryptDatabaseColumn(nikSensitif);
  assert.ok(encryptedCol.startsWith('DBENC$v1$'));
  assert.ok(!encryptedCol.includes('3273019988776655'));

  const decryptedCol = decryptDatabaseColumn(encryptedCol);
  assert.equal(decryptedCol, nikSensitif);
});

test('Pilar 3B: Steganografi Gambar PNG Lossless (LSB Embedding & Extraction)', () => {
  const coverPng = generateSampleCoverPng(120, 90);
  const rahasiaStego = 'Koordinat Pertemuan Saksi: -7.782889, 110.367083 (Jam 21:00 WIB)';
  const stegoPass = 'StegoKey2026';

  const embedResult = embedMessageInPngLsb(coverPng, rahasiaStego, stegoPass);
  assert.ok(embedResult.psnrDb > 50, `PSNR harus > 50 dB, didapat ${embedResult.psnrDb} dB`);

  const extractResult = extractMessageFromPngLsb(embedResult.stegoPngBuffer, stegoPass);
  assert.equal(extractResult.secretMessage, rahasiaStego);
});

test('Pilar 4: Blockchain Audit Ledger (SHA-256 Hash Linking & Tamper Detection)', () => {
  const block0 = createGenesisBlock();
  const block1 = createMinedBlock({
    index: 1,
    actionType: 'ENCRYPT_MESSAGE',
    actor: 'jurnalis_budi',
    assetTitle: 'Laporan Saksi #1',
    assetDataHash: hashAssetData('Isi Laporan #1'),
    previousHash: block0.hash,
  });
  const block2 = createMinedBlock({
    index: 2,
    actionType: 'UPLOAD_FILE',
    actor: 'jurnalis_budi',
    assetTitle: 'Bukti_Rekening.pdf',
    assetDataHash: hashAssetData('Bytes PDF'),
    previousHash: block1.hash,
  });

  const chain = [block0, block1, block2];
  const validCheck = validateBlockchain(chain);
  assert.equal(validCheck.isChainValid, true);
  assert.equal(validCheck.firstCorruptedIndex, null);

  // Simulasi Tampering (mengubah judul aset di Blok #1 tanpa menambang ulang rantai)
  const tamperedChain = [
    block0,
    { ...block1, assetTitle: 'Laporan Palsu yang Diubah Hacker' },
    block2,
  ];
  const tamperCheck = validateBlockchain(tamperedChain);
  assert.equal(tamperCheck.isChainValid, false);
  assert.equal(tamperCheck.firstCorruptedIndex, 1);
});

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

import { VIRTUAL_USB_DIR, UPLOADS_DIR } from '../config/index.ts';
import { hashPasswordWithSalt } from '../crypto/1_passwordHash.ts';
import { generateDongleKeyFileContent } from '../crypto/1_dongleKey.ts';
import { superEncryptText } from '../crypto/2_superEncryption.ts';
import { encryptFileChaCha20 } from '../crypto/2_fileChaCha20.ts';
import { encryptDatabaseColumn } from '../crypto/3_dbEncryption.ts';
import { generateSampleCoverPng, embedMessageInPngLsb } from '../crypto/3_steganography.ts';
import { createGenesisBlock, createMinedBlock, hashAssetData, type BlockRecord } from '../crypto/4_blockchain.ts';

export function insertBlockRow(db: DatabaseSync, block: BlockRecord): void {
  db.prepare(`
    INSERT INTO BlockchainLedger (
      "index", timestamp, actionType, actor, assetTitle, assetDataHash, previousHash, nonce, hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    block.index,
    block.timestamp,
    block.actionType,
    block.actor,
    block.assetTitle,
    block.assetDataHash,
    block.previousHash,
    block.nonce,
    block.hash
  );
}

export function appendNewBlockchainRecord(
  db: DatabaseSync,
  params: {
    actionType: string;
    actor: string;
    assetTitle: string;
    assetData: string | Buffer;
  }
): BlockRecord {
  const lastBlock = db
    .prepare('SELECT * FROM BlockchainLedger ORDER BY "index" DESC LIMIT 1')
    .get() as BlockRecord | undefined;

  const nextIndex = lastBlock ? lastBlock.index + 1 : 0;
  const previousHash = lastBlock ? lastBlock.hash : '0'.repeat(64);
  const assetDataHash = hashAssetData(params.assetData);

  const newBlock = createMinedBlock({
    index: nextIndex,
    actionType: params.actionType,
    actor: params.actor,
    assetTitle: params.assetTitle,
    assetDataHash,
    previousHash,
  });

  insertBlockRow(db, newBlock);
  return newBlock;
}

export function seedInitialDemoData(db: DatabaseSync): void {
  // Cek apakah Genesis Block sudah ada
  const blockCountRow = db
    .prepare('SELECT COUNT(*) as count FROM BlockchainLedger')
    .get() as { count: number };

  if (blockCountRow.count === 0) {
    const genesis = createGenesisBlock();
    insertBlockRow(db, genesis);
  }

  // Pastikan akun default terdaftar
  const defaultPassAcademic = 'SkripsiChat2026!';
  const passHashAcademic = hashPasswordWithSalt(defaultPassAcademic).combined;

  const defaultUsername = 'editor_aegis';
  const defaultPass = 'Aegis2026!';
  const passHash = hashPasswordWithSalt(defaultPass).combined;

  // Buat Dongle Default & simpan ke folder virtual_usb_dongle (.skripsi_key dan .aegis_key)
  const dongle = generateDongleKeyFileContent(
    defaultUsername,
    'DONGLE-AEGIS-MASTER-001'
  );
  fs.writeFileSync(
    path.join(VIRTUAL_USB_DIR, '.skripsi_key'),
    dongle.encryptedKeyFileContent,
    'utf8'
  );
  fs.writeFileSync(
    path.join(VIRTUAL_USB_DIR, '.aegis_key'),
    dongle.encryptedKeyFileContent,
    'utf8'
  );

  // Vektor biometrik default (128 float)
  const defaultFaceVec = Array.from({ length: 128 }, (_, i) =>
    Number((Math.sin(i * 0.5) * 0.25).toFixed(4))
  );

  // 1. Akun Dosen Pembimbing
  const hasDosen = db.prepare('SELECT id FROM User WHERE username = ?').get('dosen_pembimbing');
  if (!hasDosen) {
    const dongleDosen = generateDongleKeyFileContent(
      'dosen_pembimbing',
      'DONGLE-DOSEN-001'
    );
    db.prepare(`
      INSERT INTO User (
        username, fullNameEncrypted, role, passwordHash,
        dongleIdEncrypted, faceDescriptorEncrypted, secretNoteEncrypted, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'dosen_pembimbing',
      encryptDatabaseColumn('Dr. Ir. Budi Santoso, M.Kom (Dosen Pembimbing)'),
      'DOSEN_PEMBIMBING',
      passHashAcademic,
      encryptDatabaseColumn(dongleDosen.dongleId),
      encryptDatabaseColumn(JSON.stringify(defaultFaceVec)),
      encryptDatabaseColumn('NIP: 198004122005011003 | Bidang: Kriptografi & Keamanan Siber'),
      new Date().toISOString()
    );

    appendNewBlockchainRecord(db, {
      actionType: 'REGISTER_USER_DONGLE',
      actor: 'dosen_pembimbing',
      assetTitle: `Registrasi Dosen Pembimbing & Hardware Dongle (${dongleDosen.dongleId})`,
      assetData: `dosen_pembimbing|${dongleDosen.dongleId}`,
    });
  }

  // 2. Akun Mahasiswa
  const hasMhs = db.prepare('SELECT id FROM User WHERE username = ?').get('mahasiswa_01');
  if (!hasMhs) {
    const dongleMhs = generateDongleKeyFileContent(
      'mahasiswa_01',
      'DONGLE-MHS-001'
    );
    db.prepare(`
      INSERT INTO User (
        username, fullNameEncrypted, role, passwordHash,
        dongleIdEncrypted, faceDescriptorEncrypted, secretNoteEncrypted, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'mahasiswa_01',
      encryptDatabaseColumn('Ahmad Fauzi (Mahasiswa Informatika)'),
      'MAHASISWA',
      passHashAcademic,
      encryptDatabaseColumn(dongleMhs.dongleId),
      encryptDatabaseColumn(JSON.stringify(defaultFaceVec)),
      encryptDatabaseColumn('NIM: 20210801045 | Topik Skripsi: Super Enkripsi & Biometrik'),
      new Date().toISOString()
    );
  }

  // 3. Akun Default Kompatibilitas (editor_aegis)
  const hasAegis = db.prepare('SELECT id FROM User WHERE username = ?').get(defaultUsername);
  if (!hasAegis) {
    db.prepare(`
      INSERT INTO User (
        username, fullNameEncrypted, role, passwordHash,
        dongleIdEncrypted, faceDescriptorEncrypted, secretNoteEncrypted, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      defaultUsername,
      encryptDatabaseColumn('Dr. Ir. Budi Santoso, M.Kom (Dosen Pembimbing Utama)'),
      'DOSEN_PEMBIMBING',
      passHash,
      encryptDatabaseColumn(dongle.dongleId),
      encryptDatabaseColumn(JSON.stringify(defaultFaceVec)),
      encryptDatabaseColumn('Kredensial Akses Akademik | Clearance ID: SKRIPSI-2026-KEY'),
      new Date().toISOString()
    );
  }

  // Seed demo initial assets hanya jika database masih baru (Genesis block belum ada sebelumnya)
  if (blockCountRow.count === 0) {
    // Seed Pesan Super Enkripsi (kunci default: "KunciDemo2026")
    const sampleMsg = superEncryptText(
      'Revisi Sidang Skripsi: Perbaiki bab 4 pengujian performa algoritma Vigenere + Vernam + AES-256 dan hitung MSE steganografi.',
      'KunciDemo2026',
      'CBC'
    );

    db.prepare(`
      INSERT INTO SecretMessage (
        title, senderEncrypted, mode, stage1VigenerePreview,
        stage2VernamHex, superCiphertextPayload, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Catatan Revisi Bimbingan Bab 4 & 5',
      encryptDatabaseColumn('Dr. Ir. Budi Santoso, M.Kom (Dosen Pembimbing)'),
      sampleMsg.mode,
      sampleMsg.stage1VigenerePreview,
      sampleMsg.stage2VernamHex,
      sampleMsg.combinedPayload,
      new Date().toISOString()
    );

    appendNewBlockchainRecord(db, {
      actionType: 'SUPER_ENCRYPT_MSG',
      actor: 'dosen_pembimbing',
      assetTitle: 'Catatan Revisi Bimbingan Bab 4 & 5',
      assetData: sampleMsg.combinedPayload,
    });

    // Seed File Terenkripsi ChaCha20 (kunci default: "KunciDemo2026")
    const sampleDocText = [
      '====================================================================',
      'DOKUMEN DRAF SKRIPSI TERENKRIPSI - SKRIPSICHAT ACADEMIC SHIELD',
      '====================================================================',
      'Nomor Naskah : SKRIPSI-2026/045/INF',
      'Tanggal      : 07 November 2026',
      'Status       : TERENKRIPSI CHACHA20-POLY1305 DENGAN INTEGRITAS AUTHTAG',
      'Ringkasan    : Draf lengkap naskah skripsi Bab 1 s/d Bab 5 siap sidang.',
      '====================================================================',
    ].join('\n');

    const encFile = encryptFileChaCha20(
      Buffer.from(sampleDocText, 'utf8'),
      'KunciDemo2026'
    );
    const storedFileName = 'draf_skripsi_bab1_5_revisi.docx.enc';
    fs.writeFileSync(path.join(UPLOADS_DIR, storedFileName), encFile.encryptedBuffer);

    db.prepare(`
      INSERT INTO EncryptedFile (
        originalName, mimeType, sizeBytes, storedFileName,
        nonceHex, authTagHex, originalSha256, uploaderEncrypted, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'draf_skripsi_bab1_5_revisi.docx',
      'text/plain',
      Buffer.byteLength(sampleDocText),
      storedFileName,
      encFile.nonceHex,
      encFile.authTagHex,
      encFile.originalSha256,
      encryptDatabaseColumn('dosen_pembimbing (Dosen Pembimbing)'),
      new Date().toISOString()
    );

    appendNewBlockchainRecord(db, {
      actionType: 'CHACHA20_FILE_VAULT',
      actor: 'dosen_pembimbing',
      assetTitle: 'draf_skripsi_bab1_5_revisi.docx',
      assetData: encFile.encryptedBuffer,
    });

    // Seed 1 Gambar Steganografi PNG Lossless (passkey: "KunciDemo2026")
    const coverBuf = generateSampleCoverPng(180, 120);
    const stegoRes = embedMessageInPngLsb(
      coverBuf,
      'KODE OTENTIKASI SIDANG SKRIPSI: Ruang Sidang 301, Verifikasi Dewan Penguji: 8841',
      'KunciDemo2026'
    );
    const storedPngName = 'diagram_arsitektur_skripsi.png';
    fs.writeFileSync(path.join(UPLOADS_DIR, storedPngName), stegoRes.stegoPngBuffer);

    db.prepare(`
      INSERT INTO StegoImage (
        title, storedPngName, width, height, embeddedBitsCount,
        psnrDb, mse, uploaderEncrypted, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Diagram Arsitektur Skripsi (LSB Tersembunyi)',
      storedPngName,
      stegoRes.width,
      stegoRes.height,
      stegoRes.embeddedBitsCount,
      stegoRes.psnrDb,
      stegoRes.mse,
      encryptDatabaseColumn('dosen_pembimbing (Dosen Pembimbing)'),
      new Date().toISOString()
    );

    appendNewBlockchainRecord(db, {
      actionType: 'LSB_STEGO_EMBED',
      actor: 'dosen_pembimbing',
      assetTitle: 'Diagram Arsitektur Skripsi (LSB Tersembunyi)',
      assetData: stegoRes.stegoPngBuffer,
    });
  }
}

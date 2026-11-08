import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { VIRTUAL_USB_DIR, UPLOADS_DIR, CHAIN_DIFFICULTY } from '../config/index.ts';
import { hashPasswordWithSalt } from '../crypto/1_passwordHash.ts';
import { generateDongleKeyFileContent, verifyDongleKeyFileContent, DONGLE_FILENAME } from '../crypto/1_dongleKey.ts';
import { superEncryptText } from '../crypto/2_superEncryption.ts';
import { encryptFileChaCha20 } from '../crypto/2_fileChaCha20.ts';
import { encryptDatabaseColumn } from '../crypto/3_dbEncryption.ts';
import { generateSampleCoverPng, embedMessageInPngLsb } from '../crypto/3_steganography.ts';
import {
  createGenesisBlock,
  createMinedBlock,
  hashAssetData,
  signData,
  canonicalJson,
  type BlockRecord,
} from '../crypto/4_blockchain.ts';
import { KeysService } from '../services/keys.service.ts';

export function insertBlockRow(db: DatabaseSync, block: BlockRecord): void {
  db.prepare(`
    INSERT INTO BlockchainLedger (
      "index", timestamp, actionType, actor, assetTitle, assetDataHash, previousHash, nonce, hash, signature
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    block.index,
    block.timestamp,
    block.actionType,
    block.actor,
    block.assetTitle,
    block.assetDataHash,
    block.previousHash,
    block.nonce,
    block.hash,
    block.signature || ''
  );
}

export function appendNewBlockchainRecord(
  db: DatabaseSync,
  params: {
    actionType: string;
    actor: string;
    assetTitle: string;
    assetData: string | Buffer;
    signature?: string;
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
    signature: params.signature || '',
  });

  insertBlockRow(db, newBlock);
  return newBlock;
}

export function seedInitialDemoData(db: DatabaseSync, forceFresh = false): void {
  // Cek apakah Genesis Block sudah ada jika tidak forceFresh
  if (!forceFresh) {
    const blockCountRow = db
      .prepare('SELECT COUNT(*) as count FROM BlockchainLedger')
      .get() as { count: number };
    if (blockCountRow.count > 0) {
      return;
    }
  }

  // 1. Inisialisasi Genesis Block
  const genesis = createGenesisBlock();
  insertBlockRow(db, genesis);

  // Kredensial Global Default
  const defaultPassAcademic = 'SkripsiChat2026!';
  const passHashAcademic = hashPasswordWithSalt(defaultPassAcademic).combined;

  // Vektor biometrik default (128 float)
  const defaultFaceVec = Array.from({ length: 128 }, (_, i) =>
    Number((Math.sin(i * 0.5) * 0.25).toFixed(4))
  );

  // Default Face Photo Avatar (PNG 1x1 base64)
  const defaultFacePhoto =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

  const nowIso = new Date().toISOString();

  // -------------------------------------------------------------
  // USER 1: DOSEN PEMBIMBING
  // -------------------------------------------------------------
  const dongleDosen = generateDongleKeyFileContent('dosen_pembimbing', 'DNG-DSN-2026');
  fs.writeFileSync(
    path.join(VIRTUAL_USB_DIR, 'dosen_pembimbing.skripsi_key'),
    dongleDosen.encryptedKeyFileContent,
    'utf8'
  );

  const keypairDosen = KeysService.generateUserKeypair();
  const kdfSaltDosen = crypto.randomBytes(16);
  fs.writeFileSync(path.join(VIRTUAL_USB_DIR, DONGLE_FILENAME), dongleDosen.encryptedKeyFileContent, 'utf8');
  try { fs.writeFileSync(path.join(VIRTUAL_USB_DIR, '.aegis_key'), dongleDosen.encryptedKeyFileContent, 'utf8'); } catch {}
  const verifiedDosenDongle = verifyDongleKeyFileContent(dongleDosen.encryptedKeyFileContent);
  const dongleSecretDosen = crypto.createHash('sha256').update(verifiedDosenDongle.payload!.dongleId + ':' + verifiedDosenDongle.payload!.signature).digest();
  const kekDosen = KeysService.deriveKek(defaultPassAcademic, dongleSecretDosen, kdfSaltDosen);
  const protectedKeyDosen = KeysService.protectPrivateKey(keypairDosen.privateKeyPem, kekDosen, 'dosen_pembimbing');

  const dosenInsert = db.prepare(`
    INSERT INTO User (
      username, fullNameEncrypted, role, passwordHash,
      dongleIdEncrypted, faceDescriptorEncrypted, facePhotoEncrypted, faceUpdatedAt,
      secretNoteEncrypted, publicKey, privateKeyEnc, privateKeyNonce, privateKeyTag,
      kdfSalt, identityNo, isActive, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    'dosen_pembimbing',
    encryptDatabaseColumn('Dr. Ir. Budi Santoso, M.Kom'),
    'DOSEN_PEMBIMBING',
    passHashAcademic,
    encryptDatabaseColumn(dongleDosen.dongleId),
    encryptDatabaseColumn(JSON.stringify(defaultFaceVec)),
    encryptDatabaseColumn(defaultFacePhoto),
    nowIso,
    encryptDatabaseColumn('NIP: 197805122003121002 | Kelompok Keahlian: Kriptografi & Keamanan Informasi'),
    keypairDosen.publicKeyPem,
    protectedKeyDosen.ciphertextHex,
    protectedKeyDosen.nonceHex,
    protectedKeyDosen.authTagHex,
    kdfSaltDosen.toString('hex'),
    '197805122003121002',
    nowIso
  );
  const dosenId = Number(dosenInsert.lastInsertRowid);

  appendNewBlockchainRecord(db, {
    actionType: 'REGISTER_USER_DONGLE',
    actor: 'dosen_pembimbing',
    assetTitle: `Registrasi Dosen Pembimbing & Hardware Dongle (${dongleDosen.dongleId})`,
    assetData: `dosen_pembimbing|${dongleDosen.dongleId}`,
  });

  // -------------------------------------------------------------
  // USER 2: MAHASISWA
  // -------------------------------------------------------------
  const dongleMhs = generateDongleKeyFileContent('mahasiswa_01', 'DNG-MHS-2026');
  fs.writeFileSync(
    path.join(VIRTUAL_USB_DIR, 'mahasiswa_01.skripsi_key'),
    dongleMhs.encryptedKeyFileContent,
    'utf8'
  );

  const keypairMhs = KeysService.generateUserKeypair();
  const kdfSaltMhs = crypto.randomBytes(16);
  const verifiedMhsDongle = verifyDongleKeyFileContent(dongleMhs.encryptedKeyFileContent);
  const dongleSecretMhs = crypto.createHash('sha256').update(verifiedMhsDongle.payload!.dongleId + ':' + verifiedMhsDongle.payload!.signature).digest();
  const kekMhs = KeysService.deriveKek(defaultPassAcademic, dongleSecretMhs, kdfSaltMhs);
  const protectedKeyMhs = KeysService.protectPrivateKey(keypairMhs.privateKeyPem, kekMhs, 'mahasiswa_01');

  const mhsInsert = db.prepare(`
    INSERT INTO User (
      username, fullNameEncrypted, role, passwordHash,
      dongleIdEncrypted, faceDescriptorEncrypted, facePhotoEncrypted, faceUpdatedAt,
      secretNoteEncrypted, publicKey, privateKeyEnc, privateKeyNonce, privateKeyTag,
      kdfSalt, identityNo, isActive, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    'mahasiswa_01',
    encryptDatabaseColumn('Rian Pratama'),
    'MAHASISWA',
    passHashAcademic,
    encryptDatabaseColumn(dongleMhs.dongleId),
    encryptDatabaseColumn(JSON.stringify(defaultFaceVec)),
    encryptDatabaseColumn(defaultFacePhoto),
    nowIso,
    encryptDatabaseColumn('NIM: 2108561042 | Topik Skripsi: Super Enkripsi & Blockchain pada Bimbingan Tugas Akhir'),
    keypairMhs.publicKeyPem,
    protectedKeyMhs.ciphertextHex,
    protectedKeyMhs.nonceHex,
    protectedKeyMhs.authTagHex,
    kdfSaltMhs.toString('hex'),
    '2108561042',
    nowIso
  );
  const mhsId = Number(mhsInsert.lastInsertRowid);

  appendNewBlockchainRecord(db, {
    actionType: 'REGISTER_USER_DONGLE',
    actor: 'mahasiswa_01',
    assetTitle: `Registrasi Mahasiswa & Hardware Dongle (${dongleMhs.dongleId})`,
    assetData: `mahasiswa_01|${dongleMhs.dongleId}`,
  });

  // Pasang default virtual dongle aktif ke mahasiswa_01
  fs.writeFileSync(
    path.join(VIRTUAL_USB_DIR, '.skripsi_key'),
    dongleMhs.encryptedKeyFileContent,
    'utf8'
  );
  try {
    fs.writeFileSync(
      path.join(VIRTUAL_USB_DIR, '.aegis_key'),
      dongleMhs.encryptedKeyFileContent,
      'utf8'
    );
  } catch {}

  // -------------------------------------------------------------
  // CONVERSATION: RUANG BIMBINGAN (RSA-OAEP Key Wrapping)
  // -------------------------------------------------------------
  const kConv = KeysService.createConversationKey();
  const wrappedStudent = KeysService.wrapKey(kConv, keypairMhs.publicKeyPem);
  const wrappedLecturer = KeysService.wrapKey(kConv, keypairDosen.publicKeyPem);

  const convInsert = db.prepare(`
    INSERT INTO Conversation (
      studentId, lecturerId, topic, wrappedKeyStudent, wrappedKeyLecturer, isActive, createdAt
    ) VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(
    mhsId,
    dosenId,
    'Implementasi Super Enkripsi & Blockchain pada Bimbingan Tugas Akhir',
    wrappedStudent,
    wrappedLecturer,
    nowIso
  );
  const convId = Number(convInsert.lastInsertRowid);

  // -------------------------------------------------------------
  // PESAN 1: Super Enkripsi (Mahasiswa ke Dosen)
  // -------------------------------------------------------------
  const sampleMsg1 = superEncryptText(
    'Selamat pagi Bapak Dr. Ir. Budi Santoso, saya telah menyelesaikan implementasi super enkripsi teks (Vigenere + Vernam + AES-256) serta pengujian steganografi untuk Bab 4.',
    'KunciDemo2026',
    'CBC'
  );

  const msg1Insert = db.prepare(`
    INSERT INTO SecretMessage (
      convId, title, senderEncrypted, mode, stage1VigenerePreview,
      stage2VernamHex, superCiphertextPayload, msgType, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'TEXT', ?)
  `).run(
    convId,
    'Laporan Kemajuan Bab 4 & Pengujian Kriptografi',
    encryptDatabaseColumn('mahasiswa_01 (Rian Pratama)'),
    sampleMsg1.mode,
    sampleMsg1.stage1VigenerePreview,
    sampleMsg1.stage2VernamHex,
    sampleMsg1.combinedPayload,
    nowIso
  );
  const msg1Id = Number(msg1Insert.lastInsertRowid);

  appendNewBlockchainRecord(db, {
    actionType: 'SUPER_ENCRYPT_MSG',
    actor: 'mahasiswa_01',
    assetTitle: 'Laporan Kemajuan Bab 4 & Pengujian Kriptografi',
    assetData: sampleMsg1.combinedPayload,
  });

  // -------------------------------------------------------------
  // PESAN 2: Super Enkripsi (Dosen ke Mahasiswa)
  // -------------------------------------------------------------
  const sampleMsg2 = superEncryptText(
    'Selamat pagi Rian. Bagus sekali, silakan lampirkan naskah draf Bab 4 beserta bukti pengujian avalanche effect dan nilai PSNR minimal 35 dB untuk saya evaluasi.',
    'KunciDemo2026',
    'CBC'
  );

  db.prepare(`
    INSERT INTO SecretMessage (
      convId, title, senderEncrypted, mode, stage1VigenerePreview,
      stage2VernamHex, superCiphertextPayload, msgType, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'TEXT', ?)
  `).run(
    convId,
    'Tanggapan Pembimbing & Arahan Pengujian Avalanche Effect',
    encryptDatabaseColumn('dosen_pembimbing (Dr. Ir. Budi Santoso, M.Kom)'),
    sampleMsg2.mode,
    sampleMsg2.stage1VigenerePreview,
    sampleMsg2.stage2VernamHex,
    sampleMsg2.combinedPayload,
    nowIso
  );

  appendNewBlockchainRecord(db, {
    actionType: 'SUPER_ENCRYPT_MSG',
    actor: 'dosen_pembimbing',
    assetTitle: 'Tanggapan Pembimbing & Arahan Pengujian Avalanche Effect',
    assetData: sampleMsg2.combinedPayload,
  });

  // -------------------------------------------------------------
  // PESAN PENTING (Enkripsi Kolom Database AES-256-GCM)
  // -------------------------------------------------------------
  const importantPlain = 'Target Sidang: Analisis avalanche effect super enkripsi harus mencapai di atas 45%, dan citra steganografi wajib memiliki PSNR > 38 dB.';
  const masterKeyImp = KeysService.loadMasterDbKey();
  const ivImp = crypto.randomBytes(12);
  const cipherImp = crypto.createCipheriv('aes-256-gcm', masterKeyImp, ivImp);
  cipherImp.setAAD(Buffer.from(`important_messages.content|${msg1Id}`, 'utf8'));
  let encImp = cipherImp.update(importantPlain, 'utf8', 'hex');
  encImp += cipherImp.final('hex');
  const tagImp = cipherImp.getAuthTag().toString('hex');

  db.prepare(`
    INSERT INTO ImportantMessage (
      convId, messageId, category, contentEnc, nonceHex, authTagHex, markedBy, markedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    convId,
    msg1Id,
    'REVISI_PENTING',
    encImp,
    ivImp.toString('hex'),
    tagImp,
    'dosen_pembimbing',
    nowIso
  );

  // -------------------------------------------------------------
  // FILE TERENKRIPSI CHACHA20-POLY1305
  // -------------------------------------------------------------
  const sampleDocText = [
    '====================================================================',
    'DOKUMEN DRAF SKRIPSI TERENKRIPSI - SKRIPSICHAT ACADEMIC SHIELD',
    '====================================================================',
    'Judul        : Implementasi Super Enkripsi & Blockchain pada Bimbingan Tugas Akhir',
    'Mahasiswa    : Rian Pratama (NIM: 2108561042)',
    'Pembimbing   : Dr. Ir. Budi Santoso, M.Kom (NIP: 197805122003121002)',
    'Status       : TERENKRIPSI CHACHA20-POLY1305 DENGAN AUTHTAG INTEGRITY',
    'Bab Terlampir: Bab 1 Pendahuluan s/d Bab 4 Pengujian dan Evaluasi Kriptografi',
    '====================================================================',
  ].join('\n');

  const encFile = encryptFileChaCha20(
    Buffer.from(sampleDocText, 'utf8'),
    'KunciDemo2026'
  );
  const storedFileName = 'draf_skripsi_bab1_4_pengujian.docx.enc';
  fs.writeFileSync(path.join(UPLOADS_DIR, storedFileName), encFile.encryptedBuffer);

  db.prepare(`
    INSERT INTO EncryptedFile (
      convId, originalName, mimeType, sizeBytes, storedFileName,
      nonceHex, authTagHex, originalSha256, uploaderEncrypted,
      version, status, reviewedBy, reviewNote, reviewedAt, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'APPROVED', ?, ?, ?, ?)
  `).run(
    convId,
    'draf_skripsi_bab1_4_pengujian.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    Buffer.byteLength(sampleDocText),
    storedFileName,
    encFile.nonceHex,
    encFile.authTagHex,
    encFile.originalSha256,
    encryptDatabaseColumn('mahasiswa_01 (Rian Pratama)'),
    'dosen_pembimbing',
    'Metodologi pengujian super enkripsi dan steganografi sudah valid. Disetujui untuk dimasukkan ke naskah final.',
    nowIso,
    nowIso
  );

  appendNewBlockchainRecord(db, {
    actionType: 'CHACHA20_FILE_VAULT',
    actor: 'mahasiswa_01',
    assetTitle: 'draf_skripsi_bab1_4_pengujian.docx',
    assetData: encFile.encryptedBuffer,
  });

  // -------------------------------------------------------------
  // STEGANOGRAFI GAMBAR PNG LOSSLESS (LSB)
  // -------------------------------------------------------------
  const coverBuf = generateSampleCoverPng(180, 120);
  const stegoRes = embedMessageInPngLsb(
    coverBuf,
    'SKRIPSICHAT-VERIFIKASI-2026: DOKUMEN DAN IDENTITAS MAHASISWA 2108561042 DINYATAKAN VALID',
    'KunciDemo2026'
  );
  const storedPngName = 'diagram_arsitektur_keamanan.png';
  fs.writeFileSync(path.join(UPLOADS_DIR, storedPngName), stegoRes.stegoPngBuffer);

  db.prepare(`
    INSERT INTO StegoImage (
      convId, title, storedPngName, width, height, embeddedBitsCount,
      psnrDb, mse, uploaderEncrypted, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    convId,
    'Diagram Alir Protokol Keamanan SkripsiChat (LSB Tersembunyi)',
    storedPngName,
    stegoRes.width,
    stegoRes.height,
    stegoRes.embeddedBitsCount,
    stegoRes.psnrDb,
    stegoRes.mse,
    encryptDatabaseColumn('dosen_pembimbing (Dr. Ir. Budi Santoso, M.Kom)'),
    nowIso
  );

  appendNewBlockchainRecord(db, {
    actionType: 'LSB_STEGO_EMBED',
    actor: 'dosen_pembimbing',
    assetTitle: 'Diagram Alir Protokol Keamanan SkripsiChat (LSB Tersembunyi)',
    assetData: stegoRes.stegoPngBuffer,
  });

  // -------------------------------------------------------------
  // ASET AKADEMIK & TANDA TANGAN DIGITAL BLOCKCHAIN (RSA-PSS)
  // -------------------------------------------------------------
  const assetPayload = {
    assetType: 'ACC_BAB',
    title: 'Persetujuan ACC Bimbingan Bab 1 s/d Bab 4',
    studentId: 'mahasiswa_01',
    issuerId: 'dosen_pembimbing',
    docHash: encFile.originalSha256,
    issuedAt: nowIso,
  };
  const canonicalStr = canonicalJson(assetPayload);
  const pssSignature = signData(canonicalStr, keypairDosen.privateKeyPem);

  const assetBlock = appendNewBlockchainRecord(db, {
    actionType: 'ISSUE_ACADEMIC_ASSET',
    actor: 'dosen_pembimbing',
    assetTitle: 'Persetujuan ACC Bimbingan Bab 1 s/d Bab 4',
    assetData: canonicalStr,
    signature: pssSignature,
  });

  db.prepare(`
    INSERT INTO AcademicAsset (
      blockIndex, assetType, studentId, issuerId, docHash, title, issuedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    assetBlock.index,
    'ACC_BAB',
    'mahasiswa_01',
    'dosen_pembimbing',
    encFile.originalSha256,
    'Persetujuan ACC Bimbingan Bab 1 s/d Bab 4',
    nowIso
  );

  // -------------------------------------------------------------
  // AUDIT LOGS
  // -------------------------------------------------------------
  db.prepare(`
    INSERT INTO AuditLog (actorId, action, targetType, targetId, result, detail, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('ADMIN', 'PROVISION_USER', 'USER', dosenId.toString(), 'SUCCESS', 'Inisialisasi akun Dosen Pembimbing @dosen_pembimbing', nowIso);

  db.prepare(`
    INSERT INTO AuditLog (actorId, action, targetType, targetId, result, detail, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('ADMIN', 'PROVISION_USER', 'USER', mhsId.toString(), 'SUCCESS', 'Inisialisasi akun Mahasiswa @mahasiswa_01', nowIso);

  db.prepare(`
    INSERT INTO AuditLog (actorId, action, targetType, targetId, result, detail, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('dosen_pembimbing', 'APPROVE_DRAFT', 'FILE', '1', 'SUCCESS', 'ACC Bimbingan draf_skripsi_bab1_4_pengujian.docx', nowIso);
}

export function resetAndSeedDatabase(db: DatabaseSync): void {
  // 1. Bersihkan seluruh data tabel
  db.exec(`
    DELETE FROM AuditLog;
    DELETE FROM AcademicAsset;
    DELETE FROM BlockchainLedger;
    DELETE FROM StegoImage;
    DELETE FROM EncryptedFile;
    DELETE FROM ImportantMessage;
    DELETE FROM SecretMessage;
    DELETE FROM Conversation;
    DELETE FROM User;
  `);

  // 2. Bersihkan file uploads lama
  if (fs.existsSync(UPLOADS_DIR)) {
    const files = fs.readdirSync(UPLOADS_DIR);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(UPLOADS_DIR, file));
      } catch {
        // Abaikan jika terkunci
      }
    }
  }

  // 3. Seed data baru
  seedInitialDemoData(db, true);
}

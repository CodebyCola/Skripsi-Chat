/**
 * ============================================================================
 * DATABASE ENGINE (SQLite `dev.db` + Auto-Seeding Demo Data)
 * ============================================================================
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashPasswordWithSalt } from './crypto/1_passwordHash.ts';
import { generateDongleKeyFileContent } from './crypto/1_dongleKey.ts';
import { superEncryptText } from './crypto/2_superEncryption.ts';
import { encryptFileChaCha20 } from './crypto/2_fileChaCha20.ts';
import { encryptDatabaseColumn } from './crypto/3_dbEncryption.ts';
import { generateSampleCoverPng, embedMessageInPngLsb } from './crypto/3_steganography.ts';
import {
  createGenesisBlock,
  createMinedBlock,
  hashAssetData,
  type BlockRecord,
} from './crypto/4_blockchain.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SERVER_ROOT = path.resolve(__dirname, '..');
export const PRISMA_DIR = path.join(SERVER_ROOT, 'prisma');
export const UPLOADS_DIR = path.join(SERVER_ROOT, 'uploads');
export const VIRTUAL_USB_DIR = path.join(SERVER_ROOT, 'virtual_usb_dongle');
export const DB_FILE_PATH = path.join(PRISMA_DIR, 'dev.db');

if (!fs.existsSync(PRISMA_DIR)) fs.mkdirSync(PRISMA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(VIRTUAL_USB_DIR)) fs.mkdirSync(VIRTUAL_USB_DIR, { recursive: true });

export const db = new DatabaseSync(DB_FILE_PATH);

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      fullNameEncrypted TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'INVESTIGATOR',
      passwordHash TEXT NOT NULL,
      dongleIdEncrypted TEXT NOT NULL,
      faceDescriptorEncrypted TEXT NOT NULL,
      facePhotoEncrypted TEXT NOT NULL DEFAULT '',
      faceUpdatedAt TEXT NOT NULL DEFAULT '',
      secretNoteEncrypted TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS SecretMessage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      senderEncrypted TEXT NOT NULL,
      mode TEXT NOT NULL,
      stage1VigenerePreview TEXT NOT NULL,
      stage2VernamHex TEXT NOT NULL,
      superCiphertextPayload TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS EncryptedFile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      originalName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      sizeBytes INTEGER NOT NULL,
      storedFileName TEXT NOT NULL,
      nonceHex TEXT NOT NULL,
      authTagHex TEXT NOT NULL,
      originalSha256 TEXT NOT NULL,
      uploaderEncrypted TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS StegoImage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      storedPngName TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      embeddedBitsCount INTEGER NOT NULL,
      psnrDb REAL NOT NULL,
      mse REAL NOT NULL,
      uploaderEncrypted TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS BlockchainLedger (
      "index" INTEGER PRIMARY KEY,
      timestamp TEXT NOT NULL,
      actionType TEXT NOT NULL,
      actor TEXT NOT NULL,
      assetTitle TEXT NOT NULL,
      assetDataHash TEXT NOT NULL,
      previousHash TEXT NOT NULL,
      nonce INTEGER NOT NULL,
      hash TEXT NOT NULL
    );
  `);

  // Migrasi aman jika file dev.db lama belum memiliki kolom foto wajah biometrik
  try {
    db.exec(`ALTER TABLE User ADD COLUMN facePhotoEncrypted TEXT NOT NULL DEFAULT ''`);
  } catch {
    // Kolom sudah ada
  }
  try {
    db.exec(`ALTER TABLE User ADD COLUMN faceUpdatedAt TEXT NOT NULL DEFAULT ''`);
  } catch {
    // Kolom sudah ada
  }

  // Cek apakah Genesis Block sudah ada
  const blockCountRow = db
    .prepare('SELECT COUNT(*) as count FROM BlockchainLedger')
    .get() as { count: number };

  if (blockCountRow.count === 0) {
    const genesis = createGenesisBlock();
    insertBlockRow(genesis);
  }

  // Cek apakah akun Demo Default sudah ada
  const userCountRow = db.prepare('SELECT COUNT(*) as count FROM User').get() as {
    count: number;
  };

  if (userCountRow.count === 0) {
    seedInitialDemoData();
  }
}

export function insertBlockRow(block: BlockRecord): void {
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

export function appendNewBlockchainRecord(params: {
  actionType: string;
  actor: string;
  assetTitle: string;
  assetData: string | Buffer;
}): BlockRecord {
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

  insertBlockRow(newBlock);
  return newBlock;
}

function seedInitialDemoData(): void {
  const defaultUsername = 'editor_aegis';
  const defaultPass = 'Aegis2026!';
  const passHash = hashPasswordWithSalt(defaultPass).combined;

  // Buat Dongle Default & simpan ke folder virtual_usb_dongle/.aegis_key
  const dongle = generateDongleKeyFileContent(
    defaultUsername,
    'DONGLE-AEGIS-MASTER-001'
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

  db.prepare(`
    INSERT INTO User (
      username, fullNameEncrypted, role, passwordHash,
      dongleIdEncrypted, faceDescriptorEncrypted, secretNoteEncrypted, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    defaultUsername,
    encryptDatabaseColumn('Dr. Budi Santoso (Auditor Investigasi Utama)'),
    'CHIEF_AUDITOR',
    passHash,
    encryptDatabaseColumn(dongle.dongleId),
    encryptDatabaseColumn(JSON.stringify(defaultFaceVec)),
    encryptDatabaseColumn('Kredensial Akses Level-5 | Clearance ID: IDN-9982-VAULT'),
    new Date().toISOString()
  );

  appendNewBlockchainRecord({
    actionType: 'REGISTER_USER_DONGLE',
    actor: defaultUsername,
    assetTitle: `Registrasi Auditor & USB Dongle (${dongle.dongleId})`,
    assetData: `${defaultUsername}|${dongle.dongleId}`,
  });

  // Seed 1 Pesan Super Enkripsi (kunci default: "KunciDemo2026")
  const sampleMsg = superEncryptText(
    'Laporan Saksi #01: Ditemukan transfer mencurigakan sebesar Rp 4,2 Miliar pada rekening penampungan proyek pengadaan.',
    'KunciDemo2026',
    'CBC'
  );

  db.prepare(`
    INSERT INTO SecretMessage (
      title, senderEncrypted, mode, stage1VigenerePreview,
      stage2VernamHex, superCiphertextPayload, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Bocoran Audit Pengadaan Server 2026',
    encryptDatabaseColumn('Informan_Anonim_07 (Divisi Keuangan)'),
    sampleMsg.mode,
    sampleMsg.stage1VigenerePreview,
    sampleMsg.stage2VernamHex,
    sampleMsg.combinedPayload,
    new Date().toISOString()
  );

  appendNewBlockchainRecord({
    actionType: 'SUPER_ENCRYPT_MSG',
    actor: defaultUsername,
    assetTitle: 'Bocoran Audit Pengadaan Server 2026',
    assetData: sampleMsg.combinedPayload,
  });

  // Seed 1 File Terenkripsi ChaCha20 (kunci default: "KunciDemo2026")
  const sampleDocText = [
    '====================================================================',
    'DOKUMEN BUKTI TRANSAKSI RAHASIA - AEGISVAULT CHAIN OF CUSTODY',
    '====================================================================',
    'Nomor Dokumen : INV-2026/099/AUDIT',
    'Tanggal       : 06 November 2026',
    'Status        : SANGAT RAHASIA (DIENKRIPSI DENGAN CHACHA20-POLY1305)',
    'Rincian       : Bukti mutasi rekening koran & kontrak pengadaan.',
    '====================================================================',
  ].join('\n');

  const encFile = encryptFileChaCha20(
    Buffer.from(sampleDocText, 'utf8'),
    'KunciDemo2026'
  );
  const storedFileName = 'bukti_mutasi_rekening_2026.txt.enc';
  fs.writeFileSync(path.join(UPLOADS_DIR, storedFileName), encFile.encryptedBuffer);

  db.prepare(`
    INSERT INTO EncryptedFile (
      originalName, mimeType, sizeBytes, storedFileName,
      nonceHex, authTagHex, originalSha256, uploaderEncrypted, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'bukti_mutasi_rekening_2026.txt',
    'text/plain',
    Buffer.byteLength(sampleDocText),
    storedFileName,
    encFile.nonceHex,
    encFile.authTagHex,
    encFile.originalSha256,
    encryptDatabaseColumn('editor_aegis (Chief Auditor)'),
    new Date().toISOString()
  );

  appendNewBlockchainRecord({
    actionType: 'CHACHA20_FILE_VAULT',
    actor: defaultUsername,
    assetTitle: 'bukti_mutasi_rekening_2026.txt',
    assetData: encFile.encryptedBuffer,
  });

  // Seed 1 Gambar Steganografi PNG Lossless (passkey: "KunciDemo2026")
  const coverBuf = generateSampleCoverPng(180, 120);
  const stegoRes = embedMessageInPngLsb(
    coverBuf,
    'KOORDINAT BRANKAS BUKTI FISIK: Gedung Arsip Lt.3 Ruang B-12 (PIN: 7749)',
    'KunciDemo2026'
  );
  const storedPngName = 'stego_barang_bukti_01.png';
  fs.writeFileSync(path.join(UPLOADS_DIR, storedPngName), stegoRes.stegoPngBuffer);

  db.prepare(`
    INSERT INTO StegoImage (
      title, storedPngName, width, height, embeddedBitsCount,
      psnrDb, mse, uploaderEncrypted, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Foto Barang Bukti Lapangan #01 (Berisi Koordinat LSB)',
    storedPngName,
    stegoRes.width,
    stegoRes.height,
    stegoRes.embeddedBitsCount,
    stegoRes.psnrDb,
    stegoRes.mse,
    encryptDatabaseColumn('editor_aegis (Chief Auditor)'),
    new Date().toISOString()
  );

  appendNewBlockchainRecord({
    actionType: 'LSB_STEGO_EMBED',
    actor: defaultUsername,
    assetTitle: 'Foto Barang Bukti Lapangan #01 (Berisi Koordinat LSB)',
    assetData: stegoRes.stegoPngBuffer,
  });
}

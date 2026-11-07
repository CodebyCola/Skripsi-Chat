import { DatabaseSync } from 'node:sqlite';

export function createTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      fullNameEncrypted TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'MAHASISWA',
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

  // Migrasi kolom tabel User jika belum ada
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
}

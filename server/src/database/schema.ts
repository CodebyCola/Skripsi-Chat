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
      publicKey TEXT NOT NULL DEFAULT '',
      privateKeyEnc TEXT NOT NULL DEFAULT '',
      privateKeyNonce TEXT NOT NULL DEFAULT '',
      privateKeyTag TEXT NOT NULL DEFAULT '',
      kdfSalt TEXT NOT NULL DEFAULT '',
      identityNo TEXT NOT NULL DEFAULT '',
      isActive INTEGER NOT NULL DEFAULT 1,
      failedAttempts INTEGER NOT NULL DEFAULT 0,
      lockedUntil TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Conversation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId INTEGER NOT NULL,
      lecturerId INTEGER NOT NULL,
      topic TEXT NOT NULL,
      wrappedKeyStudent TEXT NOT NULL,
      wrappedKeyLecturer TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS SecretMessage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      convId INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      senderEncrypted TEXT NOT NULL,
      mode TEXT NOT NULL,
      stage1VigenerePreview TEXT NOT NULL,
      stage2VernamHex TEXT NOT NULL,
      superCiphertextPayload TEXT NOT NULL,
      msgType TEXT NOT NULL DEFAULT 'TEXT',
      refId TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ImportantMessage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      convId INTEGER NOT NULL,
      messageId INTEGER NOT NULL,
      category TEXT NOT NULL,
      contentEnc TEXT NOT NULL,
      nonceHex TEXT NOT NULL,
      authTagHex TEXT NOT NULL,
      markedBy TEXT NOT NULL,
      markedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS EncryptedFile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      convId INTEGER NOT NULL DEFAULT 1,
      originalName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      sizeBytes INTEGER NOT NULL,
      storedFileName TEXT NOT NULL,
      nonceHex TEXT NOT NULL,
      authTagHex TEXT NOT NULL,
      originalSha256 TEXT NOT NULL,
      uploaderEncrypted TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'SUBMITTED',
      reviewedBy TEXT NOT NULL DEFAULT '',
      reviewNote TEXT NOT NULL DEFAULT '',
      reviewedAt TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS StegoImage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      convId INTEGER NOT NULL DEFAULT 1,
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
      hash TEXT NOT NULL,
      signature TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS AcademicAsset (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blockIndex INTEGER NOT NULL,
      assetType TEXT NOT NULL,
      studentId TEXT NOT NULL,
      issuerId TEXT NOT NULL,
      docHash TEXT NOT NULL,
      title TEXT NOT NULL,
      issuedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS AuditLog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actorId TEXT NOT NULL,
      action TEXT NOT NULL,
      targetType TEXT NOT NULL,
      targetId TEXT NOT NULL,
      result TEXT NOT NULL,
      detail TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // Safe migrations untuk tabel User
  const userColumns = [
    `ALTER TABLE User ADD COLUMN facePhotoEncrypted TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE User ADD COLUMN faceUpdatedAt TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE User ADD COLUMN publicKey TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE User ADD COLUMN privateKeyEnc TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE User ADD COLUMN privateKeyNonce TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE User ADD COLUMN privateKeyTag TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE User ADD COLUMN kdfSalt TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE User ADD COLUMN identityNo TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE User ADD COLUMN isActive INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE User ADD COLUMN failedAttempts INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE User ADD COLUMN lockedUntil TEXT NOT NULL DEFAULT ''`,
  ];
  for (const q of userColumns) {
    try {
      db.exec(q);
    } catch {
      // Kolom sudah ada
    }
  }

  // Safe migrations untuk tabel EncryptedFile
  const fileColumns = [
    `ALTER TABLE EncryptedFile ADD COLUMN convId INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE EncryptedFile ADD COLUMN version INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE EncryptedFile ADD COLUMN status TEXT NOT NULL DEFAULT 'SUBMITTED'`,
    `ALTER TABLE EncryptedFile ADD COLUMN reviewedBy TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE EncryptedFile ADD COLUMN reviewNote TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE EncryptedFile ADD COLUMN reviewedAt TEXT NOT NULL DEFAULT ''`,
  ];
  for (const q of fileColumns) {
    try {
      db.exec(q);
    } catch {
      // Kolom sudah ada
    }
  }

  // Safe migrations untuk tabel SecretMessage & StegoImage
  const messageColumns = [
    `ALTER TABLE SecretMessage ADD COLUMN convId INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE SecretMessage ADD COLUMN msgType TEXT NOT NULL DEFAULT 'TEXT'`,
    `ALTER TABLE SecretMessage ADD COLUMN refId TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE StegoImage ADD COLUMN convId INTEGER NOT NULL DEFAULT 1`,
  ];
  for (const q of messageColumns) {
    try {
      db.exec(q);
    } catch {
      // Kolom sudah ada
    }
  }

  // Safe migrations untuk tabel BlockchainLedger
  try {
    db.exec(`ALTER TABLE BlockchainLedger ADD COLUMN signature TEXT NOT NULL DEFAULT ''`);
  } catch {
    // Kolom sudah ada
  }
}

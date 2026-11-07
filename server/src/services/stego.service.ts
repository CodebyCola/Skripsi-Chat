import fs from 'node:fs';
import path from 'node:path';

import { db, appendNewBlockchainRecord } from '../database/connection.ts';
import { UPLOADS_DIR } from '../config/index.ts';
import {
  generateSampleCoverPng,
  embedMessageInPngLsb,
  extractMessageFromPngLsb,
} from '../crypto/3_steganography.ts';
import {
  encryptDatabaseColumn,
  decryptDatabaseColumn,
} from '../crypto/3_dbEncryption.ts';

export class StegoService {
  static getStegoImages() {
    const rows = db
      .prepare('SELECT * FROM StegoImage ORDER BY id DESC')
      .all() as Array<{
      id: number;
      title: string;
      storedPngName: string;
      width: number;
      height: number;
      embeddedBitsCount: number;
      psnrDb: number;
      mse: number;
      uploaderEncrypted: string;
      createdAt: string;
    }>;

    return rows.map((r) => {
      const filePath = path.join(UPLOADS_DIR, r.storedPngName);
      let imageDataUrl = '';
      if (fs.existsSync(filePath)) {
        const buf = fs.readFileSync(filePath);
        imageDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
      }

      return {
        id: r.id,
        title: r.title,
        storedPngName: r.storedPngName,
        width: r.width,
        height: r.height,
        embeddedBitsCount: r.embeddedBitsCount,
        psnrDb: r.psnrDb,
        mse: r.mse,
        uploader: decryptDatabaseColumn(r.uploaderEncrypted),
        uploaderRawEncryptedInDb: r.uploaderEncrypted,
        imageDataUrl,
        createdAt: r.createdAt,
      };
    });
  }

  static embedStegoImage(body: {
    title: string;
    secretMessage: string;
    passkey?: string;
    coverPngBase64?: string;
    uploader?: string;
  }) {
    const title = (body.title || 'Bukti Foto Steganografi LSB').trim();
    const secretMessage = body.secretMessage || '';
    const passkey = body.passkey || '';
    const uploader = body.uploader || 'editor_aegis';

    if (!secretMessage) {
      throw new Error('Pesan rahasia yang ingin disembunyikan wajib diisi');
    }

    let coverBuffer: Buffer;
    if (body.coverPngBase64) {
      const clean = body.coverPngBase64.includes(',')
        ? body.coverPngBase64.split(',')[1]
        : body.coverPngBase64;
      coverBuffer = Buffer.from(clean, 'base64');
    } else {
      coverBuffer = generateSampleCoverPng(200, 140);
    }

    const embedResult = embedMessageInPngLsb(coverBuffer, secretMessage, passkey);
    const storedPngName = `stego_${Date.now()}.png`;
    fs.writeFileSync(
      path.join(UPLOADS_DIR, storedPngName),
      embedResult.stegoPngBuffer
    );

    const info = db
      .prepare(`
        INSERT INTO StegoImage (
          title, storedPngName, width, height, embeddedBitsCount,
          psnrDb, mse, uploaderEncrypted, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        title,
        storedPngName,
        embedResult.width,
        embedResult.height,
        embedResult.embeddedBitsCount,
        embedResult.psnrDb,
        embedResult.mse,
        encryptDatabaseColumn(uploader),
        new Date().toISOString()
      );

    // Catat ke Blockchain Audit Ledger
    appendNewBlockchainRecord({
      actionType: 'LSB_STEGO_EMBED',
      actor: uploader,
      assetTitle: title,
      assetData: embedResult.stegoPngBuffer,
    });

    return {
      id: Number(info.lastInsertRowid),
      title,
      storedPngName,
      width: embedResult.width,
      height: embedResult.height,
      maxCapacityBytes: embedResult.maxCapacityBytes,
      embeddedBitsCount: embedResult.embeddedBitsCount,
      modifiedPixelsCount: embedResult.modifiedPixelsCount,
      mse: embedResult.mse,
      psnrDb: embedResult.psnrDb,
      coverDataUrl: `data:image/png;base64,${coverBuffer.toString('base64')}`,
      stegoDataUrl: `data:image/png;base64,${embedResult.stegoPngBuffer.toString('base64')}`,
    };
  }

  static extractStegoImage(body: {
    id?: number;
    stegoPngBase64?: string;
    passkey?: string;
  }) {
    let pngBuffer: Buffer;

    if (body.stegoPngBase64) {
      const clean = body.stegoPngBase64.includes(',')
        ? body.stegoPngBase64.split(',')[1]
        : body.stegoPngBase64;
      pngBuffer = Buffer.from(clean, 'base64');
    } else if (body.id) {
      const row = db
        .prepare('SELECT storedPngName FROM StegoImage WHERE id = ?')
        .get(body.id) as { storedPngName: string } | undefined;
      if (!row) {
        throw new Error('Data gambar steganografi tidak ditemukan');
      }
      const filePath = path.join(UPLOADS_DIR, row.storedPngName);
      if (!fs.existsSync(filePath)) {
        throw new Error('File PNG steganografi tidak ditemukan di disk');
      }
      pngBuffer = fs.readFileSync(filePath);
    } else {
      throw new Error('Pilih gambar steganografi atau unggah file PNG terlebih dahulu');
    }

    const extracted = extractMessageFromPngLsb(pngBuffer, body.passkey || '');
    return {
      success: true,
      ...extracted,
    };
  }

  static getDatabaseRawInspection() {
    const rawUsers = db.prepare('SELECT * FROM User').all() as Array<{
      id: number;
      username: string;
      fullNameEncrypted: string;
      role: string;
      passwordHash: string;
      dongleIdEncrypted: string;
      faceDescriptorEncrypted: string;
      secretNoteEncrypted: string;
      createdAt: string;
    }>;

    const rawMessages = db
      .prepare(
        'SELECT id, title, senderEncrypted, mode, superCiphertextPayload, createdAt FROM SecretMessage'
      )
      .all() as Array<{
      id: number;
      title: string;
      senderEncrypted: string;
      mode: string;
      superCiphertextPayload: string;
      createdAt: string;
    }>;

    return {
      encryptionSpec: {
        columnEncryptionAlgorithm: 'AES-256-GCM (Authenticated Encryption)',
        passwordHashAlgorithm: 'Scrypt (N=16384, r=8, p=1) + 16-Byte Random Salt',
        sqliteFilePath: 'server/prisma/dev.db',
      },
      usersTable: rawUsers.map((u) => ({
        id: u.id,
        username: u.username,
        rawInSqlite: {
          fullNameEncrypted: u.fullNameEncrypted,
          passwordHash: u.passwordHash,
          dongleIdEncrypted: u.dongleIdEncrypted,
          faceDescriptorEncrypted: `${u.faceDescriptorEncrypted.slice(0, 68)}...`,
          secretNoteEncrypted: u.secretNoteEncrypted,
        },
        decryptedInApp: {
          fullName: decryptDatabaseColumn(u.fullNameEncrypted),
          dongleId: decryptDatabaseColumn(u.dongleIdEncrypted),
          secretNote: decryptDatabaseColumn(u.secretNoteEncrypted),
        },
      })),
      messagesTable: rawMessages.map((m) => ({
        id: m.id,
        title: m.title,
        rawInSqlite: {
          senderEncrypted: m.senderEncrypted,
          superCiphertextPayload: m.superCiphertextPayload,
        },
        decryptedInApp: {
          sender: decryptDatabaseColumn(m.senderEncrypted),
          mode: m.mode,
        },
      })),
    };
  }
}

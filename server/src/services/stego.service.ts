import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { db, appendNewBlockchainRecord } from '../database/connection.ts';
import { UPLOADS_DIR, DB_PATH } from '../config/index.ts';
import { AppError, ErrorCodes } from '../config/errors.ts';
import {
  generateSampleCoverPng,
  embedMessageInPngLsb,
  extractMessageFromPngLsb,
  embedPayloadInPngLsb,
  extractPayloadFromPngLsb,
  getStegoCapacity,
} from '../crypto/3_steganography.ts';
import {
  encryptDatabaseColumn,
  decryptDatabaseColumn,
} from '../crypto/3_dbEncryption.ts';
import { ChatService } from './chat.service.ts';
import { AuditService } from './audit.service.ts';
import type { Session } from './session.service.ts';

function asId(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError(ErrorCodes.ERR_AUTH_INVALID, `${label} tidak valid`, 400);
  }
  return n;
}

const stegoAad = (convId: number) => Buffer.from(String(convId), 'utf8');

export interface StegoPayloadData {
  v: number;
  conv_id: number;
  sender_id: number;
  sender_username: string;
  sent_at: string;
  note: string;
  cover_sha256: string;
}

function encryptStegoPayload(data: StegoPayloadData, kStego: Buffer): Buffer {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', kStego, nonce);
  cipher.setAAD(stegoAad(data.conv_id));
  const jsonBuf = Buffer.from(JSON.stringify(data), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(jsonBuf), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([nonce, ciphertext, authTag]);
}

function decryptStegoPayload(payloadBuf: Buffer, convId: number, kStego: Buffer): StegoPayloadData {
  if (payloadBuf.length < 12 + 16) {
    throw new AppError(ErrorCodes.ERR_STEGO_NO_PAYLOAD, 'Payload steganografi terlalu pendek', 400);
  }
  const nonce = payloadBuf.subarray(0, 12);
  const authTag = payloadBuf.subarray(payloadBuf.length - 16);
  const ciphertext = payloadBuf.subarray(12, payloadBuf.length - 16);

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', kStego, nonce);
    decipher.setAAD(stegoAad(convId));
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString('utf8')) as StegoPayloadData;
    if (parsed.conv_id !== convId) {
      throw new AppError(
        ErrorCodes.ERR_INTEGRITY_FAILED,
        `Integritas gagal: conv_id (${parsed.conv_id}) tidak cocok dengan percakapan (${convId})`,
        400
      );
    }
    return parsed;
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      ErrorCodes.ERR_DECRYPT_FAILED,
      'Dekripsi steganografi gagal: AuthTag tidak valid atau kunci percakapan tidak cocok',
      403
    );
  }
}

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

  /**
   * Ref: FR-IMG-04 — Kapasitas payload dalam byte
   */
  static getCapacity(width: number, height: number): number {
    return getStegoCapacity(width, height);
  }

  /**
   * Ref: FR-IMG-01..04, FR-AUTH-08 — Daftar foto dokumen steganografi per percakapan (wajib peserta)
   */
  static listImagesFor(session: Session, convIdRaw: unknown) {
    const convId = asId(convIdRaw, 'convId');
    ChatService.requireParticipant(session, convId);

    const rows = db
      .prepare('SELECT * FROM StegoImage WHERE convId = ? ORDER BY id DESC')
      .all(convId) as Array<{
      id: number;
      convId: number;
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
        convId: r.convId,
        title: r.title,
        storedPngName: r.storedPngName,
        width: r.width,
        height: r.height,
        maxCapacityBytes: getStegoCapacity(r.width, r.height),
        embeddedBitsCount: r.embeddedBitsCount,
        psnrDb: r.psnrDb,
        mse: r.mse,
        uploader: decryptDatabaseColumn(r.uploaderEncrypted),
        imageDataUrl,
        createdAt: r.createdAt,
      };
    });
  }

  /**
   * Ref: FR-IMG-01, 02, 04, FR-AUTH-08:
   * Menyisipkan catatan dan metadata ke dalam citra PNG menggunakan LSB.
   * Payload dienkripsi dengan AES-256-GCM menggunakan subkey k_stego yang diturunkan dari K_conv.
   * AAD mengikat ciphertext ke convId percakapan.
   */
  static embedForSession(
    session: Session,
    params: {
      convId: unknown;
      title?: unknown;
      note: unknown;
      coverPngBase64?: unknown;
    }
  ) {
    const convId = asId(params.convId, 'convId');
    const conv = ChatService.requireParticipant(session, convId);
    const subkeys = ChatService.subkeysFor(session, conv);

    const note = String(params.note ?? '').trim();
    if (!note) {
      throw new AppError(
        ErrorCodes.ERR_AUTH_INVALID,
        'Catatan rahasia yang ingin disembunyikan wajib diisi',
        400
      );
    }

    const title = (String(params.title ?? '').trim() || 'Foto Bukti Bimbingan').slice(0, 150);

    let coverBuffer: Buffer;
    if (params.coverPngBase64) {
      const b64 = String(params.coverPngBase64);
      const clean = b64.includes(',') ? b64.split(',')[1] : b64;
      coverBuffer = Buffer.from(clean, 'base64');
    } else {
      coverBuffer = generateSampleCoverPng(320, 240);
    }

    const coverSha256 = crypto.createHash('sha256').update(coverBuffer).digest('hex');
    const nowIso = new Date().toISOString();

    const payloadData: StegoPayloadData = {
      v: 1,
      conv_id: convId,
      sender_id: session.userId,
      sender_username: session.username,
      sent_at: nowIso,
      note,
      cover_sha256: coverSha256,
    };

    const encryptedPayload = encryptStegoPayload(payloadData, subkeys.k_stego);
    const embedResult = embedPayloadInPngLsb(coverBuffer, encryptedPayload);

    const storedPngName = `stego_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.png`;
    const storedPath = path.join(UPLOADS_DIR, storedPngName);
    fs.writeFileSync(storedPath, embedResult.stegoPngBuffer);

    let imageId: number;
    try {
      const info = db
        .prepare(`
          INSERT INTO StegoImage (
            convId, title, storedPngName, width, height, embeddedBitsCount,
            psnrDb, mse, uploaderEncrypted, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          convId,
          title,
          storedPngName,
          embedResult.width,
          embedResult.height,
          embedResult.embeddedBitsCount,
          embedResult.psnrDb,
          embedResult.mse,
          encryptDatabaseColumn(session.username),
          nowIso
        );
      imageId = Number(info.lastInsertRowid);
    } catch (err) {
      fs.rmSync(storedPath, { force: true });
      throw err;
    }

    AuditService.log({
      actorId: session.username,
      action: 'STEGO_EMBED',
      targetType: 'IMAGE',
      targetId: imageId,
      result: 'SUCCESS',
      detail: `${title} (${embedResult.width}x${embedResult.height} px, PSNR: ${embedResult.psnrDb} dB, MSE: ${embedResult.mse})`,
    });

    try {
      appendNewBlockchainRecord({
        actionType: 'STEGO_PHOTO',
        actor: session.username,
        assetTitle: title,
        assetData: embedResult.stegoPngBuffer,
      });
    } catch {
      /* best effort */
    }

    // Rekam pesan tipe IMAGE ke Ruang Bimbingan agar konsisten di kedua menu
    try {
      db.prepare(`
        INSERT INTO SecretMessage (
          convId, title, senderEncrypted, mode,
          stage1VigenerePreview, stage2VernamHex, superCiphertextPayload,
          msgType, refId, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'IMAGE', ?, ?)
      `).run(
        convId,
        title,
        encryptDatabaseColumn(session.username),
        'STEGO_LSB',
        `[Foto Dokumen LSB: ${embedResult.width}x${embedResult.height}]`,
        '',
        storedPngName,
        String(imageId),
        nowIso
      );
    } catch {
      /* best effort */
    }

    return {
      id: imageId,
      convId,
      title,
      storedPngName,
      width: embedResult.width,
      height: embedResult.height,
      maxCapacityBytes: embedResult.maxCapacityBytes,
      embeddedBitsCount: embedResult.embeddedBitsCount,
      modifiedPixelsCount: embedResult.modifiedPixelsCount,
      mse: embedResult.mse,
      psnrDb: embedResult.psnrDb,
      coverSha256,
      coverDataUrl: `data:image/png;base64,${coverBuffer.toString('base64')}`,
      stegoDataUrl: `data:image/png;base64,${embedResult.stegoPngBuffer.toString('base64')}`,
      createdAt: nowIso,
    };
  }

  /**
   * Ref: FR-IMG-03, FR-AUTH-08:
   * Mengekstrak payload dari LSB PNG dan mendekripsi dengan subkey k_stego sesi peserta.
   * Memvalidasi AuthTag GCM dan integritas convId.
   */
  static extractForSession(
    session: Session,
    params: {
      id?: unknown;
      convId?: unknown;
      stegoPngBase64?: unknown;
    }
  ) {
    let pngBuffer: Buffer;
    let targetConvId: number;
    let rowRecord: any = null;

    if (params.id) {
      const id = asId(params.id, 'id');
      const row = db
        .prepare('SELECT * FROM StegoImage WHERE id = ?')
        .get(id) as any;

      if (!row) {
        throw new AppError(ErrorCodes.ERR_AUTH_INVALID, 'Data gambar steganografi tidak ditemukan', 404);
      }
      rowRecord = row;
      targetConvId = row.convId;

      const filePath = path.join(UPLOADS_DIR, row.storedPngName);
      if (!fs.existsSync(filePath)) {
        throw new AppError(ErrorCodes.ERR_AUTH_INVALID, 'File PNG steganografi tidak ditemukan di disk', 404);
      }
      pngBuffer = fs.readFileSync(filePath);
    } else if (params.stegoPngBase64 && params.convId) {
      targetConvId = asId(params.convId, 'convId');
      const clean = String(params.stegoPngBase64).includes(',')
        ? String(params.stegoPngBase64).split(',')[1]
        : String(params.stegoPngBase64);
      pngBuffer = Buffer.from(clean, 'base64');
    } else {
      throw new AppError(
        ErrorCodes.ERR_AUTH_INVALID,
        'ID gambar atau file stego PNG beserta convId wajib diberikan',
        400
      );
    }

    const conv = ChatService.requireParticipant(session, targetConvId);
    const subkeys = ChatService.subkeysFor(session, conv);

    const extracted = extractPayloadFromPngLsb(pngBuffer);
    const payload = decryptStegoPayload(extracted.payloadBuffer, targetConvId, subkeys.k_stego);

    AuditService.log({
      actorId: session.username,
      action: 'STEGO_EXTRACT',
      targetType: 'IMAGE',
      targetId: rowRecord ? rowRecord.id : targetConvId,
      result: 'SUCCESS',
      detail: `Ekstraksi catatan steganografi terverifikasi: "${payload.note.slice(0, 40)}"`,
    });

    return {
      success: true,
      id: rowRecord ? rowRecord.id : undefined,
      convId: targetConvId,
      title: rowRecord ? rowRecord.title : 'Foto Dokumen',
      note: payload.note,
      senderId: payload.sender_id,
      senderUsername: payload.sender_username,
      sentAt: payload.sent_at,
      coverSha256: payload.cover_sha256,
      width: extracted.width,
      height: extracted.height,
      psnrDb: rowRecord ? rowRecord.psnrDb : undefined,
      mse: rowRecord ? rowRecord.mse : undefined,
      verified: true,
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
        sqliteFilePath: DB_PATH,
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

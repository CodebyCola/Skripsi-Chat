/**
 * ============================================================================
 * MODUL CHAIN: PENERBITAN ASET AKADEMIK & VERIFIKASI (FR-CHAIN-01 s.d. 08)
 * ============================================================================
 * Kriteria Tugas Akhir #7:
 * Aset penting (Nilai, Sertifikat, Ijazah, ACC Sidang) diamankan dengan blockchain:
 * - SHA-256 Hash Linking & Canonical JSON
 * - Proof of Work (PoW) Difficulty = 4
 * - Tanda Tangan Digital RSA-PSS (SHA-256) oleh Dosen Penerbit
 */

import crypto from 'node:crypto';
import { db } from '../database/connection.ts';
import {
  canonicalJson,
  signData,
  validateBlockchain,
  verifyDataSignature,
  type BlockRecord,
} from '../crypto/4_blockchain.ts';
import { decryptDatabaseColumn } from '../crypto/3_dbEncryption.ts';
import type { Session } from './session.service.ts';
import { KeysService } from './keys.service.ts';
import { AuditService } from './audit.service.ts';
import { CHAIN_DIFFICULTY, MAX_FILE_MB } from '../config/index.ts';
import { AppError, ErrorCodes } from '../config/errors.ts';

export type AcademicAssetType = 'GRADE' | 'CERTIFICATE' | 'DIPLOMA' | 'THESIS_ACC' | 'DRAFT_SUBMISSION';

export interface IssueAssetParams {
  assetType: AcademicAssetType;
  studentId: string;
  issuerId: string;
  issuerPrivateKeyPem?: string;
  documentBuffer: Buffer;
  title: string;
  meta?: Record<string, any>;
}

export interface VerificationResult {
  status: 'AUTHENTIC' | 'NOT_FOUND' | 'CHAIN_COMPROMISED';
  message: string;
  blockIndex?: number;
  assetType?: string;
  title?: string;
  studentId?: string;
  studentName?: string;
  issuerId?: string;
  issuerName?: string;
  docHash?: string;
  issuedAt?: string;
  signatureValid?: boolean;
}

/** Aset yang boleh diterbitkan dosen (FR-CHAIN-02); DRAFT_SUBMISSION dicatat oleh mahasiswa. */
const ISSUABLE_TYPES = ['GRADE', 'CERTIFICATE', 'DIPLOMA', 'THESIS_ACC'] as const;
const MAX_TITLE_CHARS = 200;

export class ChainService {
  /**
   * FR-CHAIN-02 & 03: Dosen menerbitkan aset akademik ke Blockchain dengan Tanda Tangan RSA-PSS & PoW
   */
  static issueAsset(params: IssueAssetParams) {
    const docHash = crypto.createHash('sha256').update(params.documentBuffer).digest('hex');

    // 1. Cek duplikasi di database indeks AcademicAsset
    const existing = db
      .prepare('SELECT * FROM AcademicAsset WHERE docHash = ? AND assetType = ?')
      .get(docHash, params.assetType) as any;

    if (existing) {
      const block = db
        .prepare('SELECT signature FROM BlockchainLedger WHERE "index" = ?')
        .get(existing.blockIndex) as { signature?: string } | undefined;
      return {
        success: true,
        isDuplicate: true,
        blockIndex: existing.blockIndex,
        signature: block?.signature || '',
        docHash,
        message: 'Aset akademik ini sudah pernah diterbitkan sebelumnya ke Blockchain',
      };
    }

    // 2. Susun Data Payload Kanonik
    const nowIso = new Date().toISOString();
    const dataPayload = {
      assetType: params.assetType,
      title: params.title,
      studentId: params.studentId,
      issuerId: params.issuerId,
      docHash,
      issuedAt: nowIso,
      meta: params.meta || {},
    };
    const canonicalPayloadString = canonicalJson(dataPayload);

    // 3. Tanda Tangani Payload dengan Private Key Dosen (RSA-PSS SHA-256)
    if (!params.issuerPrivateKeyPem) {
      throw new AppError(
        ErrorCodes.ERR_SIGNATURE_INVALID,
        'Private key penerbit diperlukan untuk menandatangani aset',
        400
      );
    }
    const signature = signData(canonicalPayloadString, params.issuerPrivateKeyPem);

    // 4. Mining Proof of Work (PoW) pada Block Baru
    const lastBlock = db
      .prepare('SELECT * FROM BlockchainLedger ORDER BY "index" DESC LIMIT 1')
      .get() as BlockRecord | undefined;

    const nextIndex = lastBlock ? lastBlock.index + 1 : 0;
    const previousHash = lastBlock ? lastBlock.hash : '0'.repeat(64);

    const powPrefix = '0'.repeat(CHAIN_DIFFICULTY);
    let nonce = 0;
    let blockHash = '';

    while (true) {
      const rawString = [
        nextIndex,
        nowIso,
        params.assetType,
        params.issuerId,
        params.title,
        docHash,
        previousHash,
        signature,
        nonce,
      ].join('|');

      blockHash = crypto.createHash('sha256').update(rawString, 'utf8').digest('hex');
      if (blockHash.startsWith(powPrefix)) {
        break;
      }
      nonce++;
    }

    // 5. Simpan Blok ke Rantai BlockchainLedger
    db.prepare(`
      INSERT INTO BlockchainLedger (
        "index", timestamp, actionType, actor, assetTitle, assetDataHash,
        previousHash, nonce, hash, signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nextIndex,
      nowIso,
      params.assetType,
      params.issuerId,
      params.title,
      docHash,
      previousHash,
      nonce,
      blockHash,
      signature
    );

    // 6. Simpan Indeks Cepat ke tabel AcademicAsset
    db.prepare(`
      INSERT INTO AcademicAsset (
        blockIndex, assetType, studentId, issuerId, docHash, title, issuedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      nextIndex,
      params.assetType,
      params.studentId,
      params.issuerId,
      docHash,
      params.title,
      nowIso
    );

    AuditService.log({
      actorId: params.issuerId,
      action: 'ISSUE_ASSET',
      targetType: 'BLOCKCHAIN_BLOCK',
      targetId: nextIndex,
      result: 'SUCCESS',
      detail: `${params.assetType} untuk Mahasiswa @${params.studentId}: ${params.title}`,
    });

    return {
      success: true,
      blockIndex: nextIndex,
      blockHash,
      nonce,
      docHash,
      signature,
    };
  }

  /**
   * FR-CHAIN-05: Verifikasi Keaslian Dokumen Terhadap Rantai Bukti Blockchain
   */
  static verifyDocument(documentBuffer: Buffer): VerificationResult {
    const docHash = crypto.createHash('sha256').update(documentBuffer).digest('hex');

    // 1. Cari aset di database
    const asset = db
      .prepare('SELECT * FROM AcademicAsset WHERE docHash = ?')
      .get(docHash) as any;

    if (!asset) {
      return {
        status: 'NOT_FOUND',
        message: 'TIDAK COCOK: Dokumen ini tidak terdaftar dalam catatan Blockchain SkripsiChat.',
        docHash,
      };
    }

    // 2. Validasi keutuhan rantai blok
    const validation = this.validateChain();
    if (!validation.isValid) {
      return {
        status: 'CHAIN_COMPROMISED',
        message: `PERINGATAN: Integritas Blockchain terdeteksi RUSAK atau dimanipulasi pada Blok #${validation.corruptedIndex}!`,
        blockIndex: asset.blockIndex,
        docHash,
      };
    }

    // 3. Verifikasi tanda tangan digital penerbit
    const block = db
      .prepare('SELECT * FROM BlockchainLedger WHERE "index" = ?')
      .get(asset.blockIndex) as any;

    let signatureValid = true;
    const issuer = db
      .prepare('SELECT publicKey FROM User WHERE username = ?')
      .get(asset.issuerId) as any;

    if (issuer && issuer.publicKey && block?.signature) {
      // Data kanonik yang diverifikasi
      const dataPayload = {
        assetType: asset.assetType,
        title: asset.title,
        studentId: asset.studentId,
        issuerId: asset.issuerId,
        docHash: asset.docHash,
        issuedAt: asset.issuedAt,
        meta: {},
      };
      signatureValid = verifyDataSignature(
        canonicalJson(dataPayload),
        block.signature,
        issuer.publicKey
      );
    }

    const nameOf = (username: string): string | undefined => {
      const u = db.prepare('SELECT fullNameEncrypted FROM User WHERE username = ?').get(username) as
        | { fullNameEncrypted?: string }
        | undefined;
      return u?.fullNameEncrypted ? decryptDatabaseColumn(u.fullNameEncrypted) : undefined;
    };

    return {
      status: 'AUTHENTIC',
      message: 'ASLI: Dokumen terverifikasi sah dan tercatat pada Blockchain Ledger.',
      blockIndex: asset.blockIndex,
      assetType: asset.assetType,
      title: asset.title,
      studentId: asset.studentId,
      studentName: nameOf(asset.studentId),
      issuerId: asset.issuerId,
      issuerName: nameOf(asset.issuerId),
      docHash: asset.docHash,
      issuedAt: asset.issuedAt,
      signatureValid,
    };
  }

  /**
   * FR-CHAIN-04: Validasi Seluruh Rantai Blok (hash dihitung ulang, PoW, tautan previousHash).
   * Tanda tangan penerbit dilaporkan per dokumen lewat `signatureValid` pada verifyDocument.
   */
  static validateChain(): {
    isValid: boolean;
    totalBlocks: number;
    corruptedIndex: number | null;
    reason?: string;
  } {
    const blocks = db
      .prepare('SELECT * FROM BlockchainLedger ORDER BY "index" ASC')
      .all() as unknown as BlockRecord[];
    const result = validateBlockchain(blocks);
    const bad = result.details.find((d) => !d.isValid);
    return {
      isValid: result.isChainValid,
      totalBlocks: result.totalBlocks,
      corruptedIndex: result.firstCorruptedIndex,
      reason: bad?.errorReason,
    };
  }

  /**
   * FR-CHAIN-06: Mengambil aset milik seorang mahasiswa
   */
  static getStudentAssets(studentId: string) {
    return db
      .prepare('SELECT * FROM AcademicAsset WHERE studentId = ? ORDER BY id DESC')
      .all(studentId);
  }

  /**
   * Mengambil aset yang diterbitkan oleh seorang dosen
   */
  static listAssetsByIssuer(issuerId: string) {
    return db
      .prepare('SELECT * FROM AcademicAsset WHERE issuerId = ? ORDER BY id DESC')
      .all(issuerId);
  }

  // ==========================================================================
  // LAPISAN BERBASIS SESI (FR-AUTH-08) — identitas & kunci dari sesi, bukan dari body
  // ==========================================================================

  /** Dekode dokumen base64 / data URL; menolak kosong atau melebihi MAX_FILE_MB */
  static decodeDocument(raw: unknown): Buffer {
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new AppError(ErrorCodes.ERR_AUTH_INVALID, 'Dokumen wajib diunggah', 400);
    }
    const buf = Buffer.from(raw.includes(',') ? raw.split(',')[1] : raw, 'base64');
    if (buf.length === 0) {
      throw new AppError(ErrorCodes.ERR_AUTH_INVALID, 'Dokumen kosong', 400);
    }
    if (buf.length > MAX_FILE_MB * 1024 * 1024) {
      throw new AppError(
        ErrorCodes.ERR_FILE_TOO_LARGE,
        `Ukuran dokumen melebihi batas ${MAX_FILE_MB} MB`,
        400
      );
    }
    return buf;
  }

  private static withNames(rows: any[]) {
    return rows.map(({ studentNameEnc, issuerNameEnc, ...a }) => ({
      ...a,
      studentName: studentNameEnc ? decryptDatabaseColumn(studentNameEnc) : a.studentId,
      issuerName: issuerNameEnc ? decryptDatabaseColumn(issuerNameEnc) : a.issuerId,
    }));
  }

  private static isSupervisedBy(session: Session, studentUsername: string): boolean {
    const row = db
      .prepare(
        `SELECT c.id FROM Conversation c JOIN User s ON s.id = c.studentId
         WHERE s.username = ? AND c.lecturerId = ? AND c.isActive = 1`
      )
      .get(studentUsername, session.userId);
    return !!row;
  }

  /**
   * Ref: FR-CHAIN-02, 03, 08 — hanya dosen; mahasiswa harus bimbingan dosen tersebut;
   * penerbit & private key diambil dari sesi (tidak pernah dari body).
   */
  static issueAssetAs(
    session: Session,
    params: { assetType: unknown; studentId: unknown; title: unknown; documentBase64: unknown }
  ) {
    if (session.role !== 'DOSEN_PEMBIMBING') {
      throw new AppError(
        ErrorCodes.ERR_FORBIDDEN,
        'Hanya dosen pembimbing yang dapat menerbitkan aset akademik',
        403
      );
    }
    const assetType = String(params.assetType ?? '') as AcademicAssetType;
    if (!(ISSUABLE_TYPES as readonly string[]).includes(assetType)) {
      throw new AppError(ErrorCodes.ERR_AUTH_INVALID, 'Tipe aset tidak valid', 400);
    }
    const title = String(params.title ?? '').trim();
    if (!title || title.length > MAX_TITLE_CHARS) {
      throw new AppError(
        ErrorCodes.ERR_AUTH_INVALID,
        `Judul wajib diisi (maks. ${MAX_TITLE_CHARS} karakter)`,
        400
      );
    }
    const studentUsername = String(params.studentId ?? '');
    const student = db
      .prepare("SELECT username FROM User WHERE username = ? AND role = 'MAHASISWA' AND isActive = 1")
      .get(studentUsername) as { username: string } | undefined;
    if (!student || !ChainService.isSupervisedBy(session, student.username)) {
      throw new AppError(
        ErrorCodes.ERR_NOT_PARTICIPANT,
        'Mahasiswa tidak ditemukan atau bukan bimbingan Anda',
        403
      );
    }
    const documentBuffer = ChainService.decodeDocument(params.documentBase64);
    if (!session.privateKeyPem) {
      throw new AppError(
        ErrorCodes.ERR_KEY_UNLOCK_FAILED,
        'Akun ini belum memiliki keypair. Minta admin melakukan provisioning akun.',
        409
      );
    }
    return ChainService.issueAsset({
      assetType,
      studentId: student.username,
      issuerId: session.username,
      issuerPrivateKeyPem: session.privateKeyPem,
      documentBuffer,
      title,
    });
  }

  /** Ref: FR-CHAIN-05 — semua peran yang login boleh memverifikasi dokumen */
  static verifyDocumentFor(_session: Session, documentBase64: unknown): VerificationResult {
    return ChainService.verifyDocument(ChainService.decodeDocument(documentBase64));
  }

  /**
   * Ref: FR-CHAIN-06 — mahasiswa hanya miliknya sendiri; dosen hanya mahasiswa bimbingannya;
   * admin ditolak.
   */
  static getStudentAssetsFor(session: Session, studentId?: string) {
    let target: string;
    if (session.role === 'MAHASISWA') {
      target = session.username;
    } else if (session.role === 'DOSEN_PEMBIMBING') {
      target = String(studentId ?? '');
      if (!target || !ChainService.isSupervisedBy(session, target)) {
        throw new AppError(
          ErrorCodes.ERR_NOT_PARTICIPANT,
          'Mahasiswa tidak ditemukan atau bukan bimbingan Anda',
          403
        );
      }
    } else {
      throw new AppError(ErrorCodes.ERR_FORBIDDEN, 'Peran Anda tidak memiliki akses ke aset mahasiswa', 403);
    }
    const rows = db
      .prepare(
        `SELECT a.*, s.fullNameEncrypted AS studentNameEnc, i.fullNameEncrypted AS issuerNameEnc
         FROM AcademicAsset a
         LEFT JOIN User s ON s.username = a.studentId
         LEFT JOIN User i ON i.username = a.issuerId
         WHERE a.studentId = ? ORDER BY a.id DESC`
      )
      .all(target);
    return ChainService.withNames(rows);
  }

  /** Ref: UA-DSN-09 — riwayat penerbitan milik dosen pemilik sesi */
  static listAssetsByIssuerFor(session: Session) {
    if (session.role !== 'DOSEN_PEMBIMBING') {
      throw new AppError(
        ErrorCodes.ERR_FORBIDDEN,
        'Hanya dosen pembimbing yang memiliki riwayat penerbitan',
        403
      );
    }
    const rows = db
      .prepare(
        `SELECT a.*, s.fullNameEncrypted AS studentNameEnc, i.fullNameEncrypted AS issuerNameEnc
         FROM AcademicAsset a
         LEFT JOIN User s ON s.username = a.studentId
         LEFT JOIN User i ON i.username = a.issuerId
         WHERE a.issuerId = ? ORDER BY a.id DESC`
      )
      .all(session.username);
    return ChainService.withNames(rows);
  }
}
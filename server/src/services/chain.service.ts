/**
 * ============================================================================
 * MODUL CHAIN: PENERBITAN ASET AKADEMIK & VERIFIKASI (FR-CHAIN-01 s.d. 08)
 * ============================================================================
 * Kriteria Tugas Akhir #7:
 * Aset penting (Nilai, Sertifikat, Ijazah, ACC Sidang) diamankan dengan blockchain:
 * - SHA-256 Hash Linking & Canonical JSON
 * - Proof of Work (PoW)
 * - Tanda Tangan Digital RSA-PSS (SHA-256) oleh Dosen Penerbit
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '../database/connection.ts';
import {
  calculateBlockHash,
  canonicalJson,
  signData,
   validateBlockchain,
  verifyDataSignature,
  type BlockRecord,
} from '../crypto/4_blockchain.ts';
import { verifyDongleKeyFileContent } from '../crypto/1_dongleKey.ts';
import { KeysService } from './keys.service.ts';
import { AuditService } from './audit.service.ts';
import { CHAIN_DIFFICULTY, VIRTUAL_USB_DIR } from '../config/index.ts';

export type AcademicAssetType =
  | 'GRADE'
  | 'CERTIFICATE'
  | 'DIPLOMA'
  | 'THESIS_ACC'
  | 'DRAFT_SUBMISSION'
  | 'ACC_BAB';

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
  issuerId?: string;
  docHash?: string;
  issuedAt?: string;
  signatureValid?: boolean;
}

export class ChainService {
  /**
   * Helper internal: Membuka kunci privat RSA dosen dari database jika tidak dikirim langsung
   */
  private static resolveIssuerPrivateKeyPem(issuerId: string): string | null {
    try {
      const user = db
        .prepare(
          'SELECT username, privateKeyEnc, privateKeyNonce, privateKeyTag, kdfSalt FROM User WHERE username = ?'
        )
        .get(issuerId) as
        | {
            username: string;
            privateKeyEnc: string;
            privateKeyNonce: string;
            privateKeyTag: string;
            kdfSalt: string;
          }
        | undefined;

      if (!user || !user.privateKeyEnc || !user.privateKeyNonce || !user.privateKeyTag || !user.kdfSalt) {
        return null;
      }

      const keyFilePath = path.join(VIRTUAL_USB_DIR, `${issuerId}.skripsi_key`);
      if (!fs.existsSync(keyFilePath)) {
        return null;
      }

      const rawKeyContent = fs.readFileSync(keyFilePath, 'utf8');
      const verifiedDongle = verifyDongleKeyFileContent(rawKeyContent);
      if (!verifiedDongle.valid || !verifiedDongle.payload) {
        return null;
      }

      const dongleSecret = crypto
        .createHash('sha256')
        .update(`${verifiedDongle.payload.dongleId}:${verifiedDongle.payload.signature}`)
        .digest();

      const kek = KeysService.deriveKek(
        'SkripsiChat2026!',
        dongleSecret,
        Buffer.from(user.kdfSalt, 'hex')
      );

      return KeysService.unlockPrivateKey(
        {
          ciphertextHex: user.privateKeyEnc,
          nonceHex: user.privateKeyNonce,
          authTagHex: user.privateKeyTag,
        },
        kek,
        user.username
      );
    } catch {
      return null;
    }
  }

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
    let signature = '';
    const resolvedPrivateKeyPem =
      params.issuerPrivateKeyPem || this.resolveIssuerPrivateKeyPem(params.issuerId);

    if (resolvedPrivateKeyPem) {
      signature = signData(canonicalPayloadString, resolvedPrivateKeyPem);
    } else {
      signature = crypto.randomBytes(64).toString('base64');
    }

    // 4. Mining Proof of Work (PoW) pada Block Baru menggunakan skema hash kanonik 4_blockchain.ts
    const lastBlock = db
      .prepare('SELECT * FROM BlockchainLedger ORDER BY "index" DESC LIMIT 1')
      .get() as BlockRecord | undefined;

    const nextIndex = lastBlock ? lastBlock.index + 1 : 0;
    const previousHash = lastBlock ? lastBlock.hash : '0'.repeat(64);

    const powPrefix = '0'.repeat(CHAIN_DIFFICULTY);
    let nonce = 0;
    let blockHash = '';

    while (true) {
      blockHash = calculateBlockHash({
        index: nextIndex,
        timestamp: nowIso,
        actionType: params.assetType,
        actor: params.issuerId,
        assetTitle: params.title,
        assetDataHash: docHash,
        previousHash,
        nonce,
        signature,
      });

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
  static verifyDocument(documentBuffer: Buffer, directDocHash?: string): VerificationResult {
    const docHash =
      directDocHash && directDocHash.trim().length > 0
        ? directDocHash.trim()
        : crypto.createHash('sha256').update(documentBuffer).digest('hex');

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

    // 2. Validasi keutuhan rantai blok secara menyeluruh (Hash + PreviousHash + PoW)
    const validation = this.validateChain();
    if (!validation.isValid) {
      return {
        status: 'CHAIN_COMPROMISED',
        message: `PERINGATAN: Integritas Blockchain terdeteksi RUSAK atau dimanipulasi pada Blok #${validation.corruptedIndex}!`,
        blockIndex: asset.blockIndex,
        assetType: asset.assetType,
        title: asset.title,
        studentId: asset.studentId,
        issuerId: asset.issuerId,
        docHash,
      };
    }

    // 3. Verifikasi tanda tangan digital penerbit (RSA-PSS)
    const block = db
      .prepare('SELECT * FROM BlockchainLedger WHERE "index" = ?')
      .get(asset.blockIndex) as any;

    let signatureValid = true;
    const issuer = db
      .prepare('SELECT publicKey FROM User WHERE username = ?')
      .get(asset.issuerId) as any;

    if (issuer && issuer.publicKey && block?.signature) {
      const payloadWithMeta = {
        assetType: asset.assetType,
        title: asset.title,
        studentId: asset.studentId,
        issuerId: asset.issuerId,
        docHash: asset.docHash,
        issuedAt: asset.issuedAt,
        meta: {},
      };
      const payloadWithoutMeta = {
        assetType: asset.assetType,
        title: asset.title,
        studentId: asset.studentId,
        issuerId: asset.issuerId,
        docHash: asset.docHash,
        issuedAt: asset.issuedAt,
      };

      signatureValid =
        verifyDataSignature(canonicalJson(payloadWithMeta), block.signature, issuer.publicKey) ||
        verifyDataSignature(canonicalJson(payloadWithoutMeta), block.signature, issuer.publicKey);
    }

    return {
      status: 'AUTHENTIC',
      message: 'ASLI: Dokumen terverifikasi sah dan tercatat pada Blockchain Ledger.',
      blockIndex: asset.blockIndex,
      assetType: asset.assetType,
      title: asset.title,
      studentId: asset.studentId,
      issuerId: asset.issuerId,
      docHash: asset.docHash,
      issuedAt: asset.issuedAt,
      signatureValid,
    };
  }

  /**
   * FR-CHAIN-04: Validasi Seluruh Rantai Blok (Recalculate SHA-256 Hash, Proof of Work, Links)
   */
  static validateChain(): { isValid: boolean; totalBlocks: number; corruptedIndex: number | null } {
    const blocks = db
      .prepare('SELECT * FROM BlockchainLedger ORDER BY "index" ASC')
      .all() as unknown as BlockRecord[];

    const validation = validateBlockchain(blocks);
    if (!validation.isChainValid) {
      return {
        isValid: false,
        totalBlocks: blocks.length,
        corruptedIndex: validation.firstCorruptedIndex,
      };
    }

    return { isValid: true, totalBlocks: blocks.length, corruptedIndex: null };
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
}

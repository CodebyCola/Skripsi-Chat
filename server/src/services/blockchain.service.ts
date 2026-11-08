import { db, appendNewBlockchainRecord } from '../database/connection.ts';
import {
  validateBlockchain,
  createMinedBlock,
  type BlockRecord,
} from '../crypto/4_blockchain.ts';
import { DEMO_MODE } from '../config/index.ts';
import { AppError, ErrorCodes } from '../config/errors.ts';
import { AuditService } from './audit.service.ts';
import type { Session } from './session.service.ts';

export class BlockchainService {
  static getBlockchain() {
    const blocks = db
      .prepare('SELECT * FROM BlockchainLedger ORDER BY "index" ASC')
      .all() as unknown as BlockRecord[];

    const validation = validateBlockchain(blocks);

    return {
      blocks,
      validation,
    };
  }

  static tamperBlockSimulation(body: { index?: number; fakeTitle?: string }) {
    const targetIndex =
      typeof body.index === 'number' && body.index > 0 ? body.index : 1;
    const fakeTitle =
      body.fakeTitle ||
      `[DATA PALSU HASIL MANIPULASI HACKER @ ${new Date().toLocaleTimeString()}]`;

    const row = db
      .prepare('SELECT * FROM BlockchainLedger WHERE "index" = ?')
      .get(targetIndex) as BlockRecord | undefined;

    if (!row) {
      throw new Error(`Blok #${targetIndex} tidak ditemukan`);
    }

    db.prepare('UPDATE BlockchainLedger SET assetTitle = ? WHERE "index" = ?').run(
      fakeTitle,
      targetIndex
    );

    return this.getBlockchain();
  }

  static restoreBlockchainIntegrity() {
    const blocks = db
      .prepare('SELECT * FROM BlockchainLedger ORDER BY "index" ASC')
      .all() as unknown as BlockRecord[];

    for (let i = 0; i < blocks.length; i++) {
      const prevHash = i === 0 ? '0'.repeat(64) : blocks[i - 1].hash;
      // Judul asli aset akademik dipulihkan dari indeks AcademicAsset bila ada
      const asset = db
        .prepare('SELECT title FROM AcademicAsset WHERE blockIndex = ?')
        .get(blocks[i].index) as { title?: string } | undefined;
      const cleanTitle = blocks[i].assetTitle.startsWith('[DATA PALSU')
        ? asset?.title || `Data Bukti Dipulihkan pada Blok #${blocks[i].index}`
        : blocks[i].assetTitle;

      const remined = createMinedBlock({
        index: blocks[i].index,
        timestamp: blocks[i].timestamp,
        actionType: blocks[i].actionType,
        actor: blocks[i].actor,
        assetTitle: cleanTitle,
        assetDataHash: blocks[i].assetDataHash,
        previousHash: prevHash,
        signature: blocks[i].signature,
      });

      blocks[i] = remined;
      db.prepare(`
        UPDATE BlockchainLedger
        SET assetTitle = ?, previousHash = ?, nonce = ?, hash = ?
        WHERE "index" = ?
      `).run(
        remined.assetTitle,
        remined.previousHash,
        remined.nonce,
        remined.hash,
        remined.index
      );
    }

    return this.getBlockchain();
  }

  static appendRecord(params: {
    actionType: string;
    actor: string;
    assetTitle: string;
    assetData: string | Buffer;
  }) {
    return appendNewBlockchainRecord(params);
  }

  /** Ref: FR-CHAIN-07 — tamper/restore hanya untuk admin dan hanya saat DEMO_MODE */
  private static requireDemoAdmin(session: Session) {
    if (session.role !== 'ADMIN') {
      throw new AppError(ErrorCodes.ERR_FORBIDDEN, 'Hanya admin yang dapat menjalankan mode demo', 403);
    }
    if (!DEMO_MODE) {
      throw new AppError(ErrorCodes.ERR_FORBIDDEN, 'Mode demo dinonaktifkan', 403);
    }
  }

  static tamperBlockSimulationAs(session: Session, body: { index?: unknown }) {
    BlockchainService.requireDemoAdmin(session);
    const index = Number(body.index);
    if (!Number.isInteger(index) || index < 1) {
      throw new AppError(ErrorCodes.ERR_AUTH_INVALID, 'Indeks blok tidak valid (minimal 1)', 400);
    }
    const exists = db.prepare('SELECT 1 FROM BlockchainLedger WHERE "index" = ?').get(index);
    if (!exists) {
      throw new AppError(ErrorCodes.ERR_CHAIN_INVALID, `Blok #${index} tidak ditemukan`, 404);
    }
    const result = BlockchainService.tamperBlockSimulation({ index });
    AuditService.log({
      actorId: session.username,
      action: 'TAMPER_DEMO',
      targetType: 'BLOCKCHAIN_BLOCK',
      targetId: index,
      result: 'SUCCESS',
    });
    return result;
  }

  static restoreBlockchainIntegrityAs(session: Session) {
    BlockchainService.requireDemoAdmin(session);
    const result = BlockchainService.restoreBlockchainIntegrity();
    AuditService.log({
      actorId: session.username,
      action: 'RESTORE_DEMO',
      targetType: 'BLOCKCHAIN',
      targetId: 'ALL',
      result: 'SUCCESS',
    });
    return result;
  }
}
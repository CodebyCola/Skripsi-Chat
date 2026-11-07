import { db, appendNewBlockchainRecord } from '../database/connection.ts';
import {
  validateBlockchain,
  createMinedBlock,
  type BlockRecord,
} from '../crypto/4_blockchain.ts';

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
      const cleanTitle = blocks[i].assetTitle.startsWith('[DATA PALSU')
        ? `Data Bukti Dipulihkan pada Blok #${blocks[i].index}`
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
}

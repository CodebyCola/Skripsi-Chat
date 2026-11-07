import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

import { PRISMA_DIR, UPLOADS_DIR, VIRTUAL_USB_DIR, DB_PATH } from '../config/index.ts';
import { createTables } from './schema.ts';
import { seedInitialDemoData, appendNewBlockchainRecord as seederAppendBlockchain } from './seeder.ts';
import type { BlockRecord } from '../crypto/4_blockchain.ts';

// Pastikan seluruh direktori esensial siap digunakan
if (!fs.existsSync(PRISMA_DIR)) fs.mkdirSync(PRISMA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(VIRTUAL_USB_DIR)) fs.mkdirSync(VIRTUAL_USB_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);

export function initDatabase(): void {
  createTables(db);
  seedInitialDemoData(db);
}

export function appendNewBlockchainRecord(params: {
  actionType: string;
  actor: string;
  assetTitle: string;
  assetData: string | Buffer;
}): BlockRecord {
  return seederAppendBlockchain(db, params);
}

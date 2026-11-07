/**
 * ============================================================================
 * DATABASE ACCESS FACADE (Kompatibilitas Penuh dengan Kode Eksisting)
 * ============================================================================
 */

export {
  db,
  initDatabase,
  appendNewBlockchainRecord,
} from './database/connection.ts';

export {
  SERVER_ROOT,
  PRISMA_DIR,
  UPLOADS_DIR,
  VIRTUAL_USB_DIR,
  DB_PATH as DB_FILE_PATH,
} from './config/index.ts';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root direktori server (2 tingkat ke atas dari src/config)
export const SERVER_ROOT = path.resolve(__dirname, '..', '..');
export const SRC_DIR = path.resolve(__dirname, '..');

export const PORT = Number(process.env.PORT || 4000);

// Direktori Penyimpanan & Database
export const PRISMA_DIR = path.join(SERVER_ROOT, 'prisma');
export const DB_PATH = path.join(PRISMA_DIR, 'dev.db');
export const UPLOADS_DIR = path.join(SERVER_ROOT, 'uploads');
export const VIRTUAL_USB_DIR = path.join(SERVER_ROOT, 'virtual_usb_dongle');
export const UI_HTML_PATH = path.join(SRC_DIR, 'ui.html');

// Parameter Otentikasi & Kriptografi (Spesifikasi Bagian 6.1)
export const BIOMETRIC_THRESHOLD = 0.48; // Ambang batas jarak Euclidean (di bawah 0.48 = Wajah Cocok)
export const ARGON2_MEMORY_KIB = 65536;
export const ARGON2_TIME_COST = 3;
export const ARGON2_PARALLELISM = 1;
export const RSA_KEY_BITS = 2048;
export const AES_NONCE_BYTES = 12;
export const FILE_CHUNK_BYTES = 1048576; // 1 MiB per chunk streaming
export const MAX_FILE_MB = 25;
export const ALLOWED_FILE_EXT = ['pdf', 'docx'];
export const MAX_TEXT_CHARS = 4000;
export const LOCKOUT_MAX_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 5;
export const IDLE_LOCK_MINUTES = 15;
export const CHAIN_DIFFICULTY = 4; // Jumlah '0' di awal hash SHA-256 blok
export const DEMO_MODE = true;

// Master Key Database-at-rest (Pilar 3A & Vault)
export const MASTER_DB_KEY =
  process.env.SKRIPSICHAT_MASTER_DB_KEY ||
  process.env.AEGIS_DB_MASTER_KEY ||
  'SkripsiChat_Academic_Database_Master_Key_2026!';

export * from './errors.ts';

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Private-Network': 'true',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

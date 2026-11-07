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

// Parameter Otentikasi & Kriptografi
export const BIOMETRIC_THRESHOLD = 0.48; // Ambang batas jarak Euclidean (di bawah 0.48 = Wajah Cocok)

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Private-Network': 'true',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

/**
 * ============================================================================
 * SKRIPSICHAT SECURE BACKEND ENGINE
 * ============================================================================
 * Modular Entrypoint:
 * - Config: ./config/index.ts
 * - Database: ./database/connection.ts
 * - Middlewares: ./middlewares/
 * - Services: ./services/
 * - Controllers: ./controllers/
 * - Routes: ./routes/
 * - Crypto Pillars: ./crypto/
 */

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PORT } from './config/index.ts';
import { initDatabase } from './database/connection.ts';
import { handleCors } from './middlewares/cors.middleware.ts';
import { handleError } from './middlewares/error.middleware.ts';
import { routeRequest } from './routes/index.ts';

const __filename = fileURLToPath(import.meta.url);

// Inisialisasi Database SQLite & Skema
initDatabase();

export const server = http.createServer(async (req, res) => {
  // 1. Tangani Header CORS & Preflight OPTIONS
  if (handleCors(req, res)) return;

  try {
    const urlObj = new URL(req.url || '/', `http://localhost:${PORT}`);
    // 2. Dispatch Request ke Route Handler / Controller
    routeRequest(req, res, urlObj);
  } catch (err: any) {
    // 3. Centralized Global Error Handler
    handleError(res, err, 400);
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  server.listen(PORT, () => {
    console.log('====================================================================');
    console.log(`[SKRIPSICHAT] SECURE BACKEND ENGINE AKTIF DI : http://localhost:${PORT}`);
    console.log(`[SKRIPSICHAT] CLIENT PORTAL (NEXT.JS) DI     : http://localhost:3000`);
    console.log('====================================================================');
    console.log('Arsitektur   : Modular (Controllers, Services, Middlewares, Routes)');
    console.log('Akun Default : dosen_pembimbing (atau editor_aegis)');
    console.log('Password     : SkripsiChat2026! (atau Aegis2026!)');
    console.log('Buka http://localhost:4000 untuk Admin Console (Dongle & Wajah)');
    console.log('====================================================================');
  });
}

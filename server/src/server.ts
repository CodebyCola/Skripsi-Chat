/**
 * ============================================================================
 * AEGISVAULT BACKEND ENGINE (REST API + HARDWARE/BIOMETRIC ADMIN CONSOLE)
 * ============================================================================
 * Fokus Server (:4000):
 * 1. Melayani seluruh komputasi kriptografi & validasi untuk Client (:3000)
 * 2. Mengatur aktivasi Hardware USB Dongle (.aegis_key)
 * 3. Merekam & menyimpan referensi foto + vektor Biometrik Wajah terenkripsi
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initDatabase } from './db.ts';
import {
  handleGetDongleStatus,
  handleToggleVirtualDongle,
  handleProvisionUsbDongle,
  handleGetUsersForAdmin,
  handleEnrollUserFace,
  handleDeleteUserFace,
  handleDeleteUser,
  handleCheckClientAuthStatus,
  handleVerifyClientFace,
  handleRegisterUser,
  handleLoginUser,
} from './routes/auth.routes.ts';
import {
  handleGetMessages,
  handleCreateSuperEncryptedMessage,
  handleDecryptSuperMessage,
} from './routes/message.routes.ts';
import {
  handleGetEncryptedFiles,
  handleUploadAndEncryptFile,
  handleDecryptStoredFile,
} from './routes/file.routes.ts';
import {
  handleGetStegoImages,
  handleEmbedStegoImage,
  handleExtractStegoImage,
  handleGetDatabaseRawInspection,
} from './routes/stego.routes.ts';
import {
  handleGetBlockchain,
  handleTamperBlockSimulation,
  handleRestoreBlockchainIntegrity,
} from './routes/blockchain.routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 4000);

initDatabase();

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Private-Network': 'true',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

function readJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    ...CORS_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(payload));
}

export const server = http.createServer(async (req, res) => {
  const method = req.method || 'GET';
  const urlObj = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;

  if (method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  try {
    // 0. Server Hardware & Biometric Enrollment Console (:4000)
    if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      const htmlPath = path.join(__dirname, 'ui.html');
      const html = fs.readFileSync(htmlPath, 'utf8');
      res.writeHead(200, {
        ...CORS_HEADERS,
        'Content-Type': 'text/html; charset=utf-8',
      });
      res.end(html);
      return;
    }

    // 1. Endpoint Pilar 1: Hardware Dongle, Biometrik Wajah & Login
    if (method === 'GET' && pathname === '/api/auth/dongle/status') {
      return sendJson(res, 200, handleGetDongleStatus());
    }
    if (method === 'GET' && pathname === '/api/auth/check-status') {
      const username = urlObj.searchParams.get('username') || '';
      return sendJson(res, 200, handleCheckClientAuthStatus(username));
    }
    if (method === 'GET' && pathname === '/api/auth/users') {
      return sendJson(res, 200, handleGetUsersForAdmin());
    }
    if (method === 'POST' && pathname === '/api/auth/dongle/toggle-virtual') {
      const body = await readJsonBody(req);
      return sendJson(res, 200, handleToggleVirtualDongle(body.connect));
    }
    if (method === 'POST' && pathname === '/api/auth/dongle/provision') {
      const body = await readJsonBody(req);
      return sendJson(res, 200, handleProvisionUsbDongle(body));
    }
    if (method === 'POST' && pathname === '/api/auth/face/enroll') {
      const body = await readJsonBody(req);
      return sendJson(res, 200, handleEnrollUserFace(body));
    }
    if (method === 'POST' && pathname === '/api/auth/face/delete') {
      const body = await readJsonBody(req);
      return sendJson(res, 200, handleDeleteUserFace(body.username));
    }
    if (method === 'POST' && pathname === '/api/auth/users/delete') {
      const body = await readJsonBody(req);
      return sendJson(res, 200, handleDeleteUser(body.username));
    }
    if (method === 'POST' && pathname === '/api/auth/verify-face') {
      const body = await readJsonBody(req);
      return sendJson(res, 200, handleVerifyClientFace(body));
    }
    if (method === 'POST' && pathname === '/api/auth/register') {
      const body = await readJsonBody(req);
      return sendJson(res, 201, handleRegisterUser(body));
    }
    if (method === 'POST' && pathname === '/api/auth/login') {
      const body = await readJsonBody(req);
      return sendJson(res, 200, handleLoginUser(body));
    }

    // 2A. Endpoint Pilar 2A: Pesan Teks Super Enkripsi
    if (method === 'GET' && pathname === '/api/messages') {
      return sendJson(res, 200, handleGetMessages());
    }
    if (method === 'POST' && pathname === '/api/messages') {
      const body = await readJsonBody(req);
      return sendJson(res, 201, handleCreateSuperEncryptedMessage(body));
    }
    if (method === 'POST' && pathname === '/api/messages/decrypt') {
      const body = await readJsonBody(req);
      return sendJson(res, 200, handleDecryptSuperMessage(body));
    }

    // 2B. Endpoint Pilar 2B: Enkripsi File ChaCha20-Poly1305
    if (method === 'GET' && pathname === '/api/files') {
      return sendJson(res, 200, handleGetEncryptedFiles());
    }
    if (method === 'POST' && pathname === '/api/files/encrypt') {
      const body = await readJsonBody(req);
      return sendJson(res, 201, handleUploadAndEncryptFile(body));
    }
    if (method === 'POST' && pathname === '/api/files/decrypt') {
      const body = await readJsonBody(req);
      return sendJson(res, 200, handleDecryptStoredFile(body));
    }

    // 3. Endpoint Pilar 3: Steganografi LSB PNG & Database Raw Inspector
    if (method === 'GET' && pathname === '/api/stego') {
      return sendJson(res, 200, handleGetStegoImages());
    }
    if (method === 'POST' && pathname === '/api/stego/embed') {
      const body = await readJsonBody(req);
      return sendJson(res, 201, handleEmbedStegoImage(body));
    }
    if (method === 'POST' && pathname === '/api/stego/extract') {
      const body = await readJsonBody(req);
      return sendJson(res, 200, handleExtractStegoImage(body));
    }
    if (method === 'GET' && pathname === '/api/db-inspector') {
      return sendJson(res, 200, handleGetDatabaseRawInspection());
    }

    // 4. Endpoint Pilar 4: Blockchain Audit Ledger
    if (method === 'GET' && pathname === '/api/blockchain') {
      return sendJson(res, 200, handleGetBlockchain());
    }
    if (method === 'POST' && pathname === '/api/blockchain/tamper') {
      const body = await readJsonBody(req);
      return sendJson(res, 200, handleTamperBlockSimulation(body));
    }
    if (method === 'POST' && pathname === '/api/blockchain/restore') {
      return sendJson(res, 200, handleRestoreBlockchainIntegrity());
    }

    sendJson(res, 404, { error: `Endpoint ${method} ${pathname} tidak ditemukan` });
  } catch (err: any) {
    sendJson(res, 400, { error: err?.message || 'Permintaan gagal diproses' });
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  server.listen(PORT, () => {
    console.log('====================================================================');
    console.log(`🖥️  AEGISVAULT SERVER ENGINE AKTIF DI  : http://localhost:${PORT}`);
    console.log(`🌐 CLIENT USER PORTAL (NEXT.JS) DI    : http://localhost:3000`);
    console.log('====================================================================');
    console.log('Akun Default : editor_aegis | Password : Aegis2026!');
    console.log('Buka http://localhost:4000 untuk mengatur Dongle & menyimpan Wajah!');
    console.log('====================================================================');
  });
}

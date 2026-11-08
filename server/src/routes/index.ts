import fs from 'node:fs';
import type http from 'node:http';

import { UI_HTML_PATH, CORS_HEADERS } from '../config/index.ts';
import { handleAuthRoutes } from './auth.routes.ts';
import { handleMessageRoutes } from './message.routes.ts';
import { handleFileRoutes } from './file.routes.ts';
import { handleStegoRoutes } from './stego.routes.ts';
import { handleBlockchainRoutes } from './blockchain.routes.ts';
import { handleVaultRoutes } from './vault.routes.ts';
import { handleAdminRoutes } from './admin.routes.ts';
import { handleChatRoutes } from './chat.routes.ts';
import { handleProfileRoutes } from './profile.routes.ts';
import { sendJson } from '../middlewares/error.middleware.ts';

export function routeRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  urlObj: URL
): void {
  const method = req.method || 'GET';
  const pathname = urlObj.pathname;

  // 0. Server Hardware & Biometric Enrollment Console (:4000)
  if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    if (fs.existsSync(UI_HTML_PATH)) {
      const html = fs.readFileSync(UI_HTML_PATH, 'utf8');
      res.writeHead(200, {
        ...CORS_HEADERS,
        'Content-Type': 'text/html; charset=utf-8',
      });
      res.end(html);
      return;
    }
  }

  // 1. Auth, Dongle & Face Routes
  if (handleAuthRoutes(req, res, pathname, method, urlObj)) return;

  // 2. Secret Message Routes (Super Encryption)
  if (handleMessageRoutes(req, res, pathname, method)) return;

  // 3. Encrypted File Routes (ChaCha20-Poly1305)
  if (handleFileRoutes(req, res, pathname, method)) return;

  // 4. Steganography & DB Inspector Routes
  if (handleStegoRoutes(req, res, pathname, method, urlObj)) return;

  // 5. Blockchain Audit Ledger Routes
  if (handleBlockchainRoutes(req, res, pathname, method, urlObj)) return;

  // 6. Vault Important Message Routes (FR-VAULT-01..04)
  if (handleVaultRoutes(req, res, pathname, method, urlObj)) return;

  // 7. Admin & Provisioning Routes (FR-ADM-01..04)
  if (handleAdminRoutes(req, res, pathname, method, urlObj)) return;

  // 8. Bimbingan Chat Routes (FR-CHAT-01..06)
  if (handleChatRoutes(req, res, pathname, method, urlObj)) return;

  // 9. Profil & sidik jari kunci sesi
  if (handleProfileRoutes(req, res, pathname, method)) return;

  // 10. Not Found
  sendJson(res, 404, { error: `Endpoint ${method} ${pathname} tidak ditemukan` });
}

import type http from 'node:http';
import { VaultController } from '../controllers/vault.controller.ts';

export function handleVaultRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string,
  urlObj: URL
): boolean {
  if (method === 'GET' && pathname === '/api/vault/important') {
    VaultController.listImportant(req, res, urlObj);
    return true;
  }
  if (method === 'POST' && pathname === '/api/vault/important') {
    VaultController.markImportant(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/vault/important/unmark') {
    VaultController.unmarkImportant(req, res);
    return true;
  }

  return false;
}

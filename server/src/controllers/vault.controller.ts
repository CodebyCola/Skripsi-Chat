import type http from 'node:http';
import { VaultService } from '../services/vault.service.ts';
import { parseJsonBody } from '../middlewares/jsonBody.middleware.ts';
import { sendJson, handleError } from '../middlewares/error.middleware.ts';

export class VaultController {
  static listImportant(req: http.IncomingMessage, res: http.ServerResponse, urlObj: URL) {
    try {
      const convId = urlObj.searchParams.get('convId')
        ? Number(urlObj.searchParams.get('convId'))
        : undefined;
      const data = VaultService.listImportant(convId);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async markImportant(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = VaultService.markImportant(body);
      sendJson(res, 201, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async unmarkImportant(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const success = VaultService.unmarkImportant(body.messageId, body.actor || 'dosen_pembimbing');
      sendJson(res, 200, { success });
    } catch (err) {
      handleError(res, err);
    }
  }
}

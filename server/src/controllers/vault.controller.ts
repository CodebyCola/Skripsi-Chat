import type http from 'node:http';
import { VaultService } from '../services/vault.service.ts';
import { parseJsonBody } from '../middlewares/jsonBody.middleware.ts';
import { sendJson, handleError } from '../middlewares/error.middleware.ts';
import { requireSession } from '../middlewares/auth.middleware.ts';
import { AppError, ErrorCodes } from '../config/errors.ts';

// Ref: FR-VAULT-01, 03, 04 dan FR-AUTH-08 — semua endpoint wajib sesi (Bearer token).
// Identitas (`markedBy`, `actor`) selalu berasal dari sesi, tidak pernah dari body.
export class VaultController {
  static listImportant(req: http.IncomingMessage, res: http.ServerResponse, urlObj: URL) {
    try {
      const session = requireSession(req);
      const raw = urlObj.searchParams.get('convId');
      let convId: number | undefined;
      if (raw !== null) {
        convId = Number(raw);
        if (!Number.isInteger(convId) || convId <= 0) {
          throw new AppError(ErrorCodes.ERR_AUTH_INVALID, 'convId tidak valid', 400);
        }
      }
      sendJson(res, 200, VaultService.listImportantFor(session, convId));
    } catch (err) {
      handleError(res, err);
    }
  }

  static async markImportant(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const session = requireSession(req);
      const body = await parseJsonBody(req);
      const data = VaultService.markImportantAs(session, {
        convId: Number(body.convId),
        messageId: Number(body.messageId),
        category: body.category,
      });
      sendJson(res, 201, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async unmarkImportant(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const session = requireSession(req);
      const body = await parseJsonBody(req);
      sendJson(res, 200, VaultService.unmarkImportantAs(session, Number(body.messageId)));
    } catch (err) {
      handleError(res, err);
    }
  }
}
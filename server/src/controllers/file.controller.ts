import type http from 'node:http';
import { FileService } from '../services/file.service.ts';
import { parseJsonBody } from '../middlewares/jsonBody.middleware.ts';
import { sendJson, handleError } from '../middlewares/error.middleware.ts';
import { requireSession } from '../middlewares/auth.middleware.ts';

// Ref: FR-FILE-01..05, FR-AUTH-08 — semua endpoint wajib sesi (Bearer token).
// Identitas pengguna & kunci berasal dari sesi; body hanya membawa convId/fileId/isi berkas.
export class FileController {
  static async listFiles(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const session = requireSession(req);
      const body = await parseJsonBody(req);
      sendJson(res, 200, FileService.listFilesFor(session, body.convId));
    } catch (err) {
      handleError(res, err);
    }
  }

  static async uploadFile(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const session = requireSession(req);
      const body = await parseJsonBody(req);
      const data = FileService.uploadFileAs(session, {
        convId: body.convId,
        originalName: body.originalName,
        fileBase64: body.fileBase64,
      });
      sendJson(res, 201, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async downloadFile(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const session = requireSession(req);
      const body = await parseJsonBody(req);
      sendJson(res, 200, FileService.downloadFileAs(session, body.fileId));
    } catch (err) {
      handleError(res, err);
    }
  }

  static async reviewFile(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const session = requireSession(req);
      const body = await parseJsonBody(req);
      const data = FileService.reviewFileAs(session, {
        fileId: body.fileId,
        status: body.status,
        note: body.note,
      });
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }
}
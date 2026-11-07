import type http from 'node:http';
import { FileService } from '../services/file.service.ts';
import { parseJsonBody } from '../middlewares/jsonBody.middleware.ts';
import { sendJson, handleError } from '../middlewares/error.middleware.ts';

export class FileController {
  static getFiles(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const data = FileService.getEncryptedFiles();
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async uploadAndEncrypt(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = FileService.uploadAndEncryptFile(body);
      sendJson(res, 201, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async decryptFile(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = FileService.decryptStoredFile(body);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async reviewFile(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = FileService.reviewFile(body);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }
}

import type http from 'node:http';
import { StegoService } from '../services/stego.service.ts';
import { parseJsonBody } from '../middlewares/jsonBody.middleware.ts';
import { sendJson, handleError } from '../middlewares/error.middleware.ts';

export class StegoController {
  static getImages(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const data = StegoService.getStegoImages();
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async embedImage(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = StegoService.embedStegoImage(body);
      sendJson(res, 201, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async extractImage(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = StegoService.extractStegoImage(body);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static inspectDatabase(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const data = StegoService.getDatabaseRawInspection();
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }
}

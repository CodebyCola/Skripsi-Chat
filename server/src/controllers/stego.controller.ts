import type http from 'node:http';
import { StegoService } from '../services/stego.service.ts';
import { parseJsonBody } from '../middlewares/jsonBody.middleware.ts';
import { sendJson, handleError } from '../middlewares/error.middleware.ts';
import { requireSession } from '../middlewares/auth.middleware.ts';

// Ref: FR-IMG-01 s.d. 04, FR-AUTH-08 — Steganografi LSB berbasis sesi & subkey k_stego
export class StegoController {
  /**
   * Endpoint sesi v2: GET /api/stego?convId=...
   */
  static listByConversation(req: http.IncomingMessage, res: http.ServerResponse, urlObj: URL) {
    try {
      const session = requireSession(req);
      const convId = urlObj.searchParams.get('convId') || '1';
      const data = StegoService.listImagesFor(session, convId);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  /**
   * Endpoint sesi v2: POST /api/stego/list { convId }
   */
  static async listImagesPost(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const session = requireSession(req);
      const body = await parseJsonBody(req);
      const data = StegoService.listImagesFor(session, body.convId);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  /**
   * Endpoint sesi v2: POST /api/stego/embed { convId, title, note, coverPngBase64 }
   */
  static async embedForSession(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const session = requireSession(req);
      const body = await parseJsonBody(req);
      const data = StegoService.embedForSession(session, body);
      sendJson(res, 201, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  /**
   * Endpoint sesi v2: POST /api/stego/extract { id, convId, stegoPngBase64 }
   */
  static async extractForSession(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const session = requireSession(req);
      const body = await parseJsonBody(req);
      const data = StegoService.extractForSession(session, body);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  /**
   * Hitung kapasitas: GET /api/stego/capacity?width=...&height=...
   */
  static getCapacity(req: http.IncomingMessage, res: http.ServerResponse, urlObj: URL) {
    try {
      const width = Number(urlObj.searchParams.get('width')) || 320;
      const height = Number(urlObj.searchParams.get('height')) || 240;
      const maxCapacityBytes = StegoService.getCapacity(width, height);
      sendJson(res, 200, { width, height, maxCapacityBytes });
    } catch (err) {
      handleError(res, err);
    }
  }

  // --- Jalur Legacy / Test Compatibility ---
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

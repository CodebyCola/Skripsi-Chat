import type http from 'node:http';
import { AdminService } from '../services/admin.service.ts';
import { AuditService } from '../services/audit.service.ts';
import { parseJsonBody } from '../middlewares/jsonBody.middleware.ts';
import { sendJson, handleError } from '../middlewares/error.middleware.ts';

export class AdminController {
  static async provisionUser(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = AdminService.provisionUser(body, body.initialPassword || 'SkripsiChat2026!');
      sendJson(res, 201, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async assignSupervisor(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = AdminService.assignSupervisor(body);
      sendJson(res, 201, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async deactivateUser(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const success = AdminService.deactivateUser(body.userId);
      sendJson(res, 200, { success });
    } catch (err) {
      handleError(res, err);
    }
  }

  static listAuditLogs(req: http.IncomingMessage, res: http.ServerResponse, urlObj: URL) {
    try {
      const limit = Number(urlObj.searchParams.get('limit')) || 50;
      const offset = Number(urlObj.searchParams.get('offset')) || 0;
      const logs = AuditService.listLogs(limit, offset);
      sendJson(res, 200, logs);
    } catch (err) {
      handleError(res, err);
    }
  }
}

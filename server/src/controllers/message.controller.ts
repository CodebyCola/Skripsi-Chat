import type http from 'node:http';
import { MessageService } from '../services/message.service.ts';
import { parseJsonBody } from '../middlewares/jsonBody.middleware.ts';
import { sendJson, handleError } from '../middlewares/error.middleware.ts';

export class MessageController {
  static getMessages(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const data = MessageService.getMessages();
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async createMessage(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = MessageService.createSuperEncryptedMessage(body);
      sendJson(res, 201, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async decryptMessage(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = MessageService.decryptSuperMessage(body);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async deleteMessage(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = MessageService.deleteMessage(body);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }
}

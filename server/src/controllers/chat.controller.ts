import type http from 'node:http';
import { ChatService } from '../services/chat.service.ts';
import { parseJsonBody } from '../middlewares/jsonBody.middleware.ts';
import { sendJson, handleError } from '../middlewares/error.middleware.ts';

export class ChatController {
  static listConversations(req: http.IncomingMessage, res: http.ServerResponse, urlObj: URL) {
    try {
      const userId = urlObj.searchParams.get('userId') || 'dosen_pembimbing';
      const data = ChatService.listConversations(userId);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static getConversation(req: http.IncomingMessage, res: http.ServerResponse, urlObj: URL) {
    try {
      const convId = Number(urlObj.searchParams.get('convId') || 1);
      const data = ChatService.getConversation(convId);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async sendMessage(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = ChatService.sendMessage(body);
      sendJson(res, 201, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async fetchMessages(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = ChatService.fetchMessages(body);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }
}

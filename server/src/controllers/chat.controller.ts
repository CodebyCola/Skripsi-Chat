import type http from 'node:http';
import { ChatService } from '../services/chat.service.ts';
import { parseJsonBody } from '../middlewares/jsonBody.middleware.ts';
import { sendJson, handleError } from '../middlewares/error.middleware.ts';
import { requireSession } from '../middlewares/auth.middleware.ts';

// Ref: FR-CHAT-01..06, FR-AUTH-08 — semua endpoint wajib sesi (Bearer token).
export class ChatController {
  static listConversations(req: http.IncomingMessage, res: http.ServerResponse, _urlObj: URL) {
    try {
      const session = requireSession(req);
      sendJson(res, 200, ChatService.listConversationsFor(session));
    } catch (err) {
      handleError(res, err);
    }
  }

  static getConversation(req: http.IncomingMessage, res: http.ServerResponse, urlObj: URL) {
    try {
      const session = requireSession(req);
      const convId = Number(urlObj.searchParams.get('convId'));
      sendJson(res, 200, ChatService.getConversationFor(session, convId));
    } catch (err) {
      handleError(res, err);
    }
  }

  static async sendMessage(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const session = requireSession(req);
      const body = await parseJsonBody(req);
      const data = ChatService.sendMessageAs(
        session,
        Number(body.convId),
        String(body.plaintext ?? '')
      );
      sendJson(res, 201, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async fetchMessages(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      // touch:false → polling tidak memperpanjang idle-timer (FR-AUTH-07)
      const session = requireSession(req, { touch: false });
      const body = await parseJsonBody(req);
      const data = ChatService.fetchMessagesAs(
        session,
        Number(body.convId),
        Number(body.afterId) || 0,
        Number(body.limit) || 50
      );
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }
}

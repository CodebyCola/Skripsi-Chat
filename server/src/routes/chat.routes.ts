import type http from 'node:http';
import { ChatController } from '../controllers/chat.controller.ts';

export function handleChatRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string,
  urlObj: URL
): boolean {
  if (method === 'GET' && pathname === '/api/chat/conversations') {
    ChatController.listConversations(req, res, urlObj);
    return true;
  }
  if (method === 'GET' && pathname === '/api/chat/conversation') {
    ChatController.getConversation(req, res, urlObj);
    return true;
  }
  if (method === 'POST' && pathname === '/api/chat/send') {
    ChatController.sendMessage(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/chat/fetch') {
    ChatController.fetchMessages(req, res);
    return true;
  }

  return false;
}

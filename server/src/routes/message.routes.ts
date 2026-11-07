import type http from 'node:http';
import { MessageService } from '../services/message.service.ts';
import { MessageController } from '../controllers/message.controller.ts';
import type { AesBlockMode } from '../crypto/2_superEncryption.ts';

// Re-export direct service calls untuk kompatibilitas penuh unit test
export const handleGetMessages = () => MessageService.getMessages();
export const handleCreateSuperEncryptedMessage = (body: {
  title: string;
  sender: string;
  plaintext: string;
  passphrase: string;
  mode?: AesBlockMode;
}) => MessageService.createSuperEncryptedMessage(body);
export const handleDecryptSuperMessage = (body: {
  id?: number;
  combinedPayload?: string;
  passphrase: string;
}) => MessageService.decryptSuperMessage(body);
export const handleDeleteMessage = (body: { id: number; actor?: string }) =>
  MessageService.deleteMessage(body);

/**
 * Route Dispatcher untuk Super Enkripsi Pesan Teks (/api/messages*)
 */
export function handleMessageRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string
): boolean {
  if (method === 'GET' && pathname === '/api/messages') {
    MessageController.getMessages(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/messages') {
    MessageController.createMessage(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/messages/decrypt') {
    MessageController.decryptMessage(req, res);
    return true;
  }
  if (
    (method === 'POST' && pathname === '/api/messages/delete') ||
    (method === 'DELETE' && pathname === '/api/messages')
  ) {
    MessageController.deleteMessage(req, res);
    return true;
  }

  return false;
}

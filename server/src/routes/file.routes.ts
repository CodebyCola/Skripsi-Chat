import type http from 'node:http';
import { FileService } from '../services/file.service.ts';
import { FileController } from '../controllers/file.controller.ts';

// Re-export direct service calls untuk kompatibilitas penuh unit test
export const handleGetEncryptedFiles = () => FileService.getEncryptedFiles();
export const handleUploadAndEncryptFile = (body: {
  originalName: string;
  mimeType?: string;
  fileBase64: string;
  passphrase: string;
  uploader?: string;
}) => FileService.uploadAndEncryptFile(body);
export const handleDecryptStoredFile = (body: { id: number; passphrase: string }) =>
  FileService.decryptStoredFile(body);

/**
 * Route Dispatcher untuk Enkripsi File ChaCha20-Poly1305 (/api/files*)
 */
export function handleFileRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string
): boolean {
  if (method === 'GET' && pathname === '/api/files') {
    FileController.getFiles(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/files/encrypt') {
    FileController.uploadAndEncrypt(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/files/decrypt') {
    FileController.decryptFile(req, res);
    return true;
  }

  return false;
}

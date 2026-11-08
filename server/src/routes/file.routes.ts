import type http from 'node:http';
import { FileService } from '../services/file.service.ts';
import { FileController } from '../controllers/file.controller.ts';

// Re-export direct service calls untuk kompatibilitas penuh unit test (jalur lama berbasis passphrase,
// TIDAK lagi terpasang di router; endpoint HTTP di bawah semuanya berbasis sesi).
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
 * Route Dispatcher Berkas ChaCha20-Poly1305 (/api/files/*) — wajib sesi (FR-AUTH-08)
 *   POST /api/files/list      { convId }
 *   POST /api/files/upload    { convId, originalName, fileBase64 }
 *   POST /api/files/download  { fileId }
 *   POST /api/files/review    { fileId, status: REVISION|APPROVED, note }
 */
export function handleFileRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string
): boolean {
  if (method !== 'POST') return false;

  if (pathname === '/api/files/list') {
    FileController.listFiles(req, res);
    return true;
  }
  if (pathname === '/api/files/upload') {
    FileController.uploadFile(req, res);
    return true;
  }
  if (pathname === '/api/files/download') {
    FileController.downloadFile(req, res);
    return true;
  }
  if (pathname === '/api/files/review') {
    FileController.reviewFile(req, res);
    return true;
  }

  return false;
}
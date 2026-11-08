import type http from 'node:http';
import { StegoService } from '../services/stego.service.ts';
import { StegoController } from '../controllers/stego.controller.ts';

// Re-export direct service calls untuk kompatibilitas penuh unit test
export const handleGetStegoImages = () => StegoService.getStegoImages();
export const handleEmbedStegoImage = (body: {
  title: string;
  secretMessage: string;
  passkey?: string;
  coverPngBase64?: string;
  uploader?: string;
}) => StegoService.embedStegoImage(body);
export const handleExtractStegoImage = (body: {
  id?: number;
  stegoPngBase64?: string;
  passkey?: string;
}) => StegoService.extractStegoImage(body);
export const handleGetDatabaseRawInspection = () =>
  StegoService.getDatabaseRawInspection();

/**
 * Route Dispatcher untuk Steganografi LSB PNG & Database Raw Inspector
 */
export function handleStegoRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string,
  urlObj?: URL
): boolean {
  const hasSession = !!(req.headers['x-session-id'] || req.headers.authorization);
  const parsedUrl = urlObj || new URL(req.url || '', 'http://localhost');

  if (method === 'GET' && pathname === '/api/stego') {
    if (hasSession && (parsedUrl.searchParams.has('convId') || !parsedUrl.searchParams.has('legacy'))) {
      StegoController.listByConversation(req, res, parsedUrl);
    } else {
      StegoController.getImages(req, res);
    }
    return true;
  }
  if (method === 'POST' && pathname === '/api/stego/list') {
    StegoController.listImagesPost(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/stego/embed') {
    if (hasSession) {
      StegoController.embedForSession(req, res);
    } else {
      StegoController.embedImage(req, res);
    }
    return true;
  }
  if (method === 'POST' && pathname === '/api/stego/extract') {
    if (hasSession) {
      StegoController.extractForSession(req, res);
    } else {
      StegoController.extractImage(req, res);
    }
    return true;
  }
  if (method === 'GET' && pathname === '/api/stego/capacity') {
    StegoController.getCapacity(req, res, parsedUrl);
    return true;
  }
  if (method === 'GET' && pathname === '/api/db-inspector') {
    StegoController.inspectDatabase(req, res);
    return true;
  }

  return false;
}

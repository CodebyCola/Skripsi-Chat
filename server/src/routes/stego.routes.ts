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
  method: string
): boolean {
  if (method === 'GET' && pathname === '/api/stego') {
    StegoController.getImages(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/stego/embed') {
    StegoController.embedImage(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/stego/extract') {
    StegoController.extractImage(req, res);
    return true;
  }
  if (method === 'GET' && pathname === '/api/db-inspector') {
    StegoController.inspectDatabase(req, res);
    return true;
  }

  return false;
}

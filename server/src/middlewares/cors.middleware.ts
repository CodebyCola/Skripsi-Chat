import type http from 'node:http';
import { CORS_HEADERS } from '../config/index.ts';

export function handleCors(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  // Terapkan header CORS ke setiap request
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }

  // Tangani preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return true; // request handled
  }

  return false;
}

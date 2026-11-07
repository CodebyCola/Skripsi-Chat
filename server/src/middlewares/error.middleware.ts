import type http from 'node:http';
import { CORS_HEADERS } from '../config/index.ts';

export function sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, {
    ...CORS_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(data));
}

export function handleError(res: http.ServerResponse, err: any, defaultStatusCode = 400): void {
  const message = err?.message || 'Terjadi kesalahan pada internal server';
  sendJson(res, defaultStatusCode, { error: message });
}

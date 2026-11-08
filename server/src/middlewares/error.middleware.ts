import type http from 'node:http';
import { CORS_HEADERS, AppError } from '../config/index.ts';

export function sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, {
    ...CORS_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(data));
}

export function handleError(res: http.ServerResponse, err: any, defaultStatusCode = 400): void {
  const message = err?.message || 'Terjadi kesalahan pada internal server';
  // AppError membawa status HTTP & kode error resmi (401/403/404, dst.)
  if (err instanceof AppError) {
    sendJson(res, err.statusCode, { error: message, code: err.code });
    return;
  }
  sendJson(res, defaultStatusCode, { error: message });
}

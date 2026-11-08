import { apiRequest } from '@/lib/api';
import { ImportantMessage } from '../types/messages.types';

// Ref: FR-VAULT-03/04, FR-AUTH-08 — identitas dibawa token sesi (header Authorization), bukan body.

/** Tanpa convId: server mengembalikan gabungan semua percakapan milik pemilik sesi. */
export function listImportant(convId?: number): Promise<ImportantMessage[]> {
  const qs = convId ? `?convId=${convId}` : '';
  return apiRequest<ImportantMessage[]>(`/api/vault/important${qs}`);
}

/** Khusus dosen peserta percakapan; server menegakkan role & kepesertaan. */
export function unmarkImportant(messageId: number): Promise<{ success: boolean }> {
  return apiRequest('/api/vault/important/unmark', 'POST', { messageId });
}
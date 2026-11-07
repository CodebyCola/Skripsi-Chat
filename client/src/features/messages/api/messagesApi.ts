import { apiRequest } from '@/lib/api';
import {
  EncryptedMessageRecord,
  EncryptMessagePayload,
  EncryptionStages,
} from '../types/messages.types';

export async function fetchMessages(): Promise<EncryptedMessageRecord[]> {
  return await apiRequest<EncryptedMessageRecord[]>('/api/messages');
}

export async function encryptAndSaveMessage(
  payload: EncryptMessagePayload
): Promise<{ success: boolean; encryptionStages: EncryptionStages }> {
  return await apiRequest('/api/messages', 'POST', payload);
}

export async function decryptMessage(
  id: number,
  passphrase: string
): Promise<{ plaintext: string }> {
  return await apiRequest('/api/messages/decrypt', 'POST', { id, passphrase });
}

export async function deleteMessage(
  id: number,
  actor?: string
): Promise<{ success: boolean; message: string; id: number }> {
  return await apiRequest('/api/messages/delete', 'POST', { id, actor });
}

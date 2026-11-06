import { apiRequest } from '@/lib/api';
import {
  DecryptedFileResponse,
  EncryptedFileRecord,
  EncryptFilePayload,
} from '../types/files.types';

export async function fetchFiles(): Promise<EncryptedFileRecord[]> {
  return await apiRequest<EncryptedFileRecord[]>('/api/files');
}

export async function encryptFile(
  payload: EncryptFilePayload
): Promise<{ success: boolean; file: EncryptedFileRecord }> {
  return await apiRequest('/api/files/encrypt', 'POST', payload);
}

export async function decryptFile(
  id: number,
  passphrase: string
): Promise<DecryptedFileResponse> {
  return await apiRequest<DecryptedFileResponse>('/api/files/decrypt', 'POST', {
    id,
    passphrase,
  });
}

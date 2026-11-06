import { apiRequest } from '@/lib/api';
import { EmbedMessagePayload, StegoImageRecord } from '../types/stego.types';

export async function fetchStegoGallery(): Promise<StegoImageRecord[]> {
  return await apiRequest<StegoImageRecord[]>('/api/stego');
}

export async function embedSecretMessage(
  payload: EmbedMessagePayload
): Promise<{ success: boolean; image: StegoImageRecord }> {
  return await apiRequest('/api/stego/embed', 'POST', payload);
}

export async function extractSecretMessage(
  id: number,
  passkey: string
): Promise<{ secretMessage: string }> {
  return await apiRequest('/api/stego/extract', 'POST', { id, passkey });
}

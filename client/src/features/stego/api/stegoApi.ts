import { apiRequest } from '@/lib/api';
import {
  EmbedStegoPayload,
  ExtractedStegoData,
  StegoImageRecord,
} from '../types/stego.types';

// Ref: FR-IMG-01 s.d. 04 — API Steganografi LSB berbasis sesi
export async function fetchStegoGallery(convId: number): Promise<StegoImageRecord[]> {
  return await apiRequest<StegoImageRecord[]>(`/api/stego?convId=${convId}`);
}

export async function embedSecretMessage(
  payload: EmbedStegoPayload
): Promise<StegoImageRecord> {
  return await apiRequest<StegoImageRecord>('/api/stego/embed', 'POST', payload);
}

export async function extractSecretMessage(params: {
  id?: number;
  convId?: number;
  stegoPngBase64?: string;
}): Promise<ExtractedStegoData> {
  return await apiRequest<ExtractedStegoData>('/api/stego/extract', 'POST', params);
}

export async function fetchStegoCapacity(
  width: number,
  height: number
): Promise<{ width: number; height: number; maxCapacityBytes: number }> {
  return await apiRequest<{ width: number; height: number; maxCapacityBytes: number }>(
    `/api/stego/capacity?width=${width}&height=${height}`
  );
}

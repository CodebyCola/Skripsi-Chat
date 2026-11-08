import { apiRequest } from '@/lib/api';
import {
  DownloadedFile,
  FileRecord,
  ReviewStatus,
  UploadFilePayload,
} from '../types/files.types';

// Ref: FR-FILE-01..05 — identitas pengguna dibawa token sesi (header Authorization), bukan body.

export function listFiles(convId: number): Promise<FileRecord[]> {
  return apiRequest<FileRecord[]>('/api/files/list', 'POST', { convId });
}

export function uploadFile(payload: UploadFilePayload): Promise<FileRecord> {
  return apiRequest<FileRecord>('/api/files/upload', 'POST', payload);
}

export function downloadFile(fileId: number): Promise<DownloadedFile> {
  return apiRequest<DownloadedFile>('/api/files/download', 'POST', { fileId });
}

export function reviewFile(
  fileId: number,
  status: ReviewStatus,
  note: string
): Promise<{ success: boolean; status: ReviewStatus }> {
  return apiRequest('/api/files/review', 'POST', { fileId, status, note });
}
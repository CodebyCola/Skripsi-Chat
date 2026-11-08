import { apiRequest } from '@/lib/api';
import {
  AcademicAsset,
  BlockchainData,
  IssueAssetPayload,
  IssueAssetResult,
  VerificationResult,
} from '../types/blockchain.types';

// Ref: FR-CHAIN-02..07, FR-AUTH-08 — identitas dibawa token sesi (header Authorization), bukan body.

export function fetchBlockchain(): Promise<BlockchainData> {
  return apiRequest<BlockchainData>('/api/blockchain');
}

/** Khusus admin & DEMO_MODE; server menolak peran lain dengan 403. */
export function tamperBlockchainBlock(index: number = 1): Promise<BlockchainData> {
  return apiRequest<BlockchainData>('/api/blockchain/tamper', 'POST', { index });
}

export function restoreBlockchain(): Promise<BlockchainData> {
  return apiRequest<BlockchainData>('/api/blockchain/restore', 'POST', {});
}

/** Mahasiswa: aset miliknya sendiri (server memakai identitas sesi). */
export function listStudentAssets(): Promise<AcademicAsset[]> {
  return apiRequest<AcademicAsset[]>('/api/blockchain/student-assets');
}

/** Dosen: riwayat aset yang ia terbitkan. */
export function listIssuerAssets(): Promise<AcademicAsset[]> {
  return apiRequest<AcademicAsset[]>('/api/blockchain/issuer-assets');
}

export function issueAsset(payload: IssueAssetPayload): Promise<IssueAssetResult> {
  return apiRequest<IssueAssetResult>('/api/blockchain/issue-asset', 'POST', payload);
}

export function verifyDocument(documentBase64: string): Promise<VerificationResult> {
  return apiRequest<VerificationResult>('/api/blockchain/verify-document', 'POST', { documentBase64 });
}
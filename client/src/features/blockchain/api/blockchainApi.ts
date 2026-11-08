'use client';

import { apiRequest } from '@/lib/api';
import {
  BlockchainData,
  AcademicAssetItem,
  VerificationResult,
} from '../types/blockchain.types';

export async function fetchBlockchain(): Promise<BlockchainData> {
  return await apiRequest<BlockchainData>('/api/blockchain');
}

export async function tamperBlockchainBlock(
  index: number = 1
): Promise<BlockchainData> {
  return await apiRequest<BlockchainData>('/api/blockchain/tamper', 'POST', {
    index,
  });
}

export async function restoreBlockchain(): Promise<BlockchainData> {
  return await apiRequest<BlockchainData>('/api/blockchain/restore', 'POST', {});
}

export async function issueAcademicAsset(payload: {
  assetType: 'GRADE' | 'CERTIFICATE' | 'DIPLOMA' | 'THESIS_ACC' | 'ACC_BAB' | string;
  studentId: string;
  issuerId: string;
  title: string;
  documentBase64: string;
}): Promise<any> {
  return await apiRequest('/api/blockchain/issue-asset', 'POST', payload);
}

export async function verifyAcademicDocument(
  documentBase64: string,
  docHash?: string
): Promise<VerificationResult> {
  return await apiRequest<VerificationResult>(
    '/api/blockchain/verify-document',
    'POST',
    { documentBase64, docHash }
  );
}

export async function fetchStudentAssets(
  studentId: string
): Promise<AcademicAssetItem[]> {
  return await apiRequest<AcademicAssetItem[]>(
    `/api/blockchain/student-assets?studentId=${encodeURIComponent(studentId)}`
  );
}

export async function fetchIssuerAssets(
  issuerId: string
): Promise<AcademicAssetItem[]> {
  return await apiRequest<AcademicAssetItem[]>(
    `/api/blockchain/issuer-assets?issuerId=${encodeURIComponent(issuerId)}`
  );
}

import { apiRequest } from '@/lib/api';
import { BlockchainData } from '../types/blockchain.types';

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

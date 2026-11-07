import type http from 'node:http';
import { BlockchainService } from '../services/blockchain.service.ts';
import { BlockchainController } from '../controllers/blockchain.controller.ts';

// Re-export direct service calls untuk kompatibilitas penuh unit test
export const handleGetBlockchain = () => BlockchainService.getBlockchain();
export const handleTamperBlockSimulation = (body: { index?: number; fakeTitle?: string }) =>
  BlockchainService.tamperBlockSimulation(body);
export const handleRestoreBlockchainIntegrity = () =>
  BlockchainService.restoreBlockchainIntegrity();

/**
 * Route Dispatcher untuk Blockchain Audit Ledger (/api/blockchain*)
 */
export function handleBlockchainRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string
): boolean {
  if (method === 'GET' && pathname === '/api/blockchain') {
    BlockchainController.getBlockchain(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/blockchain/tamper') {
    BlockchainController.tamperBlock(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/blockchain/restore') {
    BlockchainController.restoreBlockchain(req, res);
    return true;
  }

  return false;
}

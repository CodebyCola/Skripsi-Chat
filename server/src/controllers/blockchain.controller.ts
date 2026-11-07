import type http from 'node:http';
import { BlockchainService } from '../services/blockchain.service.ts';
import { parseJsonBody } from '../middlewares/jsonBody.middleware.ts';
import { sendJson, handleError } from '../middlewares/error.middleware.ts';

export class BlockchainController {
  static getBlockchain(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const data = BlockchainService.getBlockchain();
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async tamperBlock(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = BlockchainService.tamperBlockSimulation(body);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static restoreBlockchain(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const data = BlockchainService.restoreBlockchainIntegrity();
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }
}

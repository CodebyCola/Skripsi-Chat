import type http from 'node:http';
import { BlockchainService } from '../services/blockchain.service.ts';
import { ChainService } from '../services/chain.service.ts';
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

  static async issueAsset(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const docBuffer = body.documentBase64
        ? Buffer.from(
            body.documentBase64.includes(',') ? body.documentBase64.split(',')[1] : body.documentBase64,
            'base64'
          )
        : Buffer.from(body.documentContent || 'DOKUMEN_AKADEMIK_SKRIPSICHAT', 'utf8');

      const data = ChainService.issueAsset({
        assetType: body.assetType || 'THESIS_ACC',
        studentId: body.studentId || 'mahasiswa_01',
        issuerId: body.issuerId || 'dosen_pembimbing',
        issuerPrivateKeyPem: body.issuerPrivateKeyPem,
        documentBuffer: docBuffer,
        title: body.title || 'Persetujuan Sidang Skripsi (ACC)',
        meta: body.meta,
      });
      sendJson(res, 201, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async verifyDocument(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const docBuffer = body.documentBase64
        ? Buffer.from(
            body.documentBase64.includes(',') ? body.documentBase64.split(',')[1] : body.documentBase64,
            'base64'
          )
        : Buffer.from(body.documentContent || '', 'utf8');

      const data = ChainService.verifyDocument(docBuffer, body.docHash);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static getStudentAssets(req: http.IncomingMessage, res: http.ServerResponse, urlObj: URL) {
    try {
      const studentId = urlObj.searchParams.get('studentId') || 'mahasiswa_01';
      const data = ChainService.getStudentAssets(studentId);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static listAssetsByIssuer(req: http.IncomingMessage, res: http.ServerResponse, urlObj: URL) {
    try {
      const issuerId = urlObj.searchParams.get('issuerId') || 'dosen_pembimbing';
      const data = ChainService.listAssetsByIssuer(issuerId);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }
}

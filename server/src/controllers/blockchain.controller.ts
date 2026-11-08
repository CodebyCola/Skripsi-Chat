import type http from 'node:http';
import { BlockchainService } from '../services/blockchain.service.ts';
import { ChainService } from '../services/chain.service.ts';
import { parseJsonBody } from '../middlewares/jsonBody.middleware.ts';
import { sendJson, handleError } from '../middlewares/error.middleware.ts';
import { requireSession } from '../middlewares/auth.middleware.ts';
import { DEMO_MODE } from '../config/index.ts';

// Ref: FR-CHAIN-02..07 dan FR-AUTH-08 — semua endpoint wajib sesi (Bearer token).
// Penerbit, kunci privat, dan pemilik aset berasal dari sesi, tidak pernah dari body.
export class BlockchainController {
  static getBlockchain(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      requireSession(req);
      // demoMode memberi tahu UI apakah tombol tamper boleh ditampilkan
      sendJson(res, 200, { ...BlockchainService.getBlockchain(), demoMode: DEMO_MODE });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async tamperBlock(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const session = requireSession(req);
      const body = await parseJsonBody(req);
      sendJson(res, 200, {
        ...BlockchainService.tamperBlockSimulationAs(session, body),
        demoMode: DEMO_MODE,
      });
    } catch (err) {
      handleError(res, err);
    }
  }

  static restoreBlockchain(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const session = requireSession(req);
      sendJson(res, 200, {
        ...BlockchainService.restoreBlockchainIntegrityAs(session),
        demoMode: DEMO_MODE,
      });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async issueAsset(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const session = requireSession(req);
      const body = await parseJsonBody(req);
      const data = ChainService.issueAssetAs(session, {
        assetType: body.assetType,
        studentId: body.studentId,
        title: body.title,
        documentBase64: body.documentBase64,
      });
      sendJson(res, 201, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async verifyDocument(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const session = requireSession(req);
      const body = await parseJsonBody(req);
      sendJson(res, 200, ChainService.verifyDocumentFor(session, body.documentBase64));
    } catch (err) {
      handleError(res, err);
    }
  }

  static getStudentAssets(req: http.IncomingMessage, res: http.ServerResponse, urlObj: URL) {
    try {
      const session = requireSession(req);
      const studentId = urlObj.searchParams.get('studentId') ?? undefined;
      sendJson(res, 200, ChainService.getStudentAssetsFor(session, studentId));
    } catch (err) {
      handleError(res, err);
    }
  }

  static listAssetsByIssuer(req: http.IncomingMessage, res: http.ServerResponse, _urlObj: URL) {
    try {
      const session = requireSession(req);
      sendJson(res, 200, ChainService.listAssetsByIssuerFor(session));
    } catch (err) {
      handleError(res, err);
    }
  }
}
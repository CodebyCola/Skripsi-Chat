import type http from 'node:http';
import { AuthService } from '../services/auth.service.ts';
import { parseJsonBody } from '../middlewares/jsonBody.middleware.ts';
import { sendJson, handleError } from '../middlewares/error.middleware.ts';

export class AuthController {
  static getDongleStatus(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const data = AuthService.getDongleStatus();
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async toggleVirtualDongle(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = AuthService.toggleVirtualDongle(body.connect);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async switchVirtualDongle(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = AuthService.switchVirtualDongleUser(body.username);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async provisionDongle(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = AuthService.provisionUsbDongle(body);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static getUsersForAdmin(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const data = AuthService.getUsersForAdmin();
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static checkStatus(req: http.IncomingMessage, res: http.ServerResponse, urlObj: URL) {
    try {
      const username = urlObj.searchParams.get('username') || '';
      const data = AuthService.checkClientAuthStatus(username);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async enrollFace(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = AuthService.enrollUserFace(body);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async deleteFace(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = AuthService.deleteUserFace(body.username);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async deleteUser(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = AuthService.deleteUser(body.username);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async verifyFace(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = AuthService.verifyClientFace(body);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async register(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = AuthService.registerUser(body);
      sendJson(res, 201, data);
    } catch (err) {
      handleError(res, err);
    }
  }

  static async login(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const body = await parseJsonBody(req);
      const data = AuthService.loginUser(body);
      sendJson(res, 200, data);
    } catch (err) {
      handleError(res, err);
    }
  }
}

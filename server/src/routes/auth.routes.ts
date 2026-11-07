import type http from 'node:http';
import { AuthService } from '../services/auth.service.ts';
import { AuthController } from '../controllers/auth.controller.ts';

// Re-export direct service calls untuk kompatibilitas penuh unit test & internal script
export const handleGetDongleStatus = () => AuthService.getDongleStatus();
export const handleToggleVirtualDongle = (connect?: boolean) => AuthService.toggleVirtualDongle(connect);
export const handleProvisionUsbDongle = (body: { username: string; targetDrive?: string }) => AuthService.provisionUsbDongle(body);
export const handleGetUsersForAdmin = () => AuthService.getUsersForAdmin();
export const handleEnrollUserFace = (body: { username: string; faceDescriptor: number[]; facePhotoBase64?: string }) => AuthService.enrollUserFace(body);
export const handleDeleteUserFace = (username: string) => AuthService.deleteUserFace(username);
export const handleDeleteUser = (username: string) => AuthService.deleteUser(username);
export const handleCheckClientAuthStatus = (username: string) => AuthService.checkClientAuthStatus(username);
export const handleVerifyClientFace = (body: { username: string; faceDescriptor: number[] }) => AuthService.verifyClientFace(body);
export const handleRegisterUser = (body: {
  username: string;
  fullName: string;
  password: string;
  secretNote?: string;
  faceDescriptor: number[];
  facePhotoBase64?: string;
  targetDrive?: string;
}) => AuthService.registerUser(body);
export const handleLoginUser = (body: {
  username: string;
  password: string;
  faceDescriptor?: number[];
  manualDongleKeyContent?: string;
}) => AuthService.loginUser(body);

/**
 * Route Dispatcher untuk Otentikasi, Dongle, & Biometrik (/api/auth/*)
 */
export function handleAuthRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string,
  urlObj: URL
): boolean {
  if (method === 'GET' && pathname === '/api/auth/dongle/status') {
    AuthController.getDongleStatus(req, res);
    return true;
  }
  if (method === 'GET' && pathname === '/api/auth/check-status') {
    AuthController.checkStatus(req, res, urlObj);
    return true;
  }
  if (method === 'GET' && pathname === '/api/auth/users') {
    AuthController.getUsersForAdmin(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/auth/dongle/toggle-virtual') {
    AuthController.toggleVirtualDongle(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/auth/dongle/provision') {
    AuthController.provisionDongle(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/auth/face/enroll') {
    AuthController.enrollFace(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/auth/face/delete') {
    AuthController.deleteFace(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/auth/users/delete') {
    AuthController.deleteUser(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/auth/verify-face') {
    AuthController.verifyFace(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/auth/register') {
    AuthController.register(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/auth/login') {
    AuthController.login(req, res);
    return true;
  }

  return false;
}

import { apiRequest } from '@/lib/api';
import {
  ClientAuthCheckState,
  FaceVerifyServerResult,
  LoginResponseData,
} from '../types/auth.types';

export async function checkServerAuthStatus(
  username: string
): Promise<ClientAuthCheckState> {
  const q = encodeURIComponent((username || '').trim());
  const res = await apiRequest<Omit<ClientAuthCheckState, 'serverOnline'>>(
    `/api/auth/check-status?username=${q}`
  );
  return {
    ...res,
    serverOnline: true,
  };
}

export async function verifyFaceWithServer(
  username: string,
  faceDescriptor: number[]
): Promise<FaceVerifyServerResult> {
  return await apiRequest<FaceVerifyServerResult>(
    '/api/auth/verify-face',
    'POST',
    {
      username: username.trim(),
      faceDescriptor,
    }
  );
}

export async function loginWithCredentialsAndFace(payload: {
  username: string;
  password: string;
  faceDescriptor: number[];
}): Promise<LoginResponseData> {
  return await apiRequest<LoginResponseData>('/api/auth/login', 'POST', {
    username: payload.username.trim(),
    password: payload.password,
    faceDescriptor: payload.faceDescriptor,
  });
}

export async function switchVirtualDongle(username: string): Promise<any> {
  return await apiRequest('/api/auth/dongle/switch', 'POST', {
    username: username.trim(),
  });
}

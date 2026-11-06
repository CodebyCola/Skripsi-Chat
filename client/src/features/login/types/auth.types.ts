export type AuthStep = 1 | 2 | 3;
export type AcademicRole = 'student' | 'lecturer';

export interface ActiveDongleInfo {
  drivePath: string;
  username: string;
  dongleId: string;
  issuedAt: string;
}

export interface ClientAuthCheckState {
  serverOnline: boolean;
  dongleDetected: boolean;
  dongleMatchesUser: boolean;
  userExists: boolean;
  hasEnrolledFace: boolean;
  hasFacePhoto: boolean;
  expectedDongleId?: string;
  matchedDrivePath?: string | null;
  activeDongle: ActiveDongleInfo | null;
}

export interface FaceVerifyServerResult {
  username: string;
  matched: boolean;
  distance: number;
  similarityPercent: number;
  threshold: number;
  hasCustomFacePhoto: boolean;
  message: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  dongleId: string;
  secretNote?: string;
}

export interface SecurityVerificationSummary {
  dongleStatus: string;
  passwordAlgorithm: string;
  biometricDistance: number;
  biometricSimilarityPercent: number;
}

export interface LoginResponseData {
  success: boolean;
  user: AuthenticatedUser;
  securityVerification: SecurityVerificationSummary;
}

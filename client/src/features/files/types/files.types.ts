export interface EncryptedFileRecord {
  id: number;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  nonceHex: string;
  authTagHex: string;
  originalSha256: string;
  status?: 'SUBMITTED' | 'REVISION' | 'APPROVED';
  reviewedBy?: string;
  reviewNote?: string;
  reviewedAt?: string;
  version?: number;
  createdAt?: string;
}

export interface EncryptFilePayload {
  originalName: string;
  mimeType: string;
  fileBase64: string | ArrayBuffer | null;
  passphrase: string;
}

export interface DecryptedFileResponse {
  originalName: string;
  mimeType: string;
  decryptedBase64: string;
}

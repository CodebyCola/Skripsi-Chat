export interface EncryptedFileRecord {
  id: number;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  nonceHex: string;
  authTagHex: string;
  originalSha256: string;
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

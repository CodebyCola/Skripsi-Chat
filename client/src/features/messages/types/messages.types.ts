export interface EncryptionStages {
  stage1VigenereHex: string;
  stage2VernamHex: string;
  combinedPayload: string;
}

export interface EncryptedMessageRecord {
  id: number;
  title: string;
  sender: string;
  mode: 'CBC' | 'ECB';
  superCiphertextPayload: string;
  createdAt?: string;
}

export interface EncryptMessagePayload {
  title: string;
  sender: string;
  plaintext: string;
  passphrase: string;
  mode: 'CBC' | 'ECB';
}

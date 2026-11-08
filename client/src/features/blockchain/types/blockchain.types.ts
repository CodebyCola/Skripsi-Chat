export interface BlockRecord {
  index: number;
  timestamp: string;
  actionType: string;
  assetTitle: string;
  previousHash: string;
  assetDataHash: string;
  hash: string;
  nonce: number;
}

export interface BlockValidationDetail {
  index: number;
  isValid: boolean;
  errorReason?: string;
}

export interface BlockchainValidation {
  isChainValid: boolean;
  totalBlocks: number;
  firstCorruptedIndex?: number;
  details?: BlockValidationDetail[];
}

export interface BlockchainData {
  blocks: BlockRecord[];
  validation: BlockchainValidation;
  /** Dari server (DEMO_MODE); tombol tamper hanya tampil bila true dan peran admin */
  demoMode?: boolean;
}

// Ref: FR-CHAIN-02, 06 — aset akademik yang dicatat di blockchain
export type IssuableAssetType = 'THESIS_ACC' | 'GRADE' | 'CERTIFICATE' | 'DIPLOMA';

export interface AcademicAsset {
  id: number;
  blockIndex: number;
  assetType: string;
  studentId: string;
  studentName: string;
  issuerId: string;
  issuerName: string;
  docHash: string;
  title: string;
  issuedAt: string;
}

export interface IssueAssetPayload {
  assetType: IssuableAssetType;
  /** username mahasiswa bimbingan; penerbit & kunci tanda tangan diambil server dari sesi */
  studentId: string;
  title: string;
  documentBase64: string;
}

export interface IssueAssetResult {
  success: boolean;
  isDuplicate?: boolean;
  blockIndex: number;
  docHash: string;
  signature: string;
  message?: string;
}

/** Mahasiswa bimbingan yang dapat dipilih dosen pada form terbit */
export interface StudentOption {
  username: string;
  fullName: string;
  topic: string;
}

// Ref: FR-CHAIN-05 — hasil verifikasi dokumen
export type VerifyStatus = 'AUTHENTIC' | 'NOT_FOUND' | 'CHAIN_COMPROMISED';

export interface VerificationResult {
  status: VerifyStatus;
  message: string;
  blockIndex?: number;
  assetType?: string;
  title?: string;
  studentId?: string;
  studentName?: string;
  issuerId?: string;
  issuerName?: string;
  docHash?: string;
  issuedAt?: string;
  signatureValid?: boolean;
}
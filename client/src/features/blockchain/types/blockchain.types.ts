export interface BlockRecord {
  index: number;
  timestamp: string;
  actionType: string;
  actor?: string;
  assetTitle: string;
  previousHash: string;
  assetDataHash: string;
  hash: string;
  nonce: number;
  signature?: string;
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
}

export interface AcademicAssetItem {
  id: number;
  blockIndex: number;
  assetType: 'GRADE' | 'CERTIFICATE' | 'DIPLOMA' | 'THESIS_ACC' | 'ACC_BAB' | string;
  studentId: string;
  issuerId: string;
  docHash: string;
  title: string;
  issuedAt: string;
}

export interface VerificationResult {
  status: 'AUTHENTIC' | 'NOT_FOUND' | 'CHAIN_COMPROMISED';
  message: string;
  blockIndex?: number;
  assetType?: string;
  title?: string;
  studentId?: string;
  issuerId?: string;
  docHash?: string;
  issuedAt?: string;
  signatureValid?: boolean;
}

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
}

// Ref: FR-VAULT-03 — pesan penting dari vault (didekripsi server dengan K_master_db)
export type ImportantCategory = 'ACC' | 'REVISI' | 'JADWAL_SIDANG' | 'LAINNYA';

export interface ImportantMessage {
  id: number;
  convId: number;
  messageId: number;
  category: ImportantCategory;
  contentPlain: string;
  markedBy: string;
  markedAt: string;
}

/** Percakapan untuk label & filter kartu */
export interface ImportantConversation {
  id: number;
  topic: string;
  peerName: string;
}

export type CategoryFilter = 'ALL' | ImportantCategory;
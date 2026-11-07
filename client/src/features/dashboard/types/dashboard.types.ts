export interface AuthenticatedSessionUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  dongleId?: string;
  identityNo?: string;
}

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
  badge?: string | number;
  badgeIcon?: string;
  isActive?: boolean;
}

export interface ChatAttachment {
  name: string;
  size: string;
  hash: string;
  url?: string;
}

export interface ChatMessageItem {
  id: string | number;
  sender: string;
  senderRole?: 'MAHASISWA' | 'DOSEN_PEMBIMBING' | 'ADMIN';
  timestamp: string;
  content: string;
  isMe: boolean;
  statusText?: string;
  statusIcon?: string;
  attachment?: ChatAttachment;
  signatureVerified?: boolean;
  isImportant?: boolean;
  category?: 'ACC' | 'REVISI' | 'JADWAL_SIDANG' | 'LAINNYA';
  rawStages?: {
    stage1VigenerePreview?: string;
    stage2VernamHex?: string;
    superCiphertextPayload?: string;
  };
}

export interface DashboardModule {
  href: string;
  title: string;
  desc: string;
  badge?: string;
}

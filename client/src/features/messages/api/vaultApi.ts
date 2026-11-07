'use client';

import { apiRequest } from '@/lib/api';

export interface ImportantMessageItem {
  id: number;
  convId: number;
  messageId: number;
  category: 'ACC' | 'REVISI' | 'JADWAL_SIDANG' | 'LAINNYA';
  contentPlain?: string;
  markedBy: string;
  markedAt: string;
}

export interface DbRawInspectionData {
  encryptionSpec: {
    columnEncryptionAlgorithm: string;
    passwordHashAlgorithm: string;
    sqliteFilePath: string;
  };
  usersTable: Array<{
    id: number;
    username: string;
    rawInSqlite: {
      fullNameEncrypted: string;
      passwordHash: string;
      dongleIdEncrypted: string;
      faceDescriptorEncrypted: string;
      secretNoteEncrypted: string;
    };
    decryptedInApp: {
      fullName: string;
      dongleId: string;
      secretNote: string;
    };
  }>;
  messagesTable: Array<{
    id: number;
    title: string;
    rawInSqlite: {
      senderEncrypted: string;
      superCiphertextPayload: string;
    };
    decryptedInApp: {
      sender: string;
      mode: string;
    };
  }>;
  importantMessagesTable?: Array<{
    id: number;
    convId: number;
    messageId: number;
    category: string;
    markedBy: string;
    markedAt: string;
    rawInSqlite: {
      contentEnc: string;
      nonceHex: string;
      authTagHex: string;
    };
    decryptedInApp: {
      contentPlain: string;
    };
  }>;
}

export async function fetchImportantMessages(): Promise<ImportantMessageItem[]> {
  return await apiRequest<ImportantMessageItem[]>('/api/vault/important');
}

export async function markImportant(payload: {
  messageId: number;
  category: 'ACC' | 'REVISI' | 'JADWAL_SIDANG' | 'LAINNYA';
  plainContent: string;
  markedBy?: string;
  convId?: number;
}): Promise<ImportantMessageItem> {
  return await apiRequest<ImportantMessageItem>('/api/vault/important', 'POST', payload);
}

export async function unmarkImportant(
  messageId: number,
  actor: string = 'dosen_pembimbing'
): Promise<{ success: boolean }> {
  return await apiRequest('/api/vault/important/unmark', 'POST', {
    messageId,
    actor,
  });
}

export async function fetchDbRawInspection(): Promise<DbRawInspectionData> {
  return await apiRequest<DbRawInspectionData>('/api/db-inspector');
}

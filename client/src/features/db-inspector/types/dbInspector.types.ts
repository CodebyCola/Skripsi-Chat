export interface DbInspectorUserRecord {
  id: number;
  username: string;
  rawInSqlite: Record<string, any>;
  decryptedInApp: Record<string, any>;
}

export interface DbInspectorImportantRecord {
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
}

export interface DbInspectorMessageRecord {
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
}

export interface DbInspectorData {
  usersTable: DbInspectorUserRecord[];
  encryptionSpec?: {
    columnEncryptionAlgorithm: string;
    passwordHashAlgorithm: string;
    sqliteFilePath: string;
  };
  messagesTable?: DbInspectorMessageRecord[];
  importantMessagesTable?: DbInspectorImportantRecord[];
}

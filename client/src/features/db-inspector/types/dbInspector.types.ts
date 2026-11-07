export interface DbInspectorUserRecord {
  id: number;
  username: string;
  rawInSqlite: Record<string, any>;
  decryptedInApp: Record<string, any>;
}

export interface DbInspectorData {
  usersTable: DbInspectorUserRecord[];
  encryptionSpec?: {
    columnEncryptionAlgorithm: string;
    passwordHashAlgorithm: string;
    sqliteFilePath: string;
  };
  messagesTable?: any[];
  importantMessagesTable?: any[];
}

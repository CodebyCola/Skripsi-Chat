import { db, appendNewBlockchainRecord } from '../database/connection.ts';
import {
  superEncryptText,
  superDecryptText,
  type AesBlockMode,
} from '../crypto/2_superEncryption.ts';
import {
  encryptDatabaseColumn,
  decryptDatabaseColumn,
} from '../crypto/3_dbEncryption.ts';

export class MessageService {
  static getMessages() {
    const rows = db
      .prepare('SELECT * FROM SecretMessage ORDER BY id DESC')
      .all() as Array<{
      id: number;
      title: string;
      senderEncrypted: string;
      mode: string;
      stage1VigenerePreview: string;
      stage2VernamHex: string;
      superCiphertextPayload: string;
      createdAt: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      sender: decryptDatabaseColumn(r.senderEncrypted),
      senderRawEncryptedInDb: r.senderEncrypted,
      mode: r.mode,
      stage1VigenerePreview: r.stage1VigenerePreview,
      stage2VernamHex: r.stage2VernamHex,
      superCiphertextPayload: r.superCiphertextPayload,
      createdAt: r.createdAt,
    }));
  }

  static createSuperEncryptedMessage(body: {
    title: string;
    sender: string;
    plaintext: string;
    passphrase: string;
    mode?: AesBlockMode;
  }) {
    const title = (body.title || 'Catatan Bimbingan Skripsi').trim();
    const sender = (body.sender || 'dosen_pembimbing').trim();
    const plaintext = body.plaintext || '';
    const passphrase = body.passphrase || '';
    const mode: AesBlockMode = body.mode === 'ECB' ? 'ECB' : 'CBC';

    if (!plaintext || !passphrase) {
      throw new Error('Pesan teks dan Kunci Super Enkripsi wajib diisi');
    }

    const encrypted = superEncryptText(plaintext, passphrase, mode);
    const senderEncrypted = encryptDatabaseColumn(sender);

    const info = db
      .prepare(`
        INSERT INTO SecretMessage (
          title, senderEncrypted, mode, stage1VigenerePreview,
          stage2VernamHex, superCiphertextPayload, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        title,
        senderEncrypted,
        encrypted.mode,
        encrypted.stage1VigenerePreview,
        encrypted.stage2VernamHex,
        encrypted.combinedPayload,
        new Date().toISOString()
      );

    // Catat ke Blockchain Audit Ledger
    appendNewBlockchainRecord({
      actionType: 'SUPER_ENCRYPT_MSG',
      actor: sender,
      assetTitle: title,
      assetData: encrypted.combinedPayload,
    });

    return {
      id: Number(info.lastInsertRowid),
      title,
      sender,
      encryptionStages: encrypted,
    };
  }

  static decryptSuperMessage(body: {
    id?: number;
    combinedPayload?: string;
    passphrase: string;
  }) {
    let payload = body.combinedPayload || '';

    if (body.id && !payload) {
      const row = db
        .prepare('SELECT superCiphertextPayload FROM SecretMessage WHERE id = ?')
        .get(body.id) as { superCiphertextPayload: string } | undefined;
      if (!row) {
        throw new Error('Pesan tidak ditemukan');
      }
      payload = row.superCiphertextPayload;
    }

    if (!payload || !body.passphrase) {
      throw new Error('Ciphertext dan Passphrase wajib diisi untuk dekripsi');
    }

    try {
      const result = superDecryptText(payload, body.passphrase);
      return {
        success: true,
        ...result,
      };
    } catch {
      throw new Error(
        'Dekripsi Gagal! Kunci Super Enkripsi (Passphrase) salah atau ciphertext tidak cocok.'
      );
    }
  }

  static deleteMessage(body: { id: number; actor?: string }) {
    if (!body.id) {
      throw new Error('ID pesan wajib disertakan');
    }

    const existing = db
      .prepare('SELECT id, title, senderEncrypted FROM SecretMessage WHERE id = ?')
      .get(body.id) as { id: number; title: string; senderEncrypted: string } | undefined;

    if (!existing) {
      throw new Error('Pesan tidak ditemukan atau sudah dihapus');
    }

    const actor = (
      body.actor ||
      decryptDatabaseColumn(existing.senderEncrypted) ||
      'dosen_pembimbing'
    ).trim();

    db.prepare('DELETE FROM SecretMessage WHERE id = ?').run(body.id);

    // Catat audit trail penghapusan pesan ke Blockchain
    appendNewBlockchainRecord({
      actionType: 'DELETE_SUPER_ENCRYPT_MSG',
      actor,
      assetTitle: `Hapus Pesan #${existing.id}: ${existing.title}`,
      assetData: `DELETED_MSG_ID_${existing.id}`,
    });

    return {
      success: true,
      message: `Pesan #${existing.id} berhasil dihapus dari database`,
      id: existing.id,
    };
  }
}

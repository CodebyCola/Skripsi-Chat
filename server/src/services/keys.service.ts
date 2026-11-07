/**
 * ============================================================================
 * MODUL KEYS: MANAJEMEN KUNCI & HIERARKI KUNCI (FR-KEY-01 s.d. FR-KEY-04)
 * ============================================================================
 * Mengimplementasikan Hierarki Kunci SkripsiChat:
 * 1. KEK_user diturunkan dari (password + dongle_secret) dengan KDF + salt
 * 2. Keypair RSA-2048 per user; private key terenkripsi AES-256-GCM oleh KEK
 * 3. K_conv (32-byte acak) dibungkus RSA-OAEP untuk mahasiswa dan dosen
 * 4. Subkey diturunkan dari K_conv dengan HKDF-SHA256:
 *    - k_text_vig   (16 byte, info: 'text-vig')
 *    - k_text_trans (16 byte, info: 'text-trans')
 *    - k_text_aes   (32 byte, info: 'text-aes')
 *    - k_file       (32 byte, info: 'file')
 *    - k_stego      (32 byte, info: 'stego')
 * 5. K_master_db dimuat dari env/config untuk enkripsi kolom pesan penting
 */

import crypto from 'node:crypto';
import { RSA_KEY_BITS, MASTER_DB_KEY } from '../config/index.ts';
import { AppError, ErrorCodes } from '../config/errors.ts';

export interface UserKeyPair {
  publicKeyPem: string;
  privateKeyPem: string;
}

export interface EncryptedPrivateKeyBlob {
  ciphertextHex: string;
  nonceHex: string;
  authTagHex: string;
}

export interface SubKeys {
  k_text_vig: Buffer;
  k_text_trans: Buffer;
  k_text_aes: Buffer;
  k_file: Buffer;
  k_stego: Buffer;
}

export class KeysService {
  /**
   * FR-KEY-01: Generate keypair RSA 2048-bit (SPKI / PKCS8)
   */
  static generateUserKeypair(): UserKeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: RSA_KEY_BITS,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return {
      publicKeyPem: publicKey,
      privateKeyPem: privateKey,
    };
  }

  /**
   * FR-KEY-01: Turunkan KEK (Key Encryption Key) 32-byte dari password + dongle_secret
   */
  static deriveKek(password: string, dongleSecret: Buffer, kdfSalt: Buffer): Buffer {
    const passBuf = Buffer.from(password, 'utf8');
    const lenHeader = Buffer.alloc(4);
    lenHeader.writeUInt32BE(passBuf.length, 0);

    // material = len(password) || password || dongle_secret
    const material = Buffer.concat([lenHeader, passBuf, dongleSecret]);

    // KDF Scrypt (N=16384, r=8, p=1) menghasilkan 32-byte KEK
    return crypto.scryptSync(material, kdfSalt, 32, { N: 16384, r: 8, p: 1 });
  }

  /**
   * FR-KEY-01: Enkripsi Private Key dengan KEK menggunakan AES-256-GCM (AAD = userId)
   */
  static protectPrivateKey(
    privateKeyPem: string,
    kek: Buffer,
    userId: string | number
  ): EncryptedPrivateKeyBlob {
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', kek, nonce);
    cipher.setAAD(Buffer.from(String(userId), 'utf8'));

    const ciphertext = Buffer.concat([
      cipher.update(privateKeyPem, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return {
      ciphertextHex: ciphertext.toString('hex'),
      nonceHex: nonce.toString('hex'),
      authTagHex: authTag.toString('hex'),
    };
  }

  /**
   * FR-AUTH-05: Buka (dekripsi) Private Key menggunakan KEK
   */
  static unlockPrivateKey(
    encryptedBlob: EncryptedPrivateKeyBlob,
    kek: Buffer,
    userId: string | number
  ): string {
    try {
      const nonce = Buffer.from(encryptedBlob.nonceHex, 'hex');
      const authTag = Buffer.from(encryptedBlob.authTagHex, 'hex');
      const ciphertext = Buffer.from(encryptedBlob.ciphertextHex, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', kek, nonce);
      decipher.setAAD(Buffer.from(String(userId), 'utf8'));
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch {
      throw new AppError(
        ErrorCodes.ERR_KEY_UNLOCK_FAILED,
        'Private key gagal dibuka. Password atau kunci USB Dongle salah!',
        401
      );
    }
  }

  /**
   * FR-KEY-02: Membuat kunci acak 32-byte untuk percakapan (K_conv)
   */
  static createConversationKey(): Buffer {
    return crypto.randomBytes(32);
  }

  /**
   * FR-KEY-02: Bungkus kunci percakapan dengan Public Key peserta (RSA-OAEP SHA-256)
   */
  static wrapKey(conversationKey: Buffer, publicKeyPem: string): string {
    const wrapped = crypto.publicEncrypt(
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      conversationKey
    );
    return wrapped.toString('hex');
  }

  /**
   * FR-KEY-02: Buka bungkusan kunci percakapan dengan Private Key peserta (RSA-OAEP SHA-256)
   */
  static unwrapKey(wrappedKeyHex: string, privateKeyPem: string): Buffer {
    try {
      const wrappedBuf = Buffer.from(wrappedKeyHex, 'hex');
      return crypto.privateDecrypt(
        {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        wrappedBuf
      );
    } catch {
      throw new AppError(
        ErrorCodes.ERR_DECRYPT_FAILED,
        'Gagal membuka kunci percakapan (RSA-OAEP decrypt failed)',
        403
      );
    }
  }

  /**
   * FR-KEY-03: Turunkan 5 Subkey dari K_conv menggunakan HKDF-SHA256
   */
  static deriveSubkeys(kConv: Buffer): SubKeys {
    const salt = Buffer.from('SkripsiChat_HKDF_Salt_2026', 'utf8');

    const k_text_vig = Buffer.from(
      crypto.hkdfSync('sha256', kConv, salt, Buffer.from('text-vig', 'utf8'), 16)
    );
    const k_text_trans = Buffer.from(
      crypto.hkdfSync('sha256', kConv, salt, Buffer.from('text-trans', 'utf8'), 16)
    );
    const k_text_aes = Buffer.from(
      crypto.hkdfSync('sha256', kConv, salt, Buffer.from('text-aes', 'utf8'), 32)
    );
    const k_file = Buffer.from(
      crypto.hkdfSync('sha256', kConv, salt, Buffer.from('file', 'utf8'), 32)
    );
    const k_stego = Buffer.from(
      crypto.hkdfSync('sha256', kConv, salt, Buffer.from('stego', 'utf8'), 32)
    );

    return {
      k_text_vig,
      k_text_trans,
      k_text_aes,
      k_file,
      k_stego,
    };
  }

  /**
   * FR-KEY-04: Muat Master Key Database (32-byte) dari konfigurasi
   */
  static loadMasterDbKey(): Buffer {
    if (!MASTER_DB_KEY) {
      throw new AppError(
        ErrorCodes.ERR_CONFIG_MISSING,
        'K_master_db tidak ditemukan di environment atau konfigurasi',
        500
      );
    }
    return crypto.createHash('sha256').update(MASTER_DB_KEY).digest();
  }
}

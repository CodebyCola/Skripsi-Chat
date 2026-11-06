/**
 * ============================================================================
 * PILAR 1B: VERIFIKASI HARDWARE DONGLE (USB FLASHDISK CRYPTO KEY)
 * ============================================================================
 * Penjelasan untuk Presentasi Dosen:
 * 1. Sistem mengubah USB Flashdisk biasa menjadi Hardware Security Dongle
 *    dengan menanamkan file kunci kriptografi bernama `.aegis_key`.
 * 2. Isi file `.aegis_key` bukan teks biasa, melainkan payload JSON yang
 *    ditandatangani dengan HMAC-SHA256 dan dienkripsi menggunakan AES-256-CBC.
 * 3. Saat Login, backend memindai seluruh huruf drive USB (D:\ s/d Z:\).
 *    Login biometrik + password HANYA AKTIF jika USB Dongle terdeteksi dan valid.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DONGLE_MASTER_SECRET =
  process.env.AEGIS_DONGLE_SECRET || 'AegisVault_Hardware_Dongle_Master_Key_2026!';
const DONGLE_FILENAME = '.aegis_key';

export interface DonglePayload {
  username: string;
  dongleId: string;
  issuedAt: string;
  signature: string;
}

export interface DetectedDriveInfo {
  drivePath: string;
  hasKeyFile: boolean;
  keyContent?: string;
  decodedPayload?: DonglePayload | null;
}

function getDerivedAesKey(): Buffer {
  return crypto.createHash('sha256').update(DONGLE_MASTER_SECRET).digest();
}

/**
 * Membuat tanda tangan HMAC-SHA256 untuk isi token USB Dongle
 */
function signDongleData(username: string, dongleId: string, issuedAt: string): string {
  return crypto
    .createHmac('sha256', DONGLE_MASTER_SECRET)
    .update(`${username}|${dongleId}|${issuedAt}`)
    .digest('hex');
}

/**
 * Menghasilkan isi file `.aegis_key` yang terenkripsi AES-256-CBC
 */
export function generateDongleKeyFileContent(username: string, dongleId?: string): {
  dongleId: string;
  encryptedKeyFileContent: string;
} {
  const finalDongleId = dongleId || crypto.randomUUID();
  const issuedAt = new Date().toISOString();
  const signature = signDongleData(username, finalDongleId, issuedAt);

  const payload: DonglePayload = {
    username,
    dongleId: finalDongleId,
    issuedAt,
    signature,
  };

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getDerivedAesKey(), iv);
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    dongleId: finalDongleId,
    encryptedKeyFileContent: `AEGIS-USB-V1:${iv.toString('hex')}:${encrypted}`,
  };
}

/**
 * Mendekripsi dan memvalidasi keaslian file `.aegis_key` dari USB Dongle
 */
export function verifyDongleKeyFileContent(
  encryptedContent: string,
  expectedUsername?: string,
  expectedDongleId?: string
): { valid: boolean; payload: DonglePayload | null; reason?: string } {
  try {
    const trimmed = encryptedContent.trim();
    const parts = trimmed.split(':');
    if (parts.length !== 3 || parts[0] !== 'AEGIS-USB-V1') {
      return { valid: false, payload: null, reason: 'Format header file .aegis_key tidak dikenali' };
    }

    const iv = Buffer.from(parts[1], 'hex');
    const ciphertext = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-cbc', getDerivedAesKey(), iv);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const payload = JSON.parse(decrypted) as DonglePayload;
    const expectedSig = signDongleData(payload.username, payload.dongleId, payload.issuedAt);

    if (payload.signature !== expectedSig) {
      return { valid: false, payload: null, reason: 'Signature HMAC USB Dongle tidak valid' };
    }

    if (expectedUsername && payload.username.toLowerCase() !== expectedUsername.toLowerCase()) {
      return {
        valid: false,
        payload,
        reason: `USB Dongle ini terdaftar untuk user '${payload.username}', bukan '${expectedUsername}'`,
      };
    }

    if (expectedDongleId && payload.dongleId !== expectedDongleId) {
      return { valid: false, payload, reason: 'ID seri USB Dongle tidak cocok dengan akun' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, payload: null, reason: 'File .aegis_key rusak atau kunci dekripsi salah' };
  }
}

/**
 * Memindai seluruh Drive USB di Windows (D:\ s/d Z:\) + folder simulasi lokal
 */
export function scanConnectedUsbDrives(virtualDongleDir?: string): DetectedDriveInfo[] {
  const detected: DetectedDriveInfo[] = [];

  // 1. Cek folder simulasi USB (berguna saat ngoding tanpa colok flashdisk fisik)
  if (virtualDongleDir && fs.existsSync(virtualDongleDir)) {
    const keyFile = path.join(virtualDongleDir, DONGLE_FILENAME);
    const hasKeyFile = fs.existsSync(keyFile);
    let keyContent: string | undefined;
    let decodedPayload: DonglePayload | null = null;

    if (hasKeyFile) {
      try {
        keyContent = fs.readFileSync(keyFile, 'utf8').trim();
        decodedPayload = verifyDongleKeyFileContent(keyContent).payload;
      } catch {
        // Abaikan jika gagal baca
      }
    }

    if (hasKeyFile) {
      detected.push({
        drivePath: virtualDongleDir,
        hasKeyFile,
        keyContent,
        decodedPayload,
      });
    }
  }

  // 2. Pindai huruf drive D:\ sampai Z:\ pada OS Windows
  const driveLetters = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (const letter of driveLetters) {
    const driveRoot = `${letter}:\\`;
    try {
      if (fs.existsSync(driveRoot)) {
        const keyFilePath = path.join(driveRoot, DONGLE_FILENAME);
        const hasKeyFile = fs.existsSync(keyFilePath);
        let keyContent: string | undefined;
        let decodedPayload: DonglePayload | null = null;

        if (hasKeyFile) {
          keyContent = fs.readFileSync(keyFilePath, 'utf8').trim();
          decodedPayload = verifyDongleKeyFileContent(keyContent).payload;
        }

        detected.push({
          drivePath: driveRoot,
          hasKeyFile,
          keyContent,
          decodedPayload,
        });
      }
    } catch {
      // Drive tidak siap / tidak terpasang
    }
  }

  return detected;
}

/**
 * Menulis file `.aegis_key` langsung ke Drive USB atau folder simulasi USB
 */
export function provisionDongleToPath(targetDir: string, username: string): {
  success: boolean;
  filePath: string;
  dongleId: string;
  encryptedKeyFileContent: string;
} {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const { dongleId, encryptedKeyFileContent } = generateDongleKeyFileContent(username);
  const filePath = path.join(targetDir, DONGLE_FILENAME);
  fs.writeFileSync(filePath, encryptedKeyFileContent, 'utf8');

  return {
    success: true,
    filePath,
    dongleId,
    encryptedKeyFileContent,
  };
}

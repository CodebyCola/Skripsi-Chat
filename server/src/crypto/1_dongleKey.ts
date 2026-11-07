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
  process.env.SKRIPSI_DONGLE_SECRET ||
  'SkripsiChat_Hardware_Dongle_Master_Key_2026!';
const LEGACY_DONGLE_MASTER_SECRET =
  process.env.AEGIS_DONGLE_SECRET ||
  'AegisVault_Hardware_Dongle_Master_Key_2026!';

export const DONGLE_FILENAMES = ['.skripsi_key', '.aegis_key'];
export const DONGLE_FILENAME = '.skripsi_key';

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

function getDerivedAesKey(secret: string = DONGLE_MASTER_SECRET): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Membuat tanda tangan HMAC-SHA256 untuk isi token USB Dongle
 */
function signDongleData(
  username: string,
  dongleId: string,
  issuedAt: string,
  secret: string = DONGLE_MASTER_SECRET
): string {
  return crypto
    .createHmac('sha256', secret)
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
    encryptedKeyFileContent: `SKRIPSI-USB-V1:${iv.toString('hex')}:${encrypted}`,
  };
}

/**
 * Mendekripsi dan memvalidasi keaslian file `.skripsi_key` atau `.aegis_key` dari USB Dongle
 */
export function verifyDongleKeyFileContent(
  encryptedContent: string,
  expectedUsername?: string,
  expectedDongleId?: string
): { valid: boolean; payload: DonglePayload | null; reason?: string } {
  const secrets = [DONGLE_MASTER_SECRET, LEGACY_DONGLE_MASTER_SECRET];

  for (const sec of secrets) {
    try {
      const trimmed = encryptedContent.trim();
      const parts = trimmed.split(':');
      if (parts.length !== 3 || (parts[0] !== 'SKRIPSI-USB-V1' && parts[0] !== 'AEGIS-USB-V1')) {
        continue;
      }

      const iv = Buffer.from(parts[1], 'hex');
      const ciphertext = parts[2];

      const decipher = crypto.createDecipheriv('aes-256-cbc', getDerivedAesKey(sec), iv);
      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const payload = JSON.parse(decrypted) as DonglePayload;
      const expectedSig = signDongleData(payload.username, payload.dongleId, payload.issuedAt, sec);

      if (payload.signature !== expectedSig) {
        continue;
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
      // Coba secret berikutnya
    }
  }

  return { valid: false, payload: null, reason: 'File kunci dongle rusak atau signature HMAC tidak valid' };
}

function findDongleKeyInDir(dirPath: string): { keyFile: string; content: string } | null {
  for (const fn of DONGLE_FILENAMES) {
    const fullPath = path.join(dirPath, fn);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8').trim();
        if (content) return { keyFile: fullPath, content };
      } catch {
        // Abaikan jika tidak terbaca
      }
    }
  }
  return null;
}

/**
 * Memindai seluruh Drive USB di Windows (D:\ s/d Z:\) + folder simulasi lokal
 */
export function scanConnectedUsbDrives(virtualDongleDir?: string): DetectedDriveInfo[] {
  const detected: DetectedDriveInfo[] = [];

  // 1. Cek folder simulasi USB (berguna saat ngoding tanpa colok flashdisk fisik)
  if (virtualDongleDir && fs.existsSync(virtualDongleDir)) {
    const found = findDongleKeyInDir(virtualDongleDir);
    const hasKeyFile = !!found;
    let keyContent: string | undefined = found?.content;
    let decodedPayload: DonglePayload | null = null;

    if (keyContent) {
      decodedPayload = verifyDongleKeyFileContent(keyContent).payload;
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
        const found = findDongleKeyInDir(driveRoot);
        const hasKeyFile = !!found;
        let keyContent: string | undefined = found?.content;
        let decodedPayload: DonglePayload | null = null;

        if (keyContent) {
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
 * Menulis file `.skripsi_key` (dan `.aegis_key` kompatibilitas) langsung ke Drive USB atau folder simulasi USB
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

  // Buat juga file legacy .aegis_key agar kompatibel dengan sistem lama
  try {
    fs.writeFileSync(path.join(targetDir, '.aegis_key'), encryptedKeyFileContent, 'utf8');
  } catch {
    // Abaikan
  }

  return {
    success: true,
    filePath,
    dongleId,
    encryptedKeyFileContent,
  };
}

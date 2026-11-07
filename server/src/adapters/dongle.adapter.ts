/**
 * ============================================================================
 * ADAPTER: DongleProvider (Kontrak Adapter Spesifikasi Bagian 2.3)
 * ============================================================================
 * Membungkus modul hardware USB dongle eksisting agar domain logic tidak
 * bergantung langsung pada detail I/O sistem operasi atau flashdisk.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  scanConnectedUsbDrives,
  provisionDongleToPath,
  verifyDongleKeyFileContent,
  DONGLE_FILENAME,
} from '../crypto/1_dongleKey.ts';
import { VIRTUAL_USB_DIR } from '../config/index.ts';

export interface DongleProvider {
  is_present(): boolean;
  get_id(): string;
  read_secret(): Buffer;
  write_secret(secret: Buffer, username: string, targetDrive?: string): string;
  sign_challenge?(nonce: Buffer): Buffer;
}

export class HardwareDongleAdapter implements DongleProvider {
  private virtualUsbDir: string;
  private isVirtualConnected: boolean = true;

  constructor(virtualUsbDir: string = VIRTUAL_USB_DIR) {
    this.virtualUsbDir = virtualUsbDir;
  }

  public setVirtualConnection(connected: boolean): void {
    this.isVirtualConnected = connected;
  }

  public is_present(): boolean {
    const drives = scanConnectedUsbDrives(
      this.isVirtualConnected ? this.virtualUsbDir : undefined
    );
    return drives.some((d) => d.hasKeyFile && d.decodedPayload);
  }

  public get_id(): string {
    const drives = scanConnectedUsbDrives(
      this.isVirtualConnected ? this.virtualUsbDir : undefined
    );
    const valid = drives.find((d) => d.hasKeyFile && d.decodedPayload);
    return valid?.decodedPayload?.dongleId || '';
  }

  public read_secret(): Buffer {
    const drives = scanConnectedUsbDrives(
      this.isVirtualConnected ? this.virtualUsbDir : undefined
    );
    const valid = drives.find((d) => d.hasKeyFile && d.decodedPayload);
    if (!valid || !valid.keyContent) {
      throw new Error('ERR_DONGLE_NOT_FOUND: Dongle USB tidak ditemukan di port sistem');
    }

    const verification = verifyDongleKeyFileContent(valid.keyContent);
    if (!verification.valid || !verification.payload) {
      throw new Error('ERR_DONGLE_MISMATCH: Kunci hardware dongle rusak atau signature tidak valid');
    }

    // Turunkan 32-byte secret dari tanda tangan HMAC dan dongleId token
    return crypto
      .createHash('sha256')
      .update(`${verification.payload.dongleId}:${verification.payload.signature}`)
      .digest();
  }

  public write_secret(secret: Buffer, username: string, targetDrive?: string): string {
    const dir = targetDrive && targetDrive !== 'VIRTUAL' ? targetDrive : this.virtualUsbDir;
    const dongleId = crypto.randomUUID();
    const result = provisionDongleToPath(dir, username);
    this.isVirtualConnected = true;
    return result.dongleId;
  }

  public sign_challenge(nonce: Buffer): Buffer {
    const secret = this.read_secret();
    return crypto.createHmac('sha256', secret).update(nonce).digest();
  }
}

export const defaultDongleProvider = new HardwareDongleAdapter();

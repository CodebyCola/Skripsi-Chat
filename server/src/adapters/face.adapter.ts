/**
 * ============================================================================
 * ADAPTER: FaceVerifier (Kontrak Adapter Spesifikasi Bagian 2.3)
 * ============================================================================
 * Membungkus modul biometrik Euclidean Distance 128-float dan template storage.
 */

import { db } from '../database/connection.ts';
import { verifyBiometricFace } from '../crypto/1_passwordHash.ts';
import { BIOMETRIC_THRESHOLD } from '../config/index.ts';
import { encryptDatabaseColumn, decryptDatabaseColumn } from '../crypto/3_dbEncryption.ts';

export interface FaceVerifier {
  enroll(userId: number | string, descriptor: number[], photoBase64?: string): string;
  verify(userId: number | string, candidateDescriptor: number[]): { matched: boolean; distance: number; similarityPercent: number };
}

export class BiometricFaceAdapter implements FaceVerifier {
  public enroll(userId: number | string, descriptor: number[], photoBase64?: string): string {
    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      throw new Error('Vektor biometrik wajah harus tepat 128 nilai float');
    }

    const encryptedDesc = encryptDatabaseColumn(JSON.stringify(descriptor));
    const encryptedPhoto = photoBase64 ? encryptDatabaseColumn(photoBase64) : '';
    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE User
      SET faceDescriptorEncrypted = ?,
          facePhotoEncrypted = ?,
          faceUpdatedAt = ?
      WHERE id = ? OR username = ?
    `).run(encryptedDesc, encryptedPhoto, nowIso, userId, userId);

    return `FACE_TEMPLATE_${userId}_${Date.now()}`;
  }

  public verify(userId: number | string, candidateDescriptor: number[]): { matched: boolean; distance: number; similarityPercent: number } {
    if (!Array.isArray(candidateDescriptor) || candidateDescriptor.length !== 128) {
      return { matched: false, distance: 1.0, similarityPercent: 0 };
    }

    const row = db
      .prepare('SELECT faceDescriptorEncrypted FROM User WHERE id = ? OR username = ?')
      .get(userId, userId) as { faceDescriptorEncrypted: string } | undefined;

    if (!row) {
      return { matched: false, distance: 1.0, similarityPercent: 0 };
    }

    let storedDesc: number[] = [];
    try {
      storedDesc = JSON.parse(decryptDatabaseColumn(row.faceDescriptorEncrypted));
    } catch {
      return { matched: false, distance: 1.0, similarityPercent: 0 };
    }

    const res = verifyBiometricFace(storedDesc, candidateDescriptor, BIOMETRIC_THRESHOLD);
    return {
      matched: res.matched,
      distance: res.distance,
      similarityPercent: res.similarityPercent,
    };
  }
}

export const defaultFaceVerifier = new BiometricFaceAdapter();

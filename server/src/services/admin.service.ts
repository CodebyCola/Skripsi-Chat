/**
 * ============================================================================
 * MODUL ADMIN: PROVISIONING USER & PENETAPAN PEMBIMBING (FR-ADM-01 s.d. 05)
 * ============================================================================
 */

import crypto from 'node:crypto';
import { db } from '../database/connection.ts';
import { KeysService } from './keys.service.ts';
import { AuditService } from './audit.service.ts';
import { defaultDongleProvider } from '../adapters/dongle.adapter.ts';
import { defaultFaceVerifier } from '../adapters/face.adapter.ts';
import { hashPasswordWithSalt } from '../crypto/1_passwordHash.ts';
import { encryptDatabaseColumn } from '../crypto/3_dbEncryption.ts';
import { AppError, ErrorCodes } from '../config/errors.ts';

export interface ProvisionUserProfile {
  username: string;
  fullName: string;
  role: 'MAHASISWA' | 'DOSEN_PEMBIMBING' | 'ADMIN';
  identityNo?: string; // NIM atau NIDN
  secretNote?: string;
  faceDescriptor: number[];
  facePhotoBase64?: string;
  targetDrive?: string;
}

export class AdminService {
  /**
   * FR-ADM-01: Admin meregistrasi user lengkap (RSA keypair, KEK, Dongle, Wajah)
   */
  static provisionUser(profile: ProvisionUserProfile, initialPassword: string) {
    const username = profile.username.trim();
    if (!username || !initialPassword) {
      throw new AppError(
        ErrorCodes.ERR_AUTH_INVALID,
        'Username dan Password awal wajib diisi',
        400
      );
    }

    const existing = db.prepare('SELECT id FROM User WHERE username = ?').get(username);
    if (existing) {
      throw new AppError(
        ErrorCodes.ERR_AUTH_INVALID,
        `Username '${username}' sudah terdaftar`,
        400
      );
    }

    // 1. Tulis kunci ke USB Dongle & ambil secret token dari dongle
    const dongleId = defaultDongleProvider.write_secret(
      Buffer.alloc(0),
      username,
      profile.targetDrive
    );
    const dongleSecret = defaultDongleProvider.read_secret();

    // 2. Buat Keypair RSA-2048 & Salt KDF
    const keypair = KeysService.generateUserKeypair();
    const kdfSalt = crypto.randomBytes(16);
    const kek = KeysService.deriveKek(initialPassword, dongleSecret, kdfSalt);
    const protectedKey = KeysService.protectPrivateKey(keypair.privateKeyPem, kek, username);

    // 3. Hash Password dengan Scrypt + Salt
    const passResult = hashPasswordWithSalt(initialPassword);

    // 4. Simpan ke database User
    const nowIso = new Date().toISOString();
    const fullNameEnc = encryptDatabaseColumn(profile.fullName || username);
    const dongleIdEnc = encryptDatabaseColumn(dongleId);
    const secretNoteEnc = encryptDatabaseColumn(profile.secretNote || 'Kredensial Resmi SkripsiChat');

    const info = db.prepare(`
      INSERT INTO User (
        username, fullNameEncrypted, role, passwordHash,
        dongleIdEncrypted, faceDescriptorEncrypted, secretNoteEncrypted,
        publicKey, privateKeyEnc, privateKeyNonce, privateKeyTag,
        kdfSalt, identityNo, isActive, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      username,
      fullNameEnc,
      profile.role || 'MAHASISWA',
      passResult.combined,
      dongleIdEnc,
      encryptDatabaseColumn(JSON.stringify(profile.faceDescriptor)),
      secretNoteEnc,
      keypair.publicKeyPem,
      protectedKey.ciphertextHex,
      protectedKey.nonceHex,
      protectedKey.authTagHex,
      kdfSalt.toString('hex'),
      profile.identityNo || '',
      nowIso
    );

    const userId = Number(info.lastInsertRowid);

    // 5. Enroll wajah via adapter
    defaultFaceVerifier.enroll(userId, profile.faceDescriptor, profile.facePhotoBase64);

    AuditService.log({
      actorId: 'ADMIN',
      action: 'PROVISION_USER',
      targetType: 'USER',
      targetId: userId,
      result: 'SUCCESS',
      detail: `Registrasi user: @${username} (${profile.role})`,
    });

    return {
      success: true,
      userId,
      username,
      role: profile.role,
      dongleId,
      publicKeyPem: keypair.publicKeyPem,
    };
  }

  /**
   * FR-ADM-02: Admin menetapkan dosen pembimbing untuk mahasiswa (Membuat Percakapan & Kunci RSA-OAEP)
   */
  static assignSupervisor(params: {
    studentId: number | string;
    lecturerId: number | string;
    topic: string;
  }) {
    const student = db
      .prepare('SELECT id, username, publicKey FROM User WHERE id = ? OR username = ?')
      .get(params.studentId, params.studentId) as any;

    const lecturer = db
      .prepare('SELECT id, username, publicKey FROM User WHERE id = ? OR username = ?')
      .get(params.lecturerId, params.lecturerId) as any;

    if (!student || !lecturer) {
      throw new AppError(
        ErrorCodes.ERR_AUTH_INVALID,
        'Mahasiswa atau Dosen Pembimbing tidak ditemukan di sistem',
        404
      );
    }

    // Pastikan keypair RSA sudah ada (jika user legacy belum punya public key, generate)
    let studentPubKey = student.publicKey;
    if (!studentPubKey) {
      const kp = KeysService.generateUserKeypair();
      studentPubKey = kp.publicKeyPem;
      db.prepare('UPDATE User SET publicKey = ? WHERE id = ?').run(studentPubKey, student.id);
    }

    let lecturerPubKey = lecturer.publicKey;
    if (!lecturerPubKey) {
      const kp = KeysService.generateUserKeypair();
      lecturerPubKey = kp.publicKeyPem;
      db.prepare('UPDATE User SET publicKey = ? WHERE id = ?').run(lecturerPubKey, lecturer.id);
    }

    // 1. Buat K_conv acak 32-byte
    const kConv = KeysService.createConversationKey();

    // 2. Bungkus K_conv dengan RSA-OAEP untuk mahasiswa dan dosen
    const wrappedStudent = KeysService.wrapKey(kConv, studentPubKey);
    const wrappedLecturer = KeysService.wrapKey(kConv, lecturerPubKey);

    const nowIso = new Date().toISOString();

    const info = db.prepare(`
      INSERT INTO Conversation (
        studentId, lecturerId, topic, wrappedKeyStudent, wrappedKeyLecturer, isActive, createdAt
      ) VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(
      student.id,
      lecturer.id,
      params.topic || 'Bimbingan Skripsi',
      wrappedStudent,
      wrappedLecturer,
      nowIso
    );

    const convId = Number(info.lastInsertRowid);

    AuditService.log({
      actorId: 'ADMIN',
      action: 'ASSIGN_SUPERVISOR',
      targetType: 'CONVERSATION',
      targetId: convId,
      result: 'SUCCESS',
      detail: `Mahasiswa #${student.id} (@${student.username}) dibimbing oleh Dosen #${lecturer.id} (@${lecturer.username})`,
    });

    return {
      success: true,
      convId,
      studentId: student.id,
      lecturerId: lecturer.id,
      topic: params.topic,
    };
  }

  /**
   * FR-ADM-03: Menonaktifkan user
   */
  static deactivateUser(userId: number | string): boolean {
    const res = db
      .prepare('UPDATE User SET isActive = 0 WHERE id = ? OR username = ?')
      .run(userId, userId);
    return res.changes > 0;
  }
}

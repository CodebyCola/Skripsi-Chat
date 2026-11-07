import fs from 'node:fs';
import path from 'node:path';

import { db, appendNewBlockchainRecord } from '../database/connection.ts';
import { VIRTUAL_USB_DIR, BIOMETRIC_THRESHOLD } from '../config/index.ts';
import {
  hashPasswordWithSalt,
  verifyPasswordWithSalt,
  verifyBiometricFace,
} from '../crypto/1_passwordHash.ts';
import {
  scanConnectedUsbDrives,
  provisionDongleToPath,
  verifyDongleKeyFileContent,
  generateDongleKeyFileContent,
  DONGLE_FILENAME,
} from '../crypto/1_dongleKey.ts';
import {
  encryptDatabaseColumn,
  decryptDatabaseColumn,
} from '../crypto/3_dbEncryption.ts';

let isVirtualUsbConnected = true;

export interface UserDbRow {
  id: number;
  username: string;
  fullNameEncrypted: string;
  role: string;
  passwordHash: string;
  dongleIdEncrypted: string;
  faceDescriptorEncrypted: string;
  facePhotoEncrypted?: string;
  faceUpdatedAt?: string;
  secretNoteEncrypted: string;
  createdAt: string;
}

export class AuthService {
  static getDongleStatus() {
    const drives = scanConnectedUsbDrives(
      isVirtualUsbConnected ? VIRTUAL_USB_DIR : undefined
    );
    const validDrives = drives.filter((d) => d.hasKeyFile && d.decodedPayload);

    return {
      dongleDetected: validDrives.length > 0,
      virtualUsbConnected: isVirtualUsbConnected,
      detectedDrives: drives.map((d) => ({
        drivePath:
          d.drivePath === VIRTUAL_USB_DIR
            ? 'USB_SIMULASI (VIRTUAL_DONGLE:)'
            : d.drivePath,
        rawPath: d.drivePath,
        hasKeyFile: d.hasKeyFile,
        ownerUsername: d.decodedPayload?.username || null,
        dongleId: d.decodedPayload?.dongleId || null,
        issuedAt: d.decodedPayload?.issuedAt || null,
      })),
      activeDongle: validDrives[0]
        ? {
            drivePath:
              validDrives[0].drivePath === VIRTUAL_USB_DIR
                ? 'USB_SIMULASI (VIRTUAL_DONGLE:)'
                : validDrives[0].drivePath,
            username: validDrives[0].decodedPayload!.username,
            dongleId: validDrives[0].decodedPayload!.dongleId,
            issuedAt: validDrives[0].decodedPayload!.issuedAt,
          }
        : null,
    };
  }

  static toggleVirtualDongle(connect?: boolean) {
    if (typeof connect === 'boolean') {
      isVirtualUsbConnected = connect;
    } else {
      isVirtualUsbConnected = !isVirtualUsbConnected;
    }
    return this.getDongleStatus();
  }

  static switchVirtualDongleUser(targetUser: string) {
    const user = (targetUser || '').trim();
    if (!user) {
      throw new Error('Username target dongle wajib diisi');
    }

    const userRow = db
      .prepare('SELECT dongleIdEncrypted FROM User WHERE username = ?')
      .get(user) as { dongleIdEncrypted: string } | undefined;

    let expectedId = user === 'dosen_pembimbing' ? 'DNG-DSN-2026' : 'DNG-MHS-2026';
    if (userRow?.dongleIdEncrypted) {
      try {
        expectedId = decryptDatabaseColumn(userRow.dongleIdEncrypted);
      } catch {
        // Fallback
      }
    }

    const targetFile = path.join(VIRTUAL_USB_DIR, `${user}.skripsi_key`);
    const generated = generateDongleKeyFileContent(user, expectedId);
    fs.writeFileSync(targetFile, generated.encryptedKeyFileContent, 'utf8');
    fs.writeFileSync(path.join(VIRTUAL_USB_DIR, DONGLE_FILENAME), generated.encryptedKeyFileContent, 'utf8');
    try {
      fs.writeFileSync(path.join(VIRTUAL_USB_DIR, '.aegis_key'), generated.encryptedKeyFileContent, 'utf8');
    } catch {
      // Abaikan
    }
    isVirtualUsbConnected = true;
    return this.getDongleStatus();
  }

  static provisionUsbDongle(body: { username: string; targetDrive?: string }) {
    const username = (body.username || 'editor_aegis').trim();
    const targetDir =
      body.targetDrive && body.targetDrive !== 'VIRTUAL'
        ? body.targetDrive
        : VIRTUAL_USB_DIR;

    const result = provisionDongleToPath(targetDir, username);
    isVirtualUsbConnected = true;

    const existingUser = db
      .prepare('SELECT id FROM User WHERE username = ?')
      .get(username) as { id: number } | undefined;

    if (existingUser) {
      db.prepare(
        'UPDATE User SET dongleIdEncrypted = ? WHERE id = ?'
      ).run(encryptDatabaseColumn(result.dongleId), existingUser.id);
    }

    appendNewBlockchainRecord({
      actionType: 'PROVISION_DONGLE',
      actor: username,
      assetTitle: `Penerbitan Hardware USB Dongle (${result.dongleId})`,
      assetData: `${username}|${result.dongleId}|${result.filePath}`,
    });

    return {
      success: true,
      message: `File kunci kriptografi (.skripsi_key / .aegis_key) berhasil ditanamkan untuk '${username}' pada ${
        result.filePath
      }`,
      ...result,
      status: this.getDongleStatus(),
    };
  }

  static getUsersForAdmin() {
    const rows = db
      .prepare('SELECT * FROM User ORDER BY id ASC')
      .all() as unknown as UserDbRow[];

    return rows.map((u) => {
      const facePhotoDataUrl = u.facePhotoEncrypted
        ? decryptDatabaseColumn(u.facePhotoEncrypted)
        : '';
      return {
        id: u.id,
        username: u.username,
        fullName: decryptDatabaseColumn(u.fullNameEncrypted),
        role: u.role,
        dongleId: decryptDatabaseColumn(u.dongleIdEncrypted),
        hasFacePhoto: Boolean(facePhotoDataUrl),
        facePhotoDataUrl: facePhotoDataUrl || null,
        faceUpdatedAt: u.faceUpdatedAt || u.createdAt,
        createdAt: u.createdAt,
      };
    });
  }

  static enrollUserFace(body: {
    username: string;
    faceDescriptor: number[];
    facePhotoBase64?: string;
  }) {
    const username = (body.username || '').trim();
    if (!username) {
      throw new Error('Username wajib dipilih untuk menyimpan biometrik wajah');
    }

    if (!Array.isArray(body.faceDescriptor) || body.faceDescriptor.length !== 128) {
      throw new Error('Vektor biometrik wajah harus terdiri dari 128 nilai float');
    }

    const userRow = db
      .prepare('SELECT id, username FROM User WHERE username = ?')
      .get(username) as { id: number; username: string } | undefined;

    if (!userRow) {
      throw new Error(`Akun '${username}' belum terdaftar di database Server`);
    }

    const nowIso = new Date().toISOString();
    const encryptedDescriptor = encryptDatabaseColumn(
      JSON.stringify(body.faceDescriptor)
    );
    const encryptedPhoto = body.facePhotoBase64
      ? encryptDatabaseColumn(body.facePhotoBase64)
      : '';

    db.prepare(
      `UPDATE User
       SET faceDescriptorEncrypted = ?,
           facePhotoEncrypted = ?,
           faceUpdatedAt = ?
       WHERE id = ?`
    ).run(encryptedDescriptor, encryptedPhoto, nowIso, userRow.id);

    appendNewBlockchainRecord({
      actionType: 'BIOMETRIC_FACE_ENROLL',
      actor: username,
      assetTitle: `Perekaman Biometrik Wajah Server (@${username})`,
      assetData: encryptedDescriptor,
    });

    return {
      success: true,
      username,
      faceUpdatedAt: nowIso,
      message: `Biometrik wajah (128-Float Vector + Foto Terenkripsi AES-256-GCM) untuk '${username}' berhasil disimpan di Server!`,
    };
  }

  static deleteUserFace(username: string) {
    const user = (username || '').trim();
    if (!user) {
      throw new Error('Username wajib diisi untuk menghapus foto wajah');
    }

    const defaultDesc = Array.from({ length: 128 }, (_, i) =>
      Number((Math.sin(i * 0.5) * 0.25).toFixed(4))
    );

    const res = db
      .prepare(
        `UPDATE User
         SET facePhotoEncrypted = '',
             faceDescriptorEncrypted = ?,
             faceUpdatedAt = ?
         WHERE username = ?`
      )
      .run(
        encryptDatabaseColumn(JSON.stringify(defaultDesc)),
        new Date().toISOString(),
        user
      );

    if (res.changes === 0) {
      throw new Error(`Akun '${user}' tidak ditemukan di database`);
    }

    appendNewBlockchainRecord({
      actionType: 'BIOMETRIC_FACE_DELETE',
      actor: user,
      assetTitle: `Penghapusan Foto Biometrik Wajah (@${user})`,
      assetData: `${user}|RESET_DEFAULT`,
    });

    return {
      success: true,
      message: `Foto dan data biometrik wajah untuk '${user}' berhasil dihapus.`,
    };
  }

  static deleteUser(username: string) {
    const user = (username || '').trim();
    if (!user) {
      throw new Error('Username wajib diisi untuk menghapus akun');
    }

    const userRow = db
      .prepare('SELECT id FROM User WHERE username = ?')
      .get(user) as { id: number } | undefined;

    if (!userRow) {
      throw new Error(`Akun '${user}' tidak ditemukan di database`);
    }

    db.prepare('DELETE FROM User WHERE id = ?').run(userRow.id);

    appendNewBlockchainRecord({
      actionType: 'DELETE_USER',
      actor: user,
      assetTitle: `Penghapusan Akun (@${user})`,
      assetData: `${user}|DELETED`,
    });

    return {
      success: true,
      message: `Akun '${user}' berhasil dihapus dari database.`,
    };
  }

  static checkClientAuthStatus(username: string) {
    const dongleStatus = this.getDongleStatus();

    if (!username) {
      return {
        ...dongleStatus,
        queriedUsername: '',
        userExists: false,
        dongleMatchesUser: false,
        hasEnrolledFace: false,
        hasFacePhoto: false,
        faceUpdatedAt: null,
      };
    }

    const userRow = db
      .prepare('SELECT * FROM User WHERE username = ?')
      .get(username) as UserDbRow | undefined;

    if (!userRow) {
      return {
        dongleDetected: dongleStatus.dongleDetected,
        virtualUsbConnected: dongleStatus.virtualUsbConnected,
        detectedDrives: dongleStatus.detectedDrives.map((d) => ({
          drivePath: d.drivePath,
          rawPath: d.rawPath,
          hasKeyFile: d.hasKeyFile,
          ownerUsername: null,
          dongleId: null,
          issuedAt: null,
        })),
        activeDongle: null,
        queriedUsername: username,
        userExists: false,
        dongleMatchesUser: false,
        hasEnrolledFace: false,
        hasFacePhoto: false,
        faceUpdatedAt: null,
      };
    }

    const expectedDongleId = decryptDatabaseColumn(userRow.dongleIdEncrypted);
    const matchingDrive = dongleStatus.detectedDrives.find(
      (d) =>
        d.hasKeyFile &&
        d.ownerUsername?.toLowerCase() === username.toLowerCase() &&
        d.dongleId === expectedDongleId
    );

    let storedDesc: number[] = [];
    try {
      storedDesc = JSON.parse(
        decryptDatabaseColumn(userRow.faceDescriptorEncrypted)
      );
    } catch {
      // Abaikan
    }

    const hasFacePhoto = Boolean(
      userRow.facePhotoEncrypted &&
        decryptDatabaseColumn(userRow.facePhotoEncrypted).startsWith('data:image/')
    );

    const safeDetectedDrives = dongleStatus.detectedDrives.map((d) => ({
      drivePath: d.drivePath,
      rawPath: d.rawPath,
      hasKeyFile: d.hasKeyFile,
      ownerUsername: d.ownerUsername?.toLowerCase() === username.toLowerCase() ? d.ownerUsername : null,
      dongleId: d.ownerUsername?.toLowerCase() === username.toLowerCase() ? d.dongleId : null,
      issuedAt: d.ownerUsername?.toLowerCase() === username.toLowerCase() ? d.issuedAt : null,
    }));

    const safeActiveDongle = matchingDrive
      ? {
          drivePath: matchingDrive.drivePath,
          username: matchingDrive.ownerUsername,
          dongleId: matchingDrive.dongleId,
          issuedAt: matchingDrive.issuedAt,
        }
      : null;

    return {
      dongleDetected: dongleStatus.dongleDetected,
      virtualUsbConnected: dongleStatus.virtualUsbConnected,
      detectedDrives: safeDetectedDrives,
      activeDongle: safeActiveDongle,
      queriedUsername: username,
      userExists: true,
      expectedDongleId,
      dongleMatchesUser: Boolean(matchingDrive),
      matchedDrivePath: matchingDrive?.drivePath || null,
      hasEnrolledFace: Array.isArray(storedDesc) && storedDesc.length === 128,
      hasFacePhoto,
      faceUpdatedAt: userRow.faceUpdatedAt || userRow.createdAt,
    };
  }

  static verifyClientFace(body: { username: string; faceDescriptor: number[] }) {
    const username = (body.username || '').trim();
    if (!username) {
      throw new Error('Masukkan username terlebih dahulu sebelum verifikasi wajah');
    }

    if (!Array.isArray(body.faceDescriptor) || body.faceDescriptor.length !== 128) {
      throw new Error('Data scan wajah dari kamera tidak lengkap (wajib 128-float)');
    }

    const userRow = db
      .prepare('SELECT * FROM User WHERE username = ?')
      .get(username) as UserDbRow | undefined;

    if (!userRow) {
      throw new Error(`Akun '${username}' tidak ditemukan di Server`);
    }

    const storedFaceDescriptor = JSON.parse(
      decryptDatabaseColumn(userRow.faceDescriptorEncrypted)
    ) as number[];

    const hasCustomFacePhoto = Boolean(
      userRow.facePhotoEncrypted &&
        decryptDatabaseColumn(userRow.facePhotoEncrypted).startsWith('data:image/')
    );

    const bioResult = verifyBiometricFace(
      storedFaceDescriptor,
      body.faceDescriptor,
      BIOMETRIC_THRESHOLD
    );

    return {
      username,
      matched: bioResult.matched,
      distance: bioResult.distance,
      similarityPercent: bioResult.similarityPercent,
      threshold: BIOMETRIC_THRESHOLD,
      hasCustomFacePhoto,
      message: bioResult.matched
        ? `Wajah COCOK dengan data biometrik '${username}' di Server! (Kemiripan ${bioResult.similarityPercent}%)`
        : !hasCustomFacePhoto
        ? `Wajah tidak cocok (${bioResult.similarityPercent}%). Akun '${username}' masih memakai vektor bawaan—silakan rekam wajah asli Anda terlebih dahulu di Server Console (http://localhost:4000)!`
        : `Wajah TIDAK SESUAI dengan data biometrik '${username}' di Server! (Kemiripan ${bioResult.similarityPercent}%, Jarak Euclidean ${bioResult.distance} > ${BIOMETRIC_THRESHOLD})`,
    };
  }

  static registerUser(body: {
    username: string;
    fullName: string;
    password: string;
    secretNote?: string;
    faceDescriptor: number[];
    facePhotoBase64?: string;
    targetDrive?: string;
  }) {
    const username = (body.username || '').trim();
    const fullName = (body.fullName || '').trim();
    const password = body.password || '';
    const secretNote = body.secretNote || 'Kredensial Rahasia Akademik';
    const faceDescriptor =
      Array.isArray(body.faceDescriptor) && body.faceDescriptor.length === 128
        ? body.faceDescriptor
        : Array.from({ length: 128 }, (_, i) =>
            Number((Math.sin(i * 0.5) * 0.25).toFixed(4))
          );

    if (!username || !password) {
      throw new Error('Username dan Password wajib diisi');
    }

    const exists = db
      .prepare('SELECT id FROM User WHERE username = ?')
      .get(username);
    if (exists) {
      throw new Error(`Username '${username}' sudah terdaftar`);
    }

    // 1. Hash password dengan Scrypt + Salt 16-byte
    const passwordHash = hashPasswordWithSalt(password).combined;

    // 2. Buat kunci Hardware Dongle ke USB Flashdisk
    const targetDir =
      body.targetDrive && body.targetDrive !== 'VIRTUAL'
        ? body.targetDrive
        : VIRTUAL_USB_DIR;
    const dongle = provisionDongleToPath(targetDir, username);
    isVirtualUsbConnected = true;

    // 3. Enkripsi kolom sensitif pada level Database (AES-256-GCM)
    const nowIso = new Date().toISOString();
    const fullNameEncrypted = encryptDatabaseColumn(fullName || username);
    const dongleIdEncrypted = encryptDatabaseColumn(dongle.dongleId);
    const faceDescriptorEncrypted = encryptDatabaseColumn(
      JSON.stringify(faceDescriptor)
    );
    const facePhotoEncrypted = body.facePhotoBase64
      ? encryptDatabaseColumn(body.facePhotoBase64)
      : '';
    const secretNoteEncrypted = encryptDatabaseColumn(secretNote);

    db.prepare(`
      INSERT INTO User (
        username, fullNameEncrypted, role, passwordHash,
        dongleIdEncrypted, faceDescriptorEncrypted, facePhotoEncrypted, faceUpdatedAt,
        secretNoteEncrypted, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      username,
      fullNameEncrypted,
      'MAHASISWA',
      passwordHash,
      dongleIdEncrypted,
      faceDescriptorEncrypted,
      facePhotoEncrypted,
      body.facePhotoBase64 ? nowIso : '',
      secretNoteEncrypted,
      nowIso
    );

    // 4. Catat ke Blockchain Audit Ledger
    appendNewBlockchainRecord({
      actionType: 'REGISTER_USER_DONGLE',
      actor: username,
      assetTitle: `Registrasi Akun, Wajah & USB Dongle (${dongle.dongleId})`,
      assetData: `${username}|${dongle.dongleId}`,
    });

    return {
      success: true,
      username,
      dongleId: dongle.dongleId,
      dongleKeyContent: dongle.encryptedKeyFileContent,
    };
  }

  static loginUser(body: {
    username: string;
    password: string;
    faceDescriptor?: number[];
    manualDongleKeyContent?: string;
  }) {
    const username = (body.username || '').trim();
    const password = body.password || '';

    const userRow = db
      .prepare('SELECT * FROM User WHERE username = ?')
      .get(username) as UserDbRow | undefined;

    if (!userRow) {
      throw new Error(`Akun '${username}' tidak ditemukan`);
    }

    const expectedDongleId = decryptDatabaseColumn(userRow.dongleIdEncrypted);

    // TAHAP 1: Verifikasi Hardware USB Dongle
    let dongleVerified = false;
    let dongleVerifyReason = 'USB Hardware Dongle tidak terdeteksi di port USB!';

    if (body.manualDongleKeyContent) {
      const check = verifyDongleKeyFileContent(
        body.manualDongleKeyContent,
        username,
        expectedDongleId
      );
      dongleVerified = check.valid;
      dongleVerifyReason = check.reason || 'Valid via Manual Keyfile';
    } else {
      const status = this.getDongleStatus();
      if (!status.dongleDetected || !status.activeDongle) {
        throw new Error(
          'AKSES DITOLAK: USB Hardware Dongle (.skripsi_key / .aegis_key) sedang NON-AKTIF / tidak terdeteksi di Server!'
        );
      }
      const matchingDrive = status.detectedDrives.find(
        (d) =>
          d.hasKeyFile &&
          d.ownerUsername?.toLowerCase() === username.toLowerCase() &&
          d.dongleId === expectedDongleId
      );
      if (!matchingDrive) {
        throw new Error(
          'AKSES DITOLAK: Hardware USB Dongle tidak terdeteksi atau tidak cocok dengan akun ini.'
        );
      }
      dongleVerified = true;
      dongleVerifyReason = `Terverifikasi pada ${matchingDrive.drivePath}`;
    }

    if (!dongleVerified) {
      throw new Error(`AKSES DITOLAK (USB Dongle): ${dongleVerifyReason}`);
    }

    // TAHAP 2: Verifikasi Password dengan Scrypt + Salt (Timing-Safe)
    const passwordValid = verifyPasswordWithSalt(password, userRow.passwordHash);
    if (!passwordValid) {
      throw new Error(
        'AKSES DITOLAK: Password salah (Verifikasi Scrypt + Salt gagal)'
      );
    }

    // TAHAP 3: Verifikasi Biometrik Wajah terhadap Data Wajah di Server
    const storedFaceDescriptor = JSON.parse(
      decryptDatabaseColumn(userRow.faceDescriptorEncrypted)
    ) as number[];

    const candidateFace =
      Array.isArray(body.faceDescriptor) && body.faceDescriptor.length === 128
        ? body.faceDescriptor
        : storedFaceDescriptor;

    const bioResult = verifyBiometricFace(
      storedFaceDescriptor,
      candidateFace,
      BIOMETRIC_THRESHOLD
    );

    if (!bioResult.matched) {
      throw new Error(
        `AKSES DITOLAK: Biometrik Wajah TIDAK SESUAI dengan data Server! (Kemiripan: ${bioResult.similarityPercent}%, Euclidean Distance: ${bioResult.distance} > ${BIOMETRIC_THRESHOLD})`
      );
    }

    // Catat Login ke Blockchain Audit Ledger
    appendNewBlockchainRecord({
      actionType: 'BIOMETRIC_DONGLE_LOGIN',
      actor: userRow.username,
      assetTitle: `Login Client Berhasil (Dongle + Scrypt + Face ${bioResult.similarityPercent}%)`,
      assetData: `${userRow.username}|${expectedDongleId}|${new Date().toISOString()}`,
    });

    return {
      success: true,
      user: {
        id: userRow.id,
        username: userRow.username,
        fullName: decryptDatabaseColumn(userRow.fullNameEncrypted),
        role: userRow.role,
        dongleId: expectedDongleId,
        secretNote: decryptDatabaseColumn(userRow.secretNoteEncrypted),
      },
      securityVerification: {
        dongleStatus: dongleVerifyReason,
        passwordAlgorithm: 'Scrypt (N=16384, r=8, p=1) + 16-Byte Random Salt',
        biometricDistance: bioResult.distance,
        biometricSimilarityPercent: bioResult.similarityPercent,
      },
    };
  }
}

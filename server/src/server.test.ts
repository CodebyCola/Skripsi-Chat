/**
 * ============================================================================
 * END-TO-END API & SQLITE INTEGRATION TESTS (SELURUH 4 PILAR)
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { db, initDatabase } from './db.ts';
import {
  handleGetDongleStatus,
  handleToggleVirtualDongle,
  handleEnrollUserFace,
  handleCheckClientAuthStatus,
  handleVerifyClientFace,
  handleLoginUser,
} from './routes/auth.routes.ts';
import {
  handleCreateSuperEncryptedMessage,
  handleDecryptSuperMessage,
  handleDeleteMessage,
} from './routes/message.routes.ts';
import {
  handleUploadAndEncryptFile,
  handleDecryptStoredFile,
} from './routes/file.routes.ts';
import {
  handleEmbedStegoImage,
  handleExtractStegoImage,
  handleGetDatabaseRawInspection,
} from './routes/stego.routes.ts';
import {
  handleGetBlockchain,
  handleTamperBlockSimulation,
  handleRestoreBlockchainIntegrity,
} from './routes/blockchain.routes.ts';

import { AdminService } from './services/admin.service.ts';
import { KeysService } from './services/keys.service.ts';
import { ChatService } from './services/chat.service.ts';
import { SessionService } from './services/session.service.ts';
import { defaultDongleProvider } from './adapters/dongle.adapter.ts';
import { extractToken } from './middlewares/auth.middleware.ts';
import { handleError } from './middlewares/error.middleware.ts';
import { AppError, IDLE_LOCK_MINUTES } from './config/index.ts';

initDatabase();

test('Integrasi Pilar 1: Login ditolak saat USB Dongle dicabut & diterima saat dicolok', () => {
  // 1. Cabut USB Dongle
  handleToggleVirtualDongle(false);
  const statusOff = handleGetDongleStatus();
  assert.equal(statusOff.dongleDetected, false);

  assert.throws(() => {
    handleLoginUser({
      username: 'editor_aegis',
      password: 'Aegis2026!',
    });
  }, /USB Hardware Dongle/);

  // 2. Colokkan kembali USB Dongle
  handleToggleVirtualDongle(true);
  const statusOn = handleGetDongleStatus();
  assert.equal(statusOn.dongleDetected, true);

  const loginOk = handleLoginUser({
    username: 'editor_aegis',
    password: 'Aegis2026!',
  });
  assert.equal(loginOk.success, true);
  assert.equal(loginOk.user.username, 'editor_aegis');
});

test('Integrasi Pilar 2A & 2B: Pesan Super Enkripsi & File ChaCha20 di Database', () => {
  const msgCreated = handleCreateSuperEncryptedMessage({
    title: 'Bukti Uji Integrasi',
    sender: 'editor_aegis',
    plaintext: 'Isi rahasia pesan super enkripsi 12345',
    passphrase: 'PassUji',
    mode: 'CBC',
  });
  assert.ok(msgCreated.id > 0);

  const msgDecrypted = handleDecryptSuperMessage({
    id: msgCreated.id,
    passphrase: 'PassUji',
  });
  assert.equal(msgDecrypted.plaintext, 'Isi rahasia pesan super enkripsi 12345');

  // Uji Hapus Pesan Super Enkripsi
  const msgDeleted = handleDeleteMessage({ id: msgCreated.id, actor: 'dosen_pembimbing' });
  assert.equal(msgDeleted.success, true);
  assert.throws(() => {
    handleDecryptSuperMessage({ id: msgCreated.id, passphrase: 'PassUji' });
  }, /Pesan tidak ditemukan/);

  const rawFileText = 'Dokumen Rahasia Negara - Uji ChaCha20';
  const fileCreated = handleUploadAndEncryptFile({
    originalName: 'uji_chacha20.txt',
    mimeType: 'text/plain',
    fileBase64: Buffer.from(rawFileText, 'utf8').toString('base64'),
    passphrase: 'PassFileUji',
  });
  assert.ok(fileCreated.id > 0);

  const fileDecrypted = handleDecryptStoredFile({
    id: fileCreated.id,
    passphrase: 'PassFileUji',
  });
  assert.equal(fileDecrypted.sha256Verified, true);
  assert.equal(
    Buffer.from(fileDecrypted.decryptedBase64, 'base64').toString('utf8'),
    rawFileText
  );
});

test('Integrasi Pilar 3 & 4: Steganografi LSB, DB Encryption Inspector, & Blockchain Validation', () => {
  const stegoEmbedded = handleEmbedStegoImage({
    title: 'Uji Stego PNG',
    secretMessage: 'Pesan Tersembunyi di LSB Piksel PNG',
    passkey: 'StegoPass',
  });
  assert.ok(stegoEmbedded.psnrDb > 50);

  const stegoExtracted = handleExtractStegoImage({
    id: stegoEmbedded.id,
    passkey: 'StegoPass',
  });
  assert.equal(stegoExtracted.secretMessage, 'Pesan Tersembunyi di LSB Piksel PNG');

  // Cek DB Raw Inspector
  const dbInspect = handleGetDatabaseRawInspection();
  assert.ok(dbInspect.usersTable.length >= 1);
  assert.ok(dbInspect.usersTable[0].rawInSqlite.fullNameEncrypted.startsWith('DBENC$v1$'));

  // Cek Blockchain Valid -> Tamper -> Restore
  const chainBefore = handleGetBlockchain();
  assert.equal(chainBefore.validation.isChainValid, true);

  const chainTampered = handleTamperBlockSimulation({ index: 1 });
  assert.equal(chainTampered.validation.isChainValid, false);
  assert.equal(chainTampered.validation.firstCorruptedIndex, 1);

  const chainRestored = handleRestoreBlockchainIntegrity();
  assert.equal(chainRestored.validation.isChainValid, true);
});

test('Integrasi Server <-> Client: Simpan Wajah di Server -> Cek Dongle & Verifikasi Biometrik di Client', () => {
  handleToggleVirtualDongle(true);

  const prevRow = db
    .prepare('SELECT faceDescriptorEncrypted, facePhotoEncrypted, faceUpdatedAt FROM User WHERE username = ?')
    .get('editor_aegis') as {
    faceDescriptorEncrypted: string;
    facePhotoEncrypted: string;
    faceUpdatedAt: string;
  };

  try {
    // 1. Server menyimpan rekaman wajah asli user
    const serverFace = Array.from({ length: 128 }, (_, i) =>
      Number((Math.cos(i * 0.3) * 0.05).toFixed(4))
    );
    const enrollRes = handleEnrollUserFace({
      username: 'editor_aegis',
      faceDescriptor: serverFace,
      facePhotoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    });
    assert.equal(enrollRes.success, true);

    // 2. Client mengecek status Dongle & apakah Wajah sudah terdaftar di Server
    const checkStatus = handleCheckClientAuthStatus('editor_aegis');
    assert.equal(checkStatus.dongleDetected, true);
    assert.equal(checkStatus.dongleMatchesUser, true);
    assert.equal(checkStatus.hasFacePhoto, true);

    // 3. Client mengirim scan wajah orang yang SAMA -> harus matched: true
    const clientSameFace = serverFace.map((v) => Number((v + 0.008).toFixed(4)));
    const verifySame = handleVerifyClientFace({
      username: 'editor_aegis',
      faceDescriptor: clientSameFace,
    });
    assert.equal(verifySame.matched, true);

    // 4. Client mengirim scan wajah orang BERBEDA -> harus matched: false
    const clientWrongFace = serverFace.map((v) => Number((v + 0.09).toFixed(4)));
    const verifyWrong = handleVerifyClientFace({
      username: 'editor_aegis',
      faceDescriptor: clientWrongFace,
    });
    assert.equal(verifyWrong.matched, false);

    // 5. Login dengan wajah yang cocok + dongle aktif -> Berhasil
    const loginRes = handleLoginUser({
      username: 'editor_aegis',
      password: 'Aegis2026!',
      faceDescriptor: clientSameFace,
    });
    assert.equal(loginRes.success, true);
  } finally {
    db.prepare(
      'UPDATE User SET faceDescriptorEncrypted = ?, facePhotoEncrypted = ?, faceUpdatedAt = ? WHERE username = ?'
    ).run(
      prevRow.faceDescriptorEncrypted,
      prevRow.facePhotoEncrypted,
      prevRow.faceUpdatedAt,
      'editor_aegis'
    );
  }
});

// ============================================================================
// SESI & CHAT BERBASIS SESI (Ref: FR-AUTH-05, 07, 08, 10, FR-CHAT-02..04)
// Ditaruh paling akhir: provisioning menimpa file dongle virtual bersama.
// ============================================================================

function stubRes() {
  const out: { status?: number; body?: any } = {};
  return {
    out,
    res: {
      writeHead(status: number) { out.status = status; },
      end(payload: string) { out.body = JSON.parse(payload); },
    } as any,
  };
}

test('Sesi: token wajib & AppError membawa status HTTP + kode (FR-AUTH-08)', () => {
  assert.throws(() => extractToken({ headers: {} } as any), (e: any) =>
    e instanceof AppError && e.statusCode === 401 && e.code === 'ERR_SESSION_EXPIRED');
  assert.throws(() => extractToken({ headers: { authorization: 'Bearer abc' } } as any), /Belum login/);

  const { out, res } = stubRes();
  handleError(res, new AppError('ERR_NOT_PARTICIPANT', 'ditolak', 403));
  assert.equal(out.status, 403);
  assert.equal(out.body.code, 'ERR_NOT_PARTICIPANT');
});

test('Sesi: idle-lock, polling tidak memperpanjang sesi, logout menghapus kunci (FR-AUTH-07, 10)', () => {
  const s = SessionService.create({
    userId: 9001, username: 'sesi_uji', role: 'MAHASISWA', dongleId: 'D-1', privateKeyPem: 'PEM',
  });
  const subkeys = KeysService.deriveSubkeys(KeysService.createConversationKey());
  s.subkeysByConv.set(1, subkeys);

  // touch:false tidak mengubah lastActivity; default memperbaruinya
  s.lastActivity = Date.now() - 60_000;
  const before = s.lastActivity;
  SessionService.get(s.token, { touch: false });
  assert.equal(s.lastActivity, before);
  SessionService.get(s.token);
  assert.ok(s.lastActivity > before);

  // Logout: sesi hilang, private key null, subkey di-nol-kan
  SessionService.destroy(s.token);
  assert.equal(s.privateKeyPem, null);
  assert.ok(subkeys.k_text_aes.every((b) => b === 0));
  assert.throws(() => SessionService.get(s.token), (e: any) => e.code === 'ERR_SESSION_EXPIRED');

  // Idle melebihi IDLE_LOCK_MINUTES → ditolak & dihapus
  const idle = SessionService.create({
    userId: 9002, username: 'sesi_idle', role: 'MAHASISWA', dongleId: 'D-2', privateKeyPem: null,
  });
  idle.lastActivity = Date.now() - (IDLE_LOCK_MINUTES + 1) * 60_000;
  assert.throws(() => SessionService.get(idle.token), (e: any) => e.statusCode === 401);
  assert.throws(() => SessionService.get(idle.token), (e: any) => e.statusCode === 401);
});

test('Chat sesi: login → kirim/baca terenkripsi dua arah, RBAC peserta, pengirim tak bisa dipalsukan', () => {
  handleToggleVirtualDongle(true);
  const tag = Date.now();
  const lecName = `lec_sesi_${tag}`;
  const mhsName = `mhs_sesi_${tag}`;
  const lecPass = 'DosenSesi2026!';
  const mhsPass = 'MhsSesi2026!';
  const face = (k: number) =>
    Array.from({ length: 128 }, (_, i) => Number((Math.sin(i * k) * 0.2).toFixed(4)));

  // Dosen diprovisi lebih dulu; catat secret dongle-nya sebelum file ditimpa mahasiswa
  const lec = AdminService.provisionUser(
    { username: lecName, fullName: 'Dosen Sesi', role: 'DOSEN_PEMBIMBING', faceDescriptor: face(0.3) },
    lecPass
  );
  const lecSecret = defaultDongleProvider.read_secret();
  const mhs = AdminService.provisionUser(
    { username: mhsName, fullName: 'Mahasiswa Sesi', role: 'MAHASISWA', faceDescriptor: face(0.5) },
    mhsPass
  );
  const conv = AdminService.assignSupervisor({
    studentId: mhs.userId, lecturerId: lec.userId, topic: 'Uji Sesi',
  });

  try {
    // Mahasiswa login nyata (dongle aktif = miliknya) → token + private key terbuka di memori
    const login = handleLoginUser({ username: mhsName, password: mhsPass }) as any;
    assert.match(login.token, /^[0-9a-f]{64}$/);
    const mhsSession = SessionService.get(login.token);
    assert.ok(mhsSession.privateKeyPem?.includes('PRIVATE KEY'));

    // Dosen: buka private key dengan secret dongle miliknya, buat sesi
    const lecRow = db.prepare('SELECT * FROM User WHERE id = ?').get(lec.userId) as any;
    const lecKek = KeysService.deriveKek(lecPass, lecSecret, Buffer.from(lecRow.kdfSalt, 'hex'));
    const lecSession = SessionService.create({
      userId: lec.userId, username: lecName, role: 'DOSEN_PEMBIMBING', dongleId: lec.dongleId,
      privateKeyPem: KeysService.unlockPrivateKey(
        { ciphertextHex: lecRow.privateKeyEnc, nonceHex: lecRow.privateKeyNonce, authTagHex: lecRow.privateKeyTag },
        lecKek, lecName
      ),
    });

    // Daftar percakapan hanya milik sesi sendiri; detail tidak membocorkan wrapped key
    assert.ok(ChatService.listConversationsFor(mhsSession).some((c: any) => c.id === conv.convId));
    const detail = ChatService.getConversationFor(mhsSession, conv.convId) as any;
    assert.equal(detail.wrappedKeyStudent, undefined);
    assert.equal(detail.wrappedKeyLecturer, undefined);

    // Mahasiswa kirim → dosen baca & dekripsi (subkey identik dari K_conv yang sama)
    const text = 'Selamat pagi Pak, draf Bab 4 sudah saya unggah.';
    const sent = ChatService.sendMessageAs(mhsSession, conv.convId, text);
    assert.equal(sent.sender, mhsName);
    const read = ChatService.fetchMessagesAs(lecSession, conv.convId).find((m) => m.id === sent.id);
    assert.equal(read?.plaintext, text);
    assert.equal(read?.sender, mhsName);
    assert.equal(read?.status, 'DELIVERED');

    // afterId: hanya pesan baru yang dikembalikan
    assert.equal(ChatService.fetchMessagesAs(lecSession, conv.convId, sent.id).length, 0);

    // Dosen membalas; pengirim selalu = pemilik sesi
    const reply = ChatService.sendMessageAs(lecSession, conv.convId, 'Baik, saya periksa.');
    assert.equal(reply.sender, lecName);

    // RBAC: bukan peserta → ERR_NOT_PARTICIPANT (403); sama untuk percakapan yang tidak ada
    const outsider = SessionService.create({
      userId: 999999, username: 'orang_luar', role: 'MAHASISWA', dongleId: 'X', privateKeyPem: null,
    });
    for (const id of [conv.convId, 987654321]) {
      assert.throws(() => ChatService.fetchMessagesAs(outsider, id), (e: any) =>
        e.code === 'ERR_NOT_PARTICIPANT' && e.statusCode === 403);
      assert.throws(() => ChatService.sendMessageAs(outsider, id, 'halo'), (e: any) =>
        e.code === 'ERR_NOT_PARTICIPANT');
    }

    // Peserta tanpa keypair (akun legacy) → 409, bukan crash
    const legacy = db.prepare('SELECT id FROM User WHERE username = ?').get('mahasiswa_01') as any;
    const legacyConv = db.prepare(
      `INSERT INTO Conversation (studentId, lecturerId, topic, wrappedKeyStudent, wrappedKeyLecturer, isActive, createdAt)
       VALUES (?, ?, 'legacy', 'x', 'x', 1, ?)`
    ).run(legacy.id, lec.userId, new Date().toISOString());
    const legacySession = SessionService.create({
      userId: legacy.id, username: 'mahasiswa_01', role: 'MAHASISWA', dongleId: 'L', privateKeyPem: null,
    });
    assert.throws(() => ChatService.fetchMessagesAs(legacySession, Number(legacyConv.lastInsertRowid)),
      (e: any) => e.code === 'ERR_KEY_UNLOCK_FAILED' && e.statusCode === 409);
    db.prepare('DELETE FROM Conversation WHERE id = ?').run(Number(legacyConv.lastInsertRowid));

    // Logout → token tidak berlaku lagi
    SessionService.destroy(login.token);
    assert.throws(() => SessionService.get(login.token), (e: any) => e.statusCode === 401);
  } finally {
    SessionService.clearAll();
    db.prepare('DELETE FROM SecretMessage WHERE convId = ?').run(conv.convId);
    db.prepare('DELETE FROM Conversation WHERE id = ?').run(conv.convId);
    db.prepare('DELETE FROM User WHERE username IN (?, ?)').run(lecName, mhsName);
  }
});

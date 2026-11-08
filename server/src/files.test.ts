/**
 * ============================================================================
 * TEST SUITE: MODUL FILES BERBASIS SESI (F2)
 * Ref: FR-FILE-01..06, FR-AUTH-08 — AT-10, AT-11, AT-12, AT-13
 * ============================================================================
 * Dijalankan paling akhir di `npm test`: provisioning menimpa file dongle virtual bersama.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { db, initDatabase } from './db.ts';
import { UPLOADS_DIR, MAX_FILE_MB } from './config/index.ts';
import { handleLoginUser, handleToggleVirtualDongle } from './routes/auth.routes.ts';
import { AdminService } from './services/admin.service.ts';
import { KeysService } from './services/keys.service.ts';
import { FileService } from './services/file.service.ts';
import { SessionService } from './services/session.service.ts';
import { defaultDongleProvider } from './adapters/dongle.adapter.ts';
import {
  encryptFileChaCha20WithKey,
  decryptFileChaCha20WithKey,
} from './crypto/2_fileChaCha20.ts';

initDatabase();

const b64 = (buf: Buffer) => buf.toString('base64');
const pdf = (body: string) => Buffer.from(`%PDF-1.4\n${body}`, 'utf8');

test('Crypto k_file: ChaCha20-Poly1305 berkunci + AAD menolak kunci/AAD salah & byte berubah (FR-FILE-02)', () => {
  const key = Buffer.alloc(32, 7);
  const data = Buffer.from('Draf skripsi Bab 1', 'utf8');
  const enc = encryptFileChaCha20WithKey(data, key, 'skripsichat-file|conv:1');

  const dec = decryptFileChaCha20WithKey(enc.encryptedBuffer, key, 'skripsichat-file|conv:1');
  assert.deepEqual(dec.decryptedBuffer, data);
  assert.equal(dec.decryptedSha256, enc.originalSha256);

  assert.throws(() => decryptFileChaCha20WithKey(enc.encryptedBuffer, key, 'skripsichat-file|conv:2'));
  assert.throws(() => decryptFileChaCha20WithKey(enc.encryptedBuffer, Buffer.alloc(32, 8), 'skripsichat-file|conv:1'));

  const tampered = Buffer.from(enc.encryptedBuffer);
  tampered[tampered.length - 1] ^= 0x01;
  assert.throws(() => decryptFileChaCha20WithKey(tampered, key, 'skripsichat-file|conv:1'));
});

test('Files sesi: validasi, versi, RBAC peserta/dosen, review & tamper ditolak (FR-FILE-01..05)', () => {
  handleToggleVirtualDongle(true);
  const tag = Date.now();
  const lecName = `lec_file_${tag}`;
  const mhsName = `mhs_file_${tag}`;
  const lecPass = 'DosenFile2026!';
  const mhsPass = 'MhsFile2026!';
  const face = (k: number) =>
    Array.from({ length: 128 }, (_, i) => Number((Math.sin(i * k) * 0.2).toFixed(4)));

  const lec = AdminService.provisionUser(
    { username: lecName, fullName: 'Dosen File', role: 'DOSEN_PEMBIMBING', faceDescriptor: face(0.3) },
    lecPass
  );
  const lecSecret = defaultDongleProvider.read_secret();
  const mhs = AdminService.provisionUser(
    { username: mhsName, fullName: 'Mahasiswa File', role: 'MAHASISWA', faceDescriptor: face(0.5) },
    mhsPass
  );
  const conv = AdminService.assignSupervisor({ studentId: mhs.userId, lecturerId: lec.userId, topic: 'Uji File' });
  const convId = conv.convId;

  try {
    const mhsSession = SessionService.get((handleLoginUser({ username: mhsName, password: mhsPass }) as any).token);
    const lecRow = db.prepare('SELECT * FROM User WHERE id = ?').get(lec.userId) as any;
    const lecKek = KeysService.deriveKek(lecPass, lecSecret, Buffer.from(lecRow.kdfSalt, 'hex'));
    const lecSession = SessionService.create({
      userId: lec.userId, username: lecName, role: 'DOSEN_PEMBIMBING', dongleId: lec.dongleId,
      privateKeyPem: KeysService.unlockPrivateKey(
        { ciphertextHex: lecRow.privateKeyEnc, nonceHex: lecRow.privateKeyNonce, authTagHex: lecRow.privateKeyTag },
        lecKek, lecName
      ),
    });
    const outsiderMhs = SessionService.create({
      userId: 999991, username: 'mhs_luar', role: 'MAHASISWA', dongleId: 'X', privateKeyPem: null,
    });
    const outsiderDsn = SessionService.create({
      userId: 999992, username: 'dosen_luar', role: 'DOSEN_PEMBIMBING', dongleId: 'X', privateKeyPem: null,
    });

    // AT-10 + AT-13: upload → versi 1, nama sama → versi 2; isi di disk tidak plaintext
    const content = pdf('Isi naskah rahasia Bab 4');
    const blocksBefore = (db.prepare('SELECT COUNT(*) AS c FROM BlockchainLedger').get() as any).c;
    const v1 = FileService.uploadFileAs(mhsSession, { convId, originalName: 'Bab4.pdf', fileBase64: b64(content) });
    assert.equal(v1.version, 1);
    assert.equal(v1.status, 'SUBMITTED');
    const v2 = FileService.uploadFileAs(mhsSession, { convId, originalName: '../../Bab4.pdf', fileBase64: b64(pdf('revisi')) });
    assert.equal(v2.originalName, 'Bab4.pdf'); // path dibuang
    assert.equal(v2.version, 2);

    const stored = db.prepare('SELECT storedFileName FROM EncryptedFile WHERE id = ?').get(v1.id) as any;
    const onDisk = fs.readFileSync(path.join(UPLOADS_DIR, stored.storedFileName));
    assert.ok(!onDisk.includes('naskah rahasia'));

    // FR-FILE-06: hash draf mahasiswa tercatat di blockchain
    const blocksAfter = (db.prepare('SELECT COUNT(*) AS c FROM BlockchainLedger').get() as any).c;
    assert.equal(blocksAfter, blocksBefore + 2);

    // Daftar: dosen peserta melihat dua versi tanpa data internal
    const list = FileService.listFilesFor(lecSession, convId) as any[];
    assert.equal(list.length, 2);
    assert.equal(list[0].version, 2);
    assert.equal(list[0].uploader, mhsName);
    assert.equal(list[0].storedFileName, undefined);
    assert.equal(list[0].uploaderRawEncryptedInDb, undefined);

    // AT-10: dosen mengunduh → hash cocok, byte identik
    const dl = FileService.downloadFileAs(lecSession, v1.id);
    assert.equal(dl.sha256Verified, true);
    assert.deepEqual(Buffer.from(dl.decryptedBase64, 'base64'), content);

    // AT-12: ekstensi salah, magic bytes salah, terlalu besar, kosong
    assert.throws(() => FileService.uploadFileAs(mhsSession, { convId, originalName: 'virus.exe', fileBase64: b64(pdf('x')) }),
      (e: any) => e.code === 'ERR_FILE_TYPE');
    assert.throws(() => FileService.uploadFileAs(mhsSession, { convId, originalName: 'palsu.pdf', fileBase64: b64(Buffer.from('MZ bukan pdf')) }),
      (e: any) => e.code === 'ERR_FILE_TYPE');
    assert.throws(() => FileService.uploadFileAs(mhsSession, { convId, originalName: 'palsu.docx', fileBase64: b64(pdf('pdf berekstensi docx')) }),
      (e: any) => e.code === 'ERR_FILE_TYPE');
    assert.throws(() => FileService.uploadFileAs(mhsSession, { convId, originalName: 'kosong.pdf', fileBase64: '' }),
      (e: any) => e.code === 'ERR_FILE_TYPE');
    const huge = Buffer.concat([Buffer.from('%PDF'), Buffer.alloc(MAX_FILE_MB * 1024 * 1024)]);
    assert.throws(() => FileService.uploadFileAs(mhsSession, { convId, originalName: 'besar.pdf', fileBase64: b64(huge) }),
      (e: any) => e.code === 'ERR_FILE_TOO_LARGE' && e.statusCode === 413);
    // DOCX (ZIP "PK") diterima
    const docx = FileService.uploadFileAs(lecSession, { convId, originalName: 'balasan.docx', fileBase64: b64(Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3])) });
    assert.equal(docx.version, 1);

    // RBAC: bukan peserta → 403 ERR_NOT_PARTICIPANT di semua operasi (termasuk id tak ada)
    for (const s of [outsiderMhs, outsiderDsn]) {
      assert.throws(() => FileService.listFilesFor(s, convId), (e: any) => e.code === 'ERR_NOT_PARTICIPANT' && e.statusCode === 403);
      assert.throws(() => FileService.uploadFileAs(s, { convId, originalName: 'a.pdf', fileBase64: b64(pdf('x')) }), (e: any) => e.statusCode === 403);
      assert.throws(() => FileService.downloadFileAs(s, v1.id), (e: any) => e.statusCode === 403);
    }
    assert.throws(() => FileService.downloadFileAs(mhsSession, 987654321), (e: any) => e.code === 'ERR_NOT_PARTICIPANT');
    assert.throws(() => FileService.listFilesFor(mhsSession, 'abc'), (e: any) => e.statusCode === 400);

    // Review: mahasiswa → ERR_FORBIDDEN; dosen luar → 403; status/catatan tidak valid → 400
    assert.throws(() => FileService.reviewFileAs(mhsSession, { fileId: v2.id, status: 'APPROVED' }), (e: any) => e.code === 'ERR_FORBIDDEN');
    assert.throws(() => FileService.reviewFileAs(outsiderDsn, { fileId: v2.id, status: 'APPROVED' }), (e: any) => e.code === 'ERR_NOT_PARTICIPANT');
    assert.throws(() => FileService.reviewFileAs(lecSession, { fileId: v2.id, status: 'SUBMITTED' }), (e: any) => e.statusCode === 400);
    assert.throws(() => FileService.reviewFileAs(lecSession, { fileId: v2.id, status: 'REVISION', note: '  ' }), (e: any) => e.statusCode === 400);
    assert.throws(() => FileService.reviewFileAs(lecSession, { fileId: v2.id, status: 'REVISION', note: 'x'.repeat(1001) }), (e: any) => e.statusCode === 400);

    const rev = FileService.reviewFileAs(lecSession, { fileId: v2.id, status: 'REVISION', note: 'Perbaiki sitasi Bab 4' });
    assert.equal(rev.reviewer, lecName);
    const afterRev = (FileService.listFilesFor(mhsSession, convId) as any[]).find((f) => f.id === v2.id);
    assert.equal(afterRev.status, 'REVISION');
    assert.equal(afterRev.reviewNote, 'Perbaiki sitasi Bab 4');
    assert.equal(afterRev.reviewedBy, lecName);
    FileService.reviewFileAs(lecSession, { fileId: v2.id, status: 'APPROVED', note: '' });
    assert.equal((FileService.listFilesFor(mhsSession, convId) as any[]).find((f) => f.id === v2.id).status, 'APPROVED');

    // AT-11: satu byte file terenkripsi diubah → ditolak, tanpa data keluaran
    const tamperedPath = path.join(UPLOADS_DIR, stored.storedFileName);
    const bytes = Buffer.from(onDisk);
    bytes[bytes.length - 1] ^= 0x01;
    fs.writeFileSync(tamperedPath, bytes);
    assert.throws(() => FileService.downloadFileAs(lecSession, v1.id),
      (e: any) => e.code === 'ERR_DECRYPT_FAILED' && e.statusCode === 422 && !('decryptedBase64' in e));

    // Hash tercatat diubah → ERR_INTEGRITY_FAILED
    db.prepare('UPDATE EncryptedFile SET originalSha256 = ? WHERE id = ?').run('0'.repeat(64), v2.id);
    assert.throws(() => FileService.downloadFileAs(lecSession, v2.id), (e: any) => e.code === 'ERR_INTEGRITY_FAILED' && e.statusCode === 409);

    // Audit mencatat aksi tanpa isi berkas
    const audit = db.prepare("SELECT action, result, detail FROM AuditLog WHERE actorId = ? AND action LIKE '%FILE'").all(lecName) as any[];
    assert.ok(audit.some((a) => a.action === 'DOWNLOAD_FILE' && a.result === 'FAILURE'));
    assert.ok(audit.some((a) => a.action === 'REVIEW_FILE' && a.result === 'SUCCESS'));
    assert.ok(audit.every((a) => !a.detail.includes('naskah rahasia')));
  } finally {
    SessionService.clearAll();
    const rows = db.prepare('SELECT storedFileName FROM EncryptedFile WHERE convId = ?').all(convId) as any[];
    for (const r of rows) fs.rmSync(path.join(UPLOADS_DIR, r.storedFileName), { force: true });
    db.prepare('DELETE FROM EncryptedFile WHERE convId = ?').run(convId);
    db.prepare('DELETE FROM Conversation WHERE id = ?').run(convId);
    db.prepare('DELETE FROM User WHERE username IN (?, ?)').run(lecName, mhsName);
  }
});
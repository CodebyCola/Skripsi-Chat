/**
 * Uji F5: Buku Konsultasi & ACC berbasis sesi (FR-CHAIN-02..07, FR-AUTH-08)
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { db, initDatabase } from './db.ts';
import { handleToggleVirtualDongle, handleLoginUser } from './routes/auth.routes.ts';
import { AdminService } from './services/admin.service.ts';
import { KeysService } from './services/keys.service.ts';
import { ChainService } from './services/chain.service.ts';
import { BlockchainService } from './services/blockchain.service.ts';
import { SessionService } from './services/session.service.ts';
import { defaultDongleProvider } from './adapters/dongle.adapter.ts';

initDatabase();

test('Chain F5: terbit/lihat/verifikasi berbasis sesi; tamper khusus admin (FR-CHAIN-02..07)', () => {
  handleToggleVirtualDongle(true);
  const tag = Date.now();
  const lecName = `lec_f5_${tag}`;
  const mhsName = `mhs_f5_${tag}`;
  const otherName = `mhs_f5b_${tag}`;
  const lecPass = 'DosenF5-2026!';
  const mhsPass = 'MhsF5-2026!';
  const face = (k: number) =>
    Array.from({ length: 128 }, (_, i) => Number((Math.sin(i * k) * 0.2).toFixed(4)));

  // Dongle virtual hanya memegang satu identitas: akun yang dipakai login diprovisi paling akhir
  const other = AdminService.provisionUser(
    { username: otherName, fullName: 'Mahasiswa Lain', role: 'MAHASISWA', faceDescriptor: face(0.71) },
    'MhsLain-2026!'
  );
  const lec = AdminService.provisionUser(
    { username: lecName, fullName: 'Dosen F5', role: 'DOSEN_PEMBIMBING', faceDescriptor: face(0.33) },
    lecPass
  );
  const lecSecret = defaultDongleProvider.read_secret();
  const mhs = AdminService.provisionUser(
    { username: mhsName, fullName: 'Mahasiswa F5', role: 'MAHASISWA', faceDescriptor: face(0.54) },
    mhsPass
  );
  const conv = AdminService.assignSupervisor({ studentId: mhs.userId, lecturerId: lec.userId, topic: 'Uji F5' });
  const baseline = (db.prepare('SELECT MAX("index") AS m FROM BlockchainLedger').get() as any).m as number;

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
    const adminSession = SessionService.create({
      userId: 999995, username: 'admin_f5', role: 'ADMIN', dongleId: 'X', privateKeyPem: null,
    });

    const doc = Buffer.from(`LEMBAR ACC F5 ${tag}`, 'utf8').toString('base64');
    const ok = { assetType: 'THESIS_ACC', studentId: mhsName, title: 'ACC Sidang F5', documentBase64: doc };

    // Hak akses terbit: mahasiswa 403, admin 403, bimbingan orang lain 403
    assert.throws(() => ChainService.issueAssetAs(mhsSession, ok), (e: any) => e.code === 'ERR_FORBIDDEN' && e.statusCode === 403);
    assert.throws(() => ChainService.issueAssetAs(adminSession, ok), (e: any) => e.code === 'ERR_FORBIDDEN' && e.statusCode === 403);
    assert.throws(() => ChainService.issueAssetAs(lecSession, { ...ok, studentId: otherName }), (e: any) => e.code === 'ERR_NOT_PARTICIPANT' && e.statusCode === 403);

    // Validasi input: tipe (DRAFT_SUBMISSION bukan hak dosen), judul, dokumen
    assert.throws(() => ChainService.issueAssetAs(lecSession, { ...ok, assetType: 'DRAFT_SUBMISSION' }), (e: any) => e.statusCode === 400);
    assert.throws(() => ChainService.issueAssetAs(lecSession, { ...ok, title: '   ' }), (e: any) => e.statusCode === 400);
    assert.throws(() => ChainService.issueAssetAs(lecSession, { ...ok, documentBase64: '' }), (e: any) => e.statusCode === 400);

    // Terbit sukses: penerbit & tanda tangan dari sesi
    const issued: any = ChainService.issueAssetAs(lecSession, ok);
    assert.equal(issued.success, true);
    assert.ok(issued.blockIndex > baseline);
    const block = db.prepare('SELECT actor FROM BlockchainLedger WHERE "index" = ?').get(issued.blockIndex) as any;
    assert.equal(block.actor, lecName);

    // Verifikasi oleh semua peran: ASLI + nama penerbit & mahasiswa + tanda tangan sah
    const v = ChainService.verifyDocumentFor(mhsSession, doc);
    assert.equal(v.status, 'AUTHENTIC');
    assert.equal(v.issuerName, 'Dosen F5');
    assert.equal(v.studentName, 'Mahasiswa F5');
    assert.equal(v.signatureValid, true);
    const changed = Buffer.from(`LEMBAR ACC F5 ${tag}X`, 'utf8').toString('base64');
    assert.equal(ChainService.verifyDocumentFor(adminSession, changed).status, 'NOT_FOUND');

    // Daftar aset: mahasiswa hanya miliknya (parameter diabaikan), dosen hanya bimbingannya, admin 403
    assert.equal(ChainService.getStudentAssetsFor(mhsSession, otherName).length, 1);
    assert.equal((ChainService.getStudentAssetsFor(mhsSession) as any[])[0].issuerName, 'Dosen F5');
    assert.equal(ChainService.getStudentAssetsFor(lecSession, mhsName).length, 1);
    assert.throws(() => ChainService.getStudentAssetsFor(lecSession, otherName), (e: any) => e.statusCode === 403);
    assert.throws(() => ChainService.getStudentAssetsFor(adminSession, mhsName), (e: any) => e.code === 'ERR_FORBIDDEN');

    // Riwayat penerbitan: khusus dosen
    assert.equal(ChainService.listAssetsByIssuerFor(lecSession).length, 1);
    assert.throws(() => ChainService.listAssetsByIssuerFor(mhsSession), (e: any) => e.code === 'ERR_FORBIDDEN' && e.statusCode === 403);

    // Tamper & restore: hanya admin
    assert.throws(() => BlockchainService.tamperBlockSimulationAs(lecSession, { index: issued.blockIndex }), (e: any) => e.code === 'ERR_FORBIDDEN' && e.statusCode === 403);
    assert.throws(() => BlockchainService.restoreBlockchainIntegrityAs(mhsSession), (e: any) => e.code === 'ERR_FORBIDDEN' && e.statusCode === 403);
    assert.throws(() => BlockchainService.tamperBlockSimulationAs(adminSession, { index: 0 }), (e: any) => e.statusCode === 400);
    assert.throws(() => BlockchainService.tamperBlockSimulationAs(adminSession, { index: 987654 }), (e: any) => e.statusCode === 404);

    const tampered = BlockchainService.tamperBlockSimulationAs(adminSession, { index: issued.blockIndex });
    assert.equal(tampered.validation.isChainValid, false);
    assert.equal(tampered.validation.firstCorruptedIndex, issued.blockIndex);
    // Rantai rusak harus terdeteksi saat verifikasi dokumen (bukan lagi lolos sebagai ASLI)
    assert.equal(ChainService.verifyDocumentFor(mhsSession, doc).status, 'CHAIN_COMPROMISED');

    const restored = BlockchainService.restoreBlockchainIntegrityAs(adminSession);
    assert.equal(restored.validation.isChainValid, true);
    assert.equal(ChainService.verifyDocumentFor(mhsSession, doc).status, 'AUTHENTIC');
    const title = db.prepare('SELECT assetTitle FROM BlockchainLedger WHERE "index" = ?').get(issued.blockIndex) as any;
    assert.equal(title.assetTitle, 'ACC Sidang F5');
  } finally {
    SessionService.clearAll();
    db.prepare('DELETE FROM AcademicAsset WHERE issuerId = ?').run(lecName);
    db.prepare('DELETE FROM BlockchainLedger WHERE "index" > ? AND actor = ?').run(baseline, lecName);
    db.prepare('DELETE FROM SecretMessage WHERE convId = ?').run(conv.convId);
    db.prepare('DELETE FROM Conversation WHERE id = ?').run(conv.convId);
    db.prepare('DELETE FROM User WHERE username IN (?, ?, ?)').run(lecName, mhsName, otherName);
  }
});
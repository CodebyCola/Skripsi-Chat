/**
 * Uji F3: Pesan Penting berbasis sesi (FR-VAULT-03/04, FR-AUTH-08)
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { db, initDatabase } from './db.ts';
import { handleToggleVirtualDongle, handleLoginUser } from './routes/auth.routes.ts';
import { AdminService } from './services/admin.service.ts';
import { KeysService } from './services/keys.service.ts';
import { ChatService } from './services/chat.service.ts';
import { VaultService } from './services/vault.service.ts';
import { SessionService } from './services/session.service.ts';
import { defaultDongleProvider } from './adapters/dongle.adapter.ts';
import { keyFingerprintFor } from './routes/profile.routes.ts';

initDatabase();

test('Vault F3: list & cabut tanda hanya untuk peserta; cabut khusus dosen (FR-VAULT-03/04)', () => {
  handleToggleVirtualDongle(true);
  const tag = Date.now();
  const lecName = `lec_f3_${tag}`;
  const mhsName = `mhs_f3_${tag}`;
  const lecPass = 'DosenF3-2026!';
  const mhsPass = 'MhsF3-2026!';
  const face = (k: number) =>
    Array.from({ length: 128 }, (_, i) => Number((Math.sin(i * k) * 0.2).toFixed(4)));

  const lec = AdminService.provisionUser(
    { username: lecName, fullName: 'Dosen F3', role: 'DOSEN_PEMBIMBING', faceDescriptor: face(0.31) },
    lecPass
  );
  const lecSecret = defaultDongleProvider.read_secret();
  const mhs = AdminService.provisionUser(
    { username: mhsName, fullName: 'Mahasiswa F3', role: 'MAHASISWA', faceDescriptor: face(0.52) },
    mhsPass
  );
  const conv = AdminService.assignSupervisor({ studentId: mhs.userId, lecturerId: lec.userId, topic: 'Uji F3' });

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
    const outsider = SessionService.create({
      userId: 999997, username: 'dosen_luar', role: 'DOSEN_PEMBIMBING', dongleId: 'X', privateKeyPem: null,
    });
    const adminSession = SessionService.create({
      userId: 999996, username: 'admin_x', role: 'ADMIN', dongleId: 'X', privateKeyPem: null,
    });

    const sent = ChatService.sendMessageAs(mhsSession, conv.convId, 'Sidang dijadwalkan Jumat 09.00.');
    VaultService.markImportantAs(lecSession, { convId: conv.convId, messageId: sent.id, category: 'JADWAL_SIDANG' });

    // Mahasiswa peserta dapat melihat; isi terdekripsi
    const mine = VaultService.listImportantFor(mhsSession, conv.convId);
    assert.equal(mine.length, 1);
    assert.equal(mine[0].contentPlain, 'Sidang dijadwalkan Jumat 09.00.');

    // Tanpa convId → gabungan percakapan milik sesi
    assert.equal(VaultService.listImportantFor(lecSession).length, 1);
    assert.equal(VaultService.listImportantFor(outsider).length, 0);

    // Bukan peserta → 403; admin → 403; convId rusak → 400
    assert.throws(() => VaultService.listImportantFor(outsider, conv.convId), (e: any) => e.code === 'ERR_NOT_PARTICIPANT' && e.statusCode === 403);
    assert.throws(() => VaultService.listImportantFor(adminSession, conv.convId), (e: any) => e.code === 'ERR_FORBIDDEN' && e.statusCode === 403);
    assert.throws(() => VaultService.listImportantFor(mhsSession, -5), (e: any) => e.statusCode === 400);

    // Cabut tanda: mahasiswa 403, dosen luar 403, pesan tak ada 404
    assert.throws(() => VaultService.unmarkImportantAs(mhsSession, sent.id), (e: any) => e.code === 'ERR_FORBIDDEN' && e.statusCode === 403);
    assert.throws(() => VaultService.unmarkImportantAs(outsider, sent.id), (e: any) => e.code === 'ERR_NOT_PARTICIPANT' && e.statusCode === 403);
    assert.throws(() => VaultService.unmarkImportantAs(lecSession, 987654321), (e: any) => e.statusCode === 404);

    // Dosen peserta berhasil; actor audit = pemilik sesi
    assert.deepEqual(VaultService.unmarkImportantAs(lecSession, sent.id), { success: true });
    assert.equal(VaultService.listImportantFor(mhsSession, conv.convId).length, 0);
    const audit = db
      .prepare("SELECT actorId FROM AuditLog WHERE action = 'UNMARK_IMPORTANT' AND targetId = ? ORDER BY id DESC")
      .get(String(sent.id)) as any;
    assert.equal(audit.actorId, lecName);

    // Sidik jari kunci: 64 hex, deterministik
    const fp = keyFingerprintFor(lec.userId);
    assert.match(fp ?? '', /^[0-9a-f]{64}$/);
    assert.equal(fp, keyFingerprintFor(lec.userId));
  } finally {
    SessionService.clearAll();
    db.prepare('DELETE FROM ImportantMessage WHERE convId = ?').run(conv.convId);
    db.prepare('DELETE FROM SecretMessage WHERE convId = ?').run(conv.convId);
    db.prepare('DELETE FROM Conversation WHERE id = ?').run(conv.convId);
    db.prepare('DELETE FROM User WHERE username IN (?, ?)').run(lecName, mhsName);
  }
});
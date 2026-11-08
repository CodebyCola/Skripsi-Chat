/**
 * Uji F4: Foto Dokumen & Steganografi LSB berbasis sesi (FR-IMG-01..05, AT-14..16, FR-AUTH-08)
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { db, initDatabase } from './db.ts';
import { handleToggleVirtualDongle, handleLoginUser } from './routes/auth.routes.ts';
import { AdminService } from './services/admin.service.ts';
import { KeysService } from './services/keys.service.ts';
import { StegoService } from './services/stego.service.ts';
import { SessionService } from './services/session.service.ts';
import { defaultDongleProvider } from './adapters/dongle.adapter.ts';
import {
  generateSampleCoverPng,
  getStegoCapacity,
  embedPayloadInPngLsb,
  extractPayloadFromPngLsb,
} from './crypto/3_steganography.ts';
import { AppError, ErrorCodes } from './config/errors.ts';

initDatabase();

test('Stego F4: embed & extract foto dokumen berbasis sesi peserta (FR-IMG-01..03, AT-14)', () => {
  handleToggleVirtualDongle(true);
  const tag = Date.now();
  const lecName = `lec_stego_${tag}`;
  const mhsName = `mhs_stego_${tag}`;
  const lecPass = 'DosenStego-2026!';
  const mhsPass = 'MhsStego-2026!';
  const face = (k: number) =>
    Array.from({ length: 128 }, (_, i) => Number((Math.sin(i * k) * 0.2).toFixed(4)));

  const lec = AdminService.provisionUser(
    { username: lecName, fullName: 'Dosen Stego', role: 'DOSEN_PEMBIMBING', faceDescriptor: face(0.41) },
    lecPass
  );
  const lecSecret = defaultDongleProvider.read_secret();
  const mhs = AdminService.provisionUser(
    { username: mhsName, fullName: 'Mahasiswa Stego', role: 'MAHASISWA', faceDescriptor: face(0.63) },
    mhsPass
  );
  const conv = AdminService.assignSupervisor({
    studentId: mhs.userId,
    lecturerId: lec.userId,
    topic: 'Uji Steganografi F4',
  });

  try {
    const mhsSession = SessionService.get((handleLoginUser({ username: mhsName, password: mhsPass }) as any).token);
    const lecRow = db.prepare('SELECT * FROM User WHERE id = ?').get(lec.userId) as any;
    const lecKek = KeysService.deriveKek(lecPass, lecSecret, Buffer.from(lecRow.kdfSalt, 'hex'));
    const lecSession = SessionService.create({
      userId: lec.userId,
      username: lecName,
      role: 'DOSEN_PEMBIMBING',
      dongleId: lec.dongleId,
      privateKeyPem: KeysService.unlockPrivateKey(
        { ciphertextHex: lecRow.privateKeyEnc, nonceHex: lecRow.privateKeyNonce, authTagHex: lecRow.privateKeyTag },
        lecKek,
        lecName
      ),
    });

    const coverPng = generateSampleCoverPng(320, 240);
    const secretNote = 'Koordinat lab observasi skripsi: -6.914744, 107.609810 (Sandi lemari: 7792)';

    // 1. Mahasiswa menyematkan catatan rahasia ke citra cover
    const embedded = StegoService.embedForSession(mhsSession, {
      convId: conv.convId,
      title: 'Scan Bukti Lapangan 01',
      note: secretNote,
      coverPngBase64: coverPng.toString('base64'),
    });

    assert.ok(embedded.id > 0);
    assert.equal(embedded.convId, conv.convId);
    assert.ok(embedded.psnrDb > 50, `PSNR harus > 50 dB, didapat ${embedded.psnrDb} dB`);
    assert.ok(embedded.mse >= 0);

    // 2. Dosen melihat daftar citra steganografi dalam percakapan
    const images = StegoService.listImagesFor(lecSession, conv.convId);
    assert.ok(images.length >= 1);
    const found = images.find((img) => img.id === embedded.id);
    assert.ok(found);
    assert.equal(found.title, 'Scan Bukti Lapangan 01');
    assert.equal(found.uploader, mhsName);

    // 3. Dosen mengekstrak dan mendekripsi catatan tersembunyi
    const extracted = StegoService.extractForSession(lecSession, { id: embedded.id });
    assert.equal(extracted.success, true);
    assert.equal(extracted.note, secretNote);
    assert.equal(extracted.senderUsername, mhsName);
    assert.equal(extracted.convId, conv.convId);
    assert.equal(extracted.verified, true);
  } finally {
    handleToggleVirtualDongle(false);
  }
});

test('Stego F4: non-peserta ditolak 403 saat akses foto percakapan (FR-AUTH-08, FR-IMG-03)', () => {
  handleToggleVirtualDongle(true);
  const tag = Date.now();
  const mhsSession = SessionService.create({
    userId: 888001,
    username: `mhs_stego_${tag}`,
    role: 'MAHASISWA',
    dongleId: 'D1',
    privateKeyPem: null,
  });
  const outsiderSession = SessionService.create({
    userId: 888002,
    username: `outsider_${tag}`,
    role: 'DOSEN_PEMBIMBING',
    dongleId: 'D2',
    privateKeyPem: null,
  });

  // Percakapan tidak melibatkan outsider
  assert.throws(
    () => StegoService.listImagesFor(outsiderSession, 9999),
    (err: any) => err instanceof AppError && err.code === ErrorCodes.ERR_NOT_PARTICIPANT
  );

  assert.throws(
    () =>
      StegoService.embedForSession(outsiderSession, {
        convId: 9999,
        title: 'Foto Ilegal',
        note: 'Rahasia',
      }),
    (err: any) => err instanceof AppError && err.code === ErrorCodes.ERR_NOT_PARTICIPANT
  );
  handleToggleVirtualDongle(false);
});

test('Stego F4: payload melebihi kapasitas ditolak ERR_STEGO_CAPACITY (FR-IMG-04, AT-15)', () => {
  // Gambar kecil 20x20 piksel: kapasitas = floor(20*20*3 / 8) - 9 = 150 - 9 = 141 byte
  const smallCover = generateSampleCoverPng(20, 20);
  const hugePayload = Buffer.alloc(300, 'A');

  assert.throws(
    () => embedPayloadInPngLsb(smallCover, hugePayload),
    (err: any) => err instanceof AppError && err.code === ErrorCodes.ERR_STEGO_CAPACITY
  );
});

test('Stego F4: citra tanpa payload stego ditolak ERR_STEGO_NO_PAYLOAD', () => {
  const plainCover = generateSampleCoverPng(100, 100);

  assert.throws(
    () => extractPayloadFromPngLsb(plainCover),
    (err: any) => err instanceof AppError && err.code === ErrorCodes.ERR_STEGO_NO_PAYLOAD
  );
});

test('Stego F4: kualitas citra PSNR & MSE terukur di atas 40 dB (FR-IMG-04, AT-16)', () => {
  const cover = generateSampleCoverPng(160, 120);
  const payload = Buffer.from('Testing LSB Quality Metrics PSNR & MSE', 'utf8');

  const result = embedPayloadInPngLsb(cover, payload);
  assert.ok(result.psnrDb > 40, `PSNR harus di atas 40 dB, aktual: ${result.psnrDb} dB`);
  assert.ok(result.mse >= 0);

  const extracted = extractPayloadFromPngLsb(result.stegoPngBuffer);
  assert.deepEqual(extracted.payloadBuffer, payload);
});

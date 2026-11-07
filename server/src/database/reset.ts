import { db } from './connection.ts';
import { createTables } from './schema.ts';
import { resetAndSeedDatabase } from './seeder.ts';

console.log('====================================================================');
console.log('[SKRIPSICHAT] MERESET SELURUH BASIS DATA & MENYIAPKAN PRESET TESTING');
console.log('====================================================================');

try {
  createTables(db);
  resetAndSeedDatabase(db);
  console.log('✔ Database SQLite (dev.db) berhasil di-reset.');
  console.log('✔ Preset Akun:');
  console.log('  1. Mahasiswa       : @mahasiswa_01       | Sandi: SkripsiChat2026!');
  console.log('  2. Dosen Pembimbing: @dosen_pembimbing   | Sandi: SkripsiChat2026!');
  console.log('✔ Virtual Dongle Keys (.skripsi_key) telah digenerate.');
  console.log('✔ Pesan Super Enkripsi, File ChaCha20, & Stegano PNG berhasil di-seed.');
  console.log('====================================================================');
  process.exit(0);
} catch (err) {
  console.error('Gagal mereset database:', err);
  process.exit(1);
}

/**
 * ============================================================================
 * PILAR 4: INTEGRITAS ASET & AUDIT LOG BERBASIS BLOCKCHAIN (SHA-256)
 * ============================================================================
 * Penjelasan untuk Presentasi Dosen:
 * 1. Setiap aset penting (Pesan Rahasia, File Bukti, Gambar Steganografi, Login)
 *    dicatat ke dalam blok berantai (Chain of Custody Ledger).
 * 2. Struktur Blok memiliki:
 *    - index        : Nomor urut blok
 *    - timestamp    : Waktu pencatatan
 *    - actionType   : Jenis transaksi/aktivitas (misal: "ENCRYPT_MESSAGE", "UPLOAD_FILE")
 *    - actor        : Username pelaku
 *    - assetTitle   : Judul dokumen/aset
 *    - assetDataHash: Hash SHA-256 dari isi dokumen/pesan (menjamin keutuhan dokumen)
 *    - previousHash : Hash SHA-256 dari blok sebelumnya (menjamin rantai tidak terputus)
 *    - nonce        : Angka Proof-of-Work agar hash blok diawali dengan "00"
 *    - hash         : Hash SHA-256 dari keseluruhan isi blok saat ini
 */

import crypto from 'node:crypto';

export interface BlockRecord {
  index: number;
  timestamp: string;
  actionType: string;
  actor: string;
  assetTitle: string;
  assetDataHash: string;
  previousHash: string;
  nonce: number;
  hash: string;
}

export interface BlockValidationDetail {
  index: number;
  isValid: boolean;
  storedHash: string;
  recalculatedHash: string;
  previousHashMatched: boolean;
  errorReason?: string;
}

export interface ChainValidationResult {
  isChainValid: boolean;
  totalBlocks: number;
  firstCorruptedIndex: number | null;
  details: BlockValidationDetail[];
}

const POW_PREFIX = '00'; // Proof-of-Work ringan (hash wajib diawali "00")

/**
 * Menghitung Hash SHA-256 dari seluruh atribut sebuah Block
 */
export function calculateBlockHash(input: {
  index: number;
  timestamp: string;
  actionType: string;
  actor: string;
  assetTitle: string;
  assetDataHash: string;
  previousHash: string;
  nonce: number;
}): string {
  const rawString = [
    input.index,
    input.timestamp,
    input.actionType,
    input.actor,
    input.assetTitle,
    input.assetDataHash,
    input.previousHash,
    input.nonce,
  ].join('|');

  return crypto.createHash('sha256').update(rawString, 'utf8').digest('hex');
}

/**
 * Menghasilkan Hash SHA-256 untuk isi aset/dokumen
 */
export function hashAssetData(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Membuat & menambang (Mining Proof-of-Work) sebuah Block baru
 */
export function createMinedBlock(params: {
  index: number;
  timestamp?: string;
  actionType: string;
  actor: string;
  assetTitle: string;
  assetDataHash: string;
  previousHash: string;
}): BlockRecord {
  const timestamp = params.timestamp || new Date().toISOString();
  let nonce = 0;
  let hash = '';

  while (true) {
    hash = calculateBlockHash({
      index: params.index,
      timestamp,
      actionType: params.actionType,
      actor: params.actor,
      assetTitle: params.assetTitle,
      assetDataHash: params.assetDataHash,
      previousHash: params.previousHash,
      nonce,
    });

    if (hash.startsWith(POW_PREFIX)) {
      break;
    }
    nonce++;
  }

  return {
    index: params.index,
    timestamp,
    actionType: params.actionType,
    actor: params.actor,
    assetTitle: params.assetTitle,
    assetDataHash: params.assetDataHash,
    previousHash: params.previousHash,
    nonce,
    hash,
  };
}

/**
 * Membuat Genesis Block (Blok #0 saat sistem pertama kali diinisialisasi)
 */
export function createGenesisBlock(): BlockRecord {
  return createMinedBlock({
    index: 0,
    timestamp: '2026-01-01T00:00:00.000Z',
    actionType: 'GENESIS_INIT',
    actor: 'SYSTEM',
    assetTitle: 'Inisialisasi Rantai Bukti SkripsiChat (Academic Advisory Shield)',
    assetDataHash: hashAssetData('SKRIPSICHAT_ACADEMIC_LEDGER_GENESIS_2026'),
    previousHash: '0'.repeat(64),
  });
}

/**
 * Memvalidasi keutuhan seluruh rantai blok (Proof & Hash Link Validation)
 */
export function validateBlockchain(blocks: BlockRecord[]): ChainValidationResult {
  const details: BlockValidationDetail[] = [];
  let isChainValid = true;
  let firstCorruptedIndex: number | null = null;

  for (let i = 0; i < blocks.length; i++) {
    const current = blocks[i];
    const recalculatedHash = calculateBlockHash(current);
    const hashMatched = current.hash === recalculatedHash;

    const expectedPrevHash = i === 0 ? '0'.repeat(64) : blocks[i - 1].hash;
    const previousHashMatched = current.previousHash === expectedPrevHash;
    const powValid = current.hash.startsWith(POW_PREFIX);

    const blockValid = hashMatched && previousHashMatched && powValid;

    let errorReason: string | undefined;
    if (!hashMatched) {
      errorReason = `Data pada Blok #${current.index} telah dimanipulasi! Hash asli (${current.hash.slice(
        0,
        10
      )}...) tidak cocok dengan perhitungan ulang SHA-256 (${recalculatedHash.slice(0, 10)}...).`;
    } else if (!previousHashMatched) {
      errorReason = `Rantai terputus pada Blok #${current.index}! previousHash tidak cocok dengan hash Blok #${
        current.index - 1
      }.`;
    } else if (!powValid) {
      errorReason = `Proof-of-Work Blok #${current.index} tidak valid.`;
    }

    if (!blockValid) {
      isChainValid = false;
      if (firstCorruptedIndex === null) {
        firstCorruptedIndex = current.index;
      }
    }

    details.push({
      index: current.index,
      isValid: blockValid,
      storedHash: current.hash,
      recalculatedHash,
      previousHashMatched,
      errorReason,
    });
  }

  return {
    isChainValid,
    totalBlocks: blocks.length,
    firstCorruptedIndex,
    details,
  };
}

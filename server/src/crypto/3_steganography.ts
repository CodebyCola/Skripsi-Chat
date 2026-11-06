/**
 * ============================================================================
 * PILAR 3B: STEGANOGRAFI CITRA DIGITAL (LSB - LEAST SIGNIFICANT BIT EMBEDDING)
 * ============================================================================
 * Penjelasan untuk Presentasi Dosen:
 * 1. Steganografi menyembunyikan keberadaan pesan rahasia di dalam media penampung
 *    (Cover Image) berformat PNG Lossless.
 * 2. Setiap piksel gambar memiliki komponen warna Red (R), Green (G), Blue (B)
 *    bernilai 0 s/d 255 (8-bit).
 * 3. Metode LSB (Least Significant Bit) mengganti 1 bit paling kanan (bit ke-0)
 *    dari nilai R, G, dan B dengan bit-bit pesan rahasia:
 *       Nilai_Baru = (Nilai_Lama & 0b11111110) | Bit_Pesan
 * 4. Perubahan nilai warna paling banyak hanya selisih 1 angka (misal 200 -> 201),
 *    sehingga mata manusia tidak dapat membedakan Cover Image vs Stego Image
 *    (dibuktikan dengan nilai PSNR > 50 dB).
 */

import crypto from 'node:crypto';
import zlib from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const STEGO_MAGIC_PREFIX = 'AEGIS_LSB_V1|';

export interface DecodedPngImage {
  width: number;
  height: number;
  rgbaPixels: Buffer; // 4 byte per piksel: [R, G, B, A, R, G, B, A, ...]
}

export interface StegoEmbedResult {
  stegoPngBuffer: Buffer;
  width: number;
  height: number;
  maxCapacityBytes: number;
  embeddedBitsCount: number;
  modifiedPixelsCount: number;
  mse: number;
  psnrDb: number;
}

// Tabel CRC32 standar spesifikasi PNG (ISO/IEC 15948)
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Membaca file PNG (8-bit RGB atau RGBA) menjadi array piksel RGBA murni
 */
export function decodePngBuffer(pngBuf: Buffer): DecodedPngImage {
  if (
    pngBuf.length < 8 ||
    !pngBuf.subarray(0, 8).equals(PNG_SIGNATURE)
  ) {
    throw new Error('File bukan format gambar PNG yang valid');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  while (offset + 8 <= pngBuf.length) {
    const length = pngBuf.readUInt32BE(offset);
    const type = pngBuf.subarray(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkData = pngBuf.subarray(dataStart, dataEnd);

    if (type === 'IHDR') {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      bitDepth = chunkData[8];
      colorType = chunkData[9];
      if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(
          `Format PNG harus 8-bit RGB/RGBA (ditemukan bitDepth=${bitDepth}, colorType=${colorType})`
        );
      }
    } else if (type === 'IDAT') {
      idatChunks.push(chunkData);
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4; // Lewati 4 byte CRC
  }

  if (!width || !height || idatChunks.length === 0) {
    throw new Error('Data IHDR atau IDAT pada PNG tidak lengkap');
  }

  const compressedData = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(compressedData);

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const unfiltered = Buffer.alloc(height * stride);

  let inPos = 0;
  for (let y = 0; y < height; y++) {
    const filterType = decompressed[inPos++];
    const rowStart = y * stride;
    const prevRowStart = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const raw = decompressed[inPos++];
      const left = x >= bytesPerPixel ? unfiltered[rowStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? unfiltered[prevRowStart + x] : 0;
      const upLeft =
        y > 0 && x >= bytesPerPixel ? unfiltered[prevRowStart + x - bytesPerPixel] : 0;

      let val = raw;
      if (filterType === 1) {
        val = (raw + left) & 0xff;
      } else if (filterType === 2) {
        val = (raw + up) & 0xff;
      } else if (filterType === 3) {
        val = (raw + Math.floor((left + up) / 2)) & 0xff;
      } else if (filterType === 4) {
        val = (raw + paethPredictor(left, up, upLeft)) & 0xff;
      }
      unfiltered[rowStart + x] = val;
    }
  }

  // Normalisasi ke RGBA (4 byte per piksel)
  const rgbaPixels = Buffer.alloc(width * height * 4);
  if (bytesPerPixel === 4) {
    unfiltered.copy(rgbaPixels);
  } else {
    let srcIdx = 0;
    let dstIdx = 0;
    for (let i = 0; i < width * height; i++) {
      rgbaPixels[dstIdx++] = unfiltered[srcIdx++];
      rgbaPixels[dstIdx++] = unfiltered[srcIdx++];
      rgbaPixels[dstIdx++] = unfiltered[srcIdx++];
      rgbaPixels[dstIdx++] = 255; // Alpha penuh
    }
  }

  return { width, height, rgbaPixels };
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Mengenkode array piksel RGBA kembali menjadi file PNG Lossless (8-bit RGBA)
 */
export function encodePngBuffer(width: number, height: number, rgbaPixels: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA colorType
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const rawScanlines = Buffer.alloc(height * (stride + 1));

  for (let y = 0; y < height; y++) {
    const outRowOffset = y * (stride + 1);
    rawScanlines[outRowOffset] = 0; // Filter Type 0 (None) agar piksel tidak berubah
    rgbaPixels.copy(rawScanlines, outRowOffset + 1, y * stride, (y + 1) * stride);
  }

  const compressedIdat = zlib.deflateSync(rawScanlines, { level: 6 });

  return Buffer.concat([
    PNG_SIGNATURE,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressedIdat),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Membuat gambar Cover PNG contoh (jika user ingin langsung mencoba tanpa upload foto)
 */
export function generateSampleCoverPng(width: number = 160, height: number = 120): Buffer {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rgba[idx] = Math.round((x / width) * 180) + 30;     // Red gradient
      rgba[idx + 1] = Math.round((y / height) * 160) + 50; // Green gradient
      rgba[idx + 2] = ((x ^ y) & 0xff) % 180 + 60;         // Blue pattern
      rgba[idx + 3] = 255;                                 // Alpha
    }
  }
  return encodePngBuffer(width, height, rgba);
}

/**
 * Mengenkripsi pesan stego opsional dengan kunci sebelum disisipkan ke LSB
 */
function protectPayloadWithPasskey(secretMessage: string, passkey: string): string {
  if (!passkey) return `PLAIN:${secretMessage}`;
  const key = crypto.createHash('sha256').update(passkey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let enc = cipher.update(secretMessage, 'utf8', 'hex');
  enc += cipher.final('hex');
  return `AES:${iv.toString('hex')}:${enc}`;
}

function unprotectPayloadWithPasskey(protectedStr: string, passkey: string): string {
  if (protectedStr.startsWith('PLAIN:')) {
    return protectedStr.slice(6);
  }
  if (protectedStr.startsWith('AES:')) {
    if (!passkey) {
      throw new Error('Pesan steganografi ini dikunci dengan Passkey. Masukkan Passkey yang benar!');
    }
    const [, ivHex, cipherHex] = protectedStr.split(':');
    const key = crypto.createHash('sha256').update(passkey).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
    let dec = decipher.update(cipherHex, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  }
  return protectedStr;
}

/**
 * MENYISIPKAN PESAN RAHASIA KE DALAM GAMBAR PNG (LSB EMBEDDING)
 */
export function embedMessageInPngLsb(
  coverPngBuffer: Buffer,
  secretMessage: string,
  passkey: string = ''
): StegoEmbedResult {
  const { width, height, rgbaPixels } = decodePngBuffer(coverPngBuffer);
  const originalPixels = Buffer.from(rgbaPixels);

  const protectedPayload = protectPayloadWithPasskey(secretMessage, passkey);
  const payloadBytes = Buffer.from(protectedPayload, 'utf8');
  const envelopeString = `${STEGO_MAGIC_PREFIX}${payloadBytes.length}|${protectedPayload}`;
  const envelopeBuffer = Buffer.from(envelopeString, 'utf8');

  // Kapasitas: 3 bit per piksel (kanal R, G, B; kanal Alpha tidak diubah)
  const totalAvailableBits = width * height * 3;
  const requiredBits = envelopeBuffer.length * 8;

  if (requiredBits > totalAvailableBits) {
    throw new Error(
      `Pesan terlalu panjang (${envelopeBuffer.length} byte) untuk ukuran gambar ${width}x${height} (Maksimal ${Math.floor(
        totalAvailableBits / 8
      )} byte)`
    );
  }

  // Konversi byte envelope menjadi deretan bit (0 atau 1)
  const bits: number[] = [];
  for (let i = 0; i < envelopeBuffer.length; i++) {
    const byteVal = envelopeBuffer[i];
    for (let b = 7; b >= 0; b--) {
      bits.push((byteVal >> b) & 1);
    }
  }

  // Tanamkan bit ke LSB kanal R, G, B pada setiap piksel
  let bitIdx = 0;
  const totalPixels = width * height;
  for (let p = 0; p < totalPixels && bitIdx < bits.length; p++) {
    const base = p * 4;
    // Kanal R (base+0), G (base+1), B (base+2)
    for (let c = 0; c < 3 && bitIdx < bits.length; c++) {
      rgbaPixels[base + c] = (rgbaPixels[base + c] & 0xfe) | bits[bitIdx++];
    }
  }

  // Hitung MSE (Mean Squared Error) & PSNR (Peak Signal-to-Noise Ratio)
  let sumSquaredError = 0;
  for (let p = 0; p < totalPixels; p++) {
    const base = p * 4;
    for (let c = 0; c < 3; c++) {
      const diff = originalPixels[base + c] - rgbaPixels[base + c];
      sumSquaredError += diff * diff;
    }
  }

  const mse = sumSquaredError / (totalPixels * 3);
  const psnrDb =
    mse === 0 ? 99.99 : Number((10 * Math.log10((255 * 255) / mse)).toFixed(2));

  const stegoPngBuffer = encodePngBuffer(width, height, rgbaPixels);

  return {
    stegoPngBuffer,
    width,
    height,
    maxCapacityBytes: Math.floor(totalAvailableBits / 8),
    embeddedBitsCount: bits.length,
    modifiedPixelsCount: Math.ceil(bits.length / 3),
    mse: Number(mse.toFixed(6)),
    psnrDb,
  };
}

/**
 * MENGEKSTRAK PESAN RAHASIA DARI GAMBAR PNG (LSB EXTRACTION)
 */
export function extractMessageFromPngLsb(
  stegoPngBuffer: Buffer,
  passkey: string = ''
): {
  secretMessage: string;
  width: number;
  height: number;
  extractedBytesLength: number;
} {
  const { width, height, rgbaPixels } = decodePngBuffer(stegoPngBuffer);
  const totalPixels = width * height;

  // Ekstrak bit LSB dari kanal R, G, B secara berurutan menjadi byte
  const extractedBytes: number[] = [];
  let currentByte = 0;
  let bitCount = 0;

  // Kita baca bertahap sampai menemukan header dan panjang payload
  let headerParsed = false;
  let targetTotalBytes = 64; // Baca 64 byte pertama dulu untuk cek magic header

  for (let p = 0; p < totalPixels; p++) {
    const base = p * 4;
    for (let c = 0; c < 3; c++) {
      const lsb = rgbaPixels[base + c] & 1;
      currentByte = (currentByte << 1) | lsb;
      bitCount++;

      if (bitCount === 8) {
        extractedBytes.push(currentByte);
        currentByte = 0;
        bitCount = 0;

        if (!headerParsed && extractedBytes.length >= 25) {
          const previewStr = Buffer.from(extractedBytes).toString('utf8');
          if (!previewStr.startsWith(STEGO_MAGIC_PREFIX)) {
            throw new Error(
              'Gambar PNG ini tidak mengandung pesan steganografi AegisVault (Header LSB tidak ditemukan)'
            );
          }

          const secondPipeIdx = previewStr.indexOf('|', STEGO_MAGIC_PREFIX.length);
          if (secondPipeIdx !== -1) {
            const lenStr = previewStr.slice(STEGO_MAGIC_PREFIX.length, secondPipeIdx);
            const payloadByteLen = parseInt(lenStr, 10);
            if (isNaN(payloadByteLen) || payloadByteLen < 0) {
              throw new Error('Panjang payload LSB rusak');
            }
            const headerByteLen = Buffer.from(
              `${STEGO_MAGIC_PREFIX}${lenStr}|`,
              'utf8'
            ).length;
            targetTotalBytes = headerByteLen + payloadByteLen;
            headerParsed = true;
          }
        }

        if (headerParsed && extractedBytes.length >= targetTotalBytes) {
          const fullStr = Buffer.from(extractedBytes.slice(0, targetTotalBytes)).toString(
            'utf8'
          );
          const secondPipeIdx = fullStr.indexOf('|', STEGO_MAGIC_PREFIX.length);
          const protectedPayload = fullStr.slice(secondPipeIdx + 1);
          const secretMessage = unprotectPayloadWithPasskey(protectedPayload, passkey);

          return {
            secretMessage,
            width,
            height,
            extractedBytesLength: payloadLengthOf(secretMessage),
          };
        }
      }
    }
  }

  throw new Error('Data pesan steganografi tidak lengkap atau tidak ditemukan');
}

function payloadLengthOf(str: string): number {
  return Buffer.from(str, 'utf8').length;
}
